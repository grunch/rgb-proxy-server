import { Application, Request, Response } from "express";
import httpContext from "express-http-context";
import fs from "fs";
import multer from "multer";
import Datastore from "nedb-promises";
import { homedir } from "os";
import path from "path";

import logger from "../logger";
import { genHashFromFile, setDir } from "../util";
import { APP_DIR } from "../vars";

const TMP_DIR = "tmp";
const CONSIGNMENTS_DIR = "consignments";
const MEDIA_DIR = "media";
const DATABASE_FILE = "app.db";
// We make sure the directories exist
setDir(path.join(homedir(), APP_DIR, TMP_DIR));
setDir(path.join(homedir(), APP_DIR, CONSIGNMENTS_DIR));
setDir(path.join(homedir(), APP_DIR, MEDIA_DIR));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(homedir(), APP_DIR, TMP_DIR));
  },
});

const upload = multer({ storage });

interface Consignment {
  _id?: string;
  filename: string;
  blindedutxo: string;
  ack?: boolean;
  nack?: boolean;
  responded?: boolean;
}

interface Media {
  filename: string;
  attachment_id: string;
}

const ds = Datastore.create(path.join(homedir(), APP_DIR, DATABASE_FILE));

const middleware = (req: Request, res: Response, next: () => void) => {
  logger.notice("", { req });

  next();
};

