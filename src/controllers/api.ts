import { Application, Request, Response } from "express";
import httpContext from "express-http-context";
import fs from "fs";
import {
  JSONRPCErrorResponse,
  JSONRPCParams,
  JSONRPCResponse,
  JSONRPCServer,
} from "json-rpc-2.0";
import multer from "multer";
import Datastore from "nedb-promises";
import { homedir } from "os";
import path from "path";

import {
  CannotChangeAck,
  CannotChangeUploadedFile,
  InvalidAck,
  InvalidAttachmentID,
  InvalidRecipientID,
  InvalidTxid,
  InvalidVout,
  MissingAck,
  MissingAttachmentID,
  MissingFile,
  MissingRecipientID,
  MissingTxid,
  NotFoundConsignment,
  NotFoundMedia,
} from "../errors";
import { logger } from "../logger";
import { genHashFromFile, setDir } from "../util";
import { APP_DIR } from "../vars";
import { APP_VERSION } from "../version";

const PROTOCOL_VERSION = "0.1";

const DATABASE_FILE = "app.db";

const appDir = path.join(homedir(), APP_DIR);
const tempDir = path.join(appDir, "tmp");
const consignmentDir = path.join(appDir, "consignments");
const mediaDir = path.join(appDir, "media");

// We make sure the directories exist
setDir(tempDir);
setDir(consignmentDir);
setDir(mediaDir);

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, tempDir);
  },
});

const upload = multer({ storage });

interface ServerInfo {
  version: string;
  protocol_version: string;
  uptime: number;
}

interface ConsignmentGetRes {
  consignment: string;
  txid: string;
  vout?: number;
}

interface Consignment {
  _id?: string;
  filename: string;
  recipient_id: string;
  txid: string;
  vout?: number;
  ack?: boolean;
  nack?: boolean; // to be removed when removing old APIs
  responded?: boolean; // to be removed when removing old APIs
}

interface Media {
  filename: string;
  attachment_id: string;
}

const ds = Datastore.create(path.join(homedir(), APP_DIR, DATABASE_FILE));

function isBoolean(data: unknown): data is boolean {
  return Boolean(data) === data;
}

function isDictionary(data: unknown): data is Record<keyof never, unknown> {
  return typeof data === "object" && !Array.isArray(data) && data !== null;
}

function isNumber(data: unknown): data is string {
  return Number.isInteger(Number(data)) && data !== null;
}

function isString(data: unknown): data is string {
  return typeof data === "string";
}

function isErrorResponse(
  object: JSONRPCResponse
): object is JSONRPCErrorResponse {
  return "error" in object;
}

function truncateText(content: string, limit = 16) {
  if (!content) return "";
  if (content.length <= limit) return content;
  return content.slice(0, limit) + "...";
}

function joinEntries(entries: object) {
  let joined = "<";
  let keysCount = Object.keys(entries).length;
  Object.entries(entries).forEach(([k, v]) => {
    let value = v;
    if (isString(v)) {
      value = truncateText(v as string);
    }
    joined += `${k}: ${value}`;
    keysCount--;
    if (keysCount > 0) {
      joined += ", ";
    }
  });
  return joined + ">";
}

function getAckParam(jsonRpcParams: Partial<JSONRPCParams> | undefined) {
  const ackKey = "ack";
  if (!isDictionary(jsonRpcParams) || !(ackKey in jsonRpcParams)) {
    throw new MissingAck(jsonRpcParams);
  }
  const ack = jsonRpcParams[ackKey];
  if (!isBoolean(ack)) {
    throw new InvalidAck(jsonRpcParams);
  }
  return ack as boolean;
}

function getAttachmentIDParam(
  jsonRpcParams: Partial<JSONRPCParams> | undefined
) {
  const attachmentIDKey = "attachment_id";
  if (!isDictionary(jsonRpcParams) || !(attachmentIDKey in jsonRpcParams)) {
    throw new MissingAttachmentID(jsonRpcParams);
  }
  const attachmentID = jsonRpcParams[attachmentIDKey];
  if (!attachmentID || !isString(attachmentID)) {
    throw new InvalidAttachmentID(jsonRpcParams);
  }
  return attachmentID as string;
}