export const loadApiEndpoints = (app: Application): void => {
  app.get(
    "/consignment/:blindedutxo",
    middleware,
    async (req: Request, res: Response) => {
      try {
        if (!!req.params.blindedutxo) {
          const c: Consignment | null = await ds.findOne({
            blindedutxo: req.params.blindedutxo,
          });
          if (!c) {
            return res.status(404).send({
              success: false,
              error: "No consignment found!",
            });
          }
          const file_buffer = fs.readFileSync(
            path.join(homedir(), APP_DIR, CONSIGNMENTS_DIR, c.filename)
          );

          return res.status(200).send({
            success: true,
            consignment: file_buffer.toString("base64"),
          });
        }

        res.status(400).send({ success: false, error: "blindedutxo missing!" });
      } catch (error) {
        res.status(500).send({ success: false });
      }
    }
  );

  app.post(
    "/consignment",
    upload.single("consignment"),
    async (req: Request, res: Response) => {
      try {
        if (!req.body.blindedutxo) {
          return res
            .status(400)
            .send({ success: false, error: "blindedutxo missing!" });
        }
        httpContext.set("blindedutxo", req.body.blindedutxo);
        logger.notice("", { req: req });
        if (!req.file) {
          return res
            .status(400)
            .send({ success: false, error: "Consignment file is missing!" });
        }
        const fileHash = genHashFromFile(
          path.join(homedir(), APP_DIR, TMP_DIR, req.file.filename)
        );
        const prevConsignment: Consignment | null = await ds.findOne({
          blindedutxo: req.body.blindedutxo,
        });
        if (prevConsignment) {
          if (prevConsignment.filename == fileHash) {
            return res.status(200).send({ success: true });
          } else {
            return res
              .status(403)
              .send({ success: false, error: "Cannot change uploaded file!" });
          }
        }
        // We move the file with the hash as name
        fs.renameSync(
          path.join(homedir(), APP_DIR, TMP_DIR, req.file.filename),
          path.join(homedir(), APP_DIR, CONSIGNMENTS_DIR, fileHash)
        );
        const consignment: Consignment = {
          filename: fileHash,
          blindedutxo: req.body.blindedutxo,
        };
        await ds.insert(consignment);
        if (
          fs.existsSync(
            path.join(homedir(), APP_DIR, TMP_DIR, req.file.filename)
          )
        ) {
          // We delete the file from the uploads directory
          fs.unlinkSync(
            path.join(homedir(), APP_DIR, TMP_DIR, req.file.filename)
          );
        }

        return res.status(200).send({ success: true });
      } catch (error) {
        res.status(500).send({ success: false });
      }
    }
  );

  app.get(
    "/media/:attachment_id",
    middleware,
    async (req: Request, res: Response) => {
      try {
        if (!!req.params.attachment_id) {
          const media: Media | null = await ds.findOne({
            attachment_id: req.params.attachment_id,
          });
          if (!media) {
            return res.status(404).send({
              success: false,
              error: "No media found!",
            });
          }
          const file_buffer = fs.readFileSync(
            path.join(homedir(), APP_DIR, MEDIA_DIR, media.filename)
          );

          return res.status(200).send({
            success: true,
            media: file_buffer.toString("base64"),
          });
        }

        res.status(400).send({ success: false, error: "attachment_id missing!" });
      } catch (error) {
        res.status(500).send({ success: false });
      }
    }
  );

  app.post(
    "/media",
    upload.single("media"),
    async (req: Request, res: Response) => {
      try {
        if (!req.body.attachment_id) {
          return res
            .status(400)
            .send({ success: false, error: "attachment_id missing!" });
        }
        httpContext.set("attachment_id", req.body.attachment_id);
        logger.notice("", { req: req });
        if (!req.file) {
          return res
            .status(400)
            .send({ success: false, error: "Media file is missing!" });
        }
        const fileHash = genHashFromFile(
          path.join(homedir(), APP_DIR, TMP_DIR, req.file.filename)
        );
        const prevMedia: Media | null = await ds.findOne({
          attachment_id: req.body.attachment_id,
        });
        if (prevMedia) {
          if (prevMedia.filename == fileHash) {
            return res.status(200).send({ success: true });
          } else {
            return res
              .status(403)
              .send({ success: false, error: "Cannot change uploaded file!" });
          }
        }
        // We move the file with the hash as name
        fs.renameSync(
          path.join(homedir(), APP_DIR, TMP_DIR, req.file.filename),
          path.join(homedir(), APP_DIR, MEDIA_DIR, fileHash)
        );
        const media: Media = {
          filename: fileHash,
          attachment_id: req.body.attachment_id,
        };
        await ds.insert(media);
        if (
          fs.existsSync(
            path.join(homedir(), APP_DIR, TMP_DIR, req.file.filename)
          )
        ) {
          // We delete the file from the uploads directory
          fs.unlinkSync(
            path.join(homedir(), APP_DIR, TMP_DIR, req.file.filename)
          );
        }

        return res.status(200).send({ success: true });
      } catch (error) {
        res.status(500).send({ success: false });
      }
    }
  );

  app.post("/ack", async (req: Request, res: Response) => {
    try {
      if (!req.body.blindedutxo) {
        return res
          .status(400)
          .send({ success: false, error: "blindedutxo missing!" });
      }
      httpContext.set("blindedutxo", req.body.blindedutxo);
      logger.notice("", { req: req });
      const c: Consignment | null = await ds.findOne({
        blindedutxo: req.body.blindedutxo,
      });

      if (!c) {
        return res
          .status(404)
          .send({ success: false, error: "No consignment found!" });
      }
      if (!!c.responded) {
        return res
          .status(403)
          .send({ success: false, error: "Already responded!" });
      }
      await ds.update(
        { blindedutxo: req.body.blindedutxo },
        {
          $set: {
            ack: true,
            nack: false,
            responded: true,
          },
        },
        { multi: false }
      );

      return res.status(200).send({ success: true });
    } catch (error) {
      logger.error(error);
      res.status(500).send({ success: false });
    }
  });

  app.post("/nack", async (req: Request, res: Response) => {
    try {
      if (!req.body.blindedutxo) {
        return res
          .status(400)
          .send({ success: false, error: "blindedutxo missing!" });
      }
      httpContext.set("blindedutxo", req.body.blindedutxo);
      logger.notice("", { req: req });
      let c: Consignment | null = await ds.findOne({
        blindedutxo: req.body.blindedutxo,
      });
      if (!c) {
        return res.status(404).send({ success: false });
      }
      if (!!c.responded) {
        return res
          .status(403)
          .send({ success: false, error: "Already responded!" });
      }
      await ds.update(
        { blindedutxo: req.body.blindedutxo },
        {
          $set: {
            nack: true,
            ack: false,
            responded: true,
          },
        },
        { multi: false }
      );
      c = await ds.findOne({ blindedutxo: req.body.blindedutxo });

      return res.status(200).send({ success: true });
    } catch (error) {
      res.status(500).send({ success: false });
    }
  });

  app.get(
    "/ack/:blindedutxo",
    middleware,
    async (req: Request, res: Response) => {
      try {
        if (!req.params.blindedutxo) {
          return res
            .status(400)
            .send({ success: false, error: "blindedutxo missing!" });
        }
        const c: Consignment | null = await ds.findOne({
          blindedutxo: req.params.blindedutxo,
        });

        if (!c) {
          return res
            .status(404)
            .send({ success: false, error: "No consignment found!" });
        }
        const ack = !!c.ack;
        const nack = !!c.nack;

        return res.status(200).send({
          success: true,
          ack,
          nack,
        });
      } catch (error) {
        logger.error(error);
        res.status(500).send({ success: false });
      }
    }
  );
};