function getRecipientIDParam(
  jsonRpcParams: Partial<JSONRPCParams> | undefined
) {
  const recipientIDKey = "recipient_id";
  if (!isDictionary(jsonRpcParams) || !(recipientIDKey in jsonRpcParams)) {
    throw new MissingRecipientID(jsonRpcParams);
  }
  const recipientID = jsonRpcParams[recipientIDKey];
  if (!recipientID || !isString(recipientID)) {
    throw new InvalidRecipientID(jsonRpcParams);
  }
  return recipientID as string;
}

function getTxidParam(jsonRpcParams: Partial<JSONRPCParams> | undefined) {
  const txidKey = "txid";
  if (!isDictionary(jsonRpcParams) || !(txidKey in jsonRpcParams)) {
    throw new MissingTxid(jsonRpcParams);
  }
  const txid = jsonRpcParams[txidKey];
  if (!txid || !isString(txid)) {
    throw new InvalidTxid(jsonRpcParams);
  }
  return txid as string;
}

function getVoutParam(jsonRpcParams: Partial<JSONRPCParams> | undefined) {
  const voutKey = "vout";
  if (isDictionary(jsonRpcParams) && voutKey in jsonRpcParams) {
    const vout = jsonRpcParams[voutKey];
    if (!isNumber(vout)) {
      throw new InvalidVout(jsonRpcParams);
    }
    return vout as unknown as number;
  }
  return undefined;
}

async function getConsignment(
  jsonRpcParams: Partial<JSONRPCParams> | undefined
) {
  const recipientID = getRecipientIDParam(jsonRpcParams);
  const consignment: Consignment | null = await ds.findOne({
    recipient_id: recipientID,
  });
  if (!consignment) {
    throw new NotFoundConsignment(jsonRpcParams);
  }
  return consignment;
}

interface ServerParams {
  file: Express.Multer.File | undefined;
}

const jsonRpcServer: JSONRPCServer<ServerParams> =
  new JSONRPCServer<ServerParams>({
    errorListener: () => {
      /* avoid too verbose error logs */
    },
  });

jsonRpcServer.addMethod(
  "server.info",
  async (_jsonRpcParams, _serverParams): Promise<ServerInfo> => {
    return {
      protocol_version: PROTOCOL_VERSION,
      version: APP_VERSION,
      uptime: Math.trunc(process.uptime()),
    };
  }
);

jsonRpcServer.addMethod(
  "consignment.get",
  async (jsonRpcParams, _serverParams): Promise<ConsignmentGetRes> => {
    const consignment = await getConsignment(jsonRpcParams);
    const fileBuffer = fs.readFileSync(
      path.join(consignmentDir, consignment.filename)
    );
    return {
      consignment: fileBuffer.toString("base64"),
      txid: consignment.txid,
      vout: consignment.vout,
    };
  }
);

jsonRpcServer.addMethod(
  "consignment.post",
  async (jsonRpcParams, serverParams): Promise<boolean> => {
    const file = serverParams?.file;
    try {
      const recipientID = getRecipientIDParam(jsonRpcParams);
      const txid = getTxidParam(jsonRpcParams);
      const vout = getVoutParam(jsonRpcParams);
      if (!file) {
        throw new MissingFile(jsonRpcParams);
      }
      const uploadedFile = path.join(tempDir, file.filename);
      const fileHash = genHashFromFile(uploadedFile);
      const prevFile: Consignment | null = await ds.findOne({
        recipient_id: recipientID,
      });
      if (prevFile) {
        if (prevFile.filename === fileHash) {
          fs.unlinkSync(path.join(tempDir, file.filename));
          return false;
        } else {
          throw new CannotChangeUploadedFile(jsonRpcParams);
        }
      }
      fs.renameSync(uploadedFile, path.join(consignmentDir, fileHash));
      const consignment: Consignment = {
        filename: fileHash,
        recipient_id: recipientID,
        txid: txid,
        vout: vout,
      };
      await ds.insert(consignment);
      return true;
    } catch (e: unknown) {
      if (file) {
        const unhandledFile = path.join(tempDir, file.filename);
        if (fs.existsSync(unhandledFile)) {
          fs.unlinkSync(unhandledFile);
        }
      }
      throw e;
    }
  }
);

jsonRpcServer.addMethod(
  "media.get",
  async (jsonRpcParams, _serverParams): Promise<string> => {
    const attachmentID = getAttachmentIDParam(jsonRpcParams);
    const media: Media | null = await ds.findOne({
      attachment_id: attachmentID,
    });
    if (!media) {
      throw new NotFoundMedia(jsonRpcParams);
    }
    const fileBuffer = fs.readFileSync(path.join(mediaDir, media.filename));
    return fileBuffer.toString("base64");
  }
);

jsonRpcServer.addMethod(
  "media.post",
  async (jsonRpcParams, serverParams): Promise<boolean> => {
    const file = serverParams?.file;
    try {
      const attachmentID = getAttachmentIDParam(jsonRpcParams);
      if (!file) {
        throw new MissingFile(jsonRpcParams);
      }
      const uploadedFile = path.join(tempDir, file.filename);
      const fileHash = genHashFromFile(uploadedFile);
      const prevFile: Media | null = await ds.findOne({
        attachment_id: attachmentID,
      });
      if (prevFile) {
        if (prevFile.filename === fileHash) {
          fs.unlinkSync(path.join(tempDir, file.filename));
          return false;
        } else {
          throw new CannotChangeUploadedFile(jsonRpcParams);
        }
      }
      fs.renameSync(uploadedFile, path.join(mediaDir, fileHash));
      const media: Media = {
        filename: fileHash,
        attachment_id: attachmentID,
      };
      await ds.insert(media);
      return true;
    } catch (e: unknown) {
      if (file) {
        const unhandledFile = path.join(tempDir, file.filename);
        if (fs.existsSync(unhandledFile)) {
          fs.unlinkSync(unhandledFile);
        }
      }
      throw e;
    }
  }
);

jsonRpcServer.addMethod(
  "ack.get",
  async (jsonRpcParams, _serverParams): Promise<boolean | undefined> => {
    const consignment = await getConsignment(jsonRpcParams);
    return consignment.ack;
  }
);

jsonRpcServer.addMethod(
  "ack.post",
  async (jsonRpcParams, _serverParams): Promise<boolean> => {
    const consignment = await getConsignment(jsonRpcParams);
    const ack = getAckParam(jsonRpcParams);
    if (consignment.ack != null) {
      if (consignment.ack === ack) {
        return false;
      } else {
        throw new CannotChangeAck(jsonRpcParams);
      }
    }
    await ds.update(
      { recipient_id: consignment.recipient_id },
      { $set: { ack: ack } },
      { multi: false }
    );
    return true;
  }
);

export const loadApiEndpoints = (app: Application): void => {
  app.post(
    "/json-rpc",
    upload.single("file"),
    async (req: Request, res: Response) => {
      // request logs
      const jsonRPCRequest = req.body;
      let reqParams = "";
      if (jsonRPCRequest.params !== null) {
        if (isString(jsonRPCRequest.params)) {
          jsonRPCRequest.params = JSON.parse(jsonRPCRequest.params);
        }
        if (isDictionary(jsonRPCRequest.params)) {
          reqParams = joinEntries(jsonRPCRequest.params);
        }
      }
      httpContext.set("apiMethod", req.body["method"]);
      httpContext.set("reqParams", reqParams);
      httpContext.set("clientID", jsonRPCRequest.id);
      logger.info("", { req });

      // call API method
      const file = req.file;
      jsonRpcServer
        .receive(jsonRPCRequest, { file })
        .then((jsonRPCResponse) => {
          if (jsonRPCResponse) {
            // response logs
            let response = "";
            if (isErrorResponse(jsonRPCResponse)) {
              response =
                `err <code: ${jsonRPCResponse.error.code}, ` +
                `message: ${jsonRPCResponse.error.message}>`;
            } else {
              response = "res ";
              const result = jsonRPCResponse.result;
              if (isDictionary(result)) {
                response += joinEntries(result);
              } else {
                response += "<";
                if (isString(result)) {
                  response += truncateText(result);
                } else {
                  response += result;
                }
                response += ">";
              }
            }
            httpContext.set("response", response);

            // send response to client
            res.json(jsonRPCResponse);
          } else {
            // notification
            res.sendStatus(204);
          }

          // delete possibly unhandled file
          if (file) {
            const unhandledFile = path.join(tempDir, file.filename);
            if (fs.existsSync(unhandledFile)) {
              logger.warning(`Deleting unhandled file: ${unhandledFile}`);
              fs.unlinkSync(unhandledFile);
            }
          }
        });
    }
  );
};
