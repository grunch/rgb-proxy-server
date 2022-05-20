import { Application, Request, Response } from "express";
import fs from "fs";
import multer from "multer";
import Datastore from "nedb-promises";

import logger from "../logger";
import { genHashFromFile } from "../util";

const TMP_DIR_PATH = "./files/tmp";
const CONSIGNMENTS_DIR_PATH = "./files/consignments";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, TMP_DIR_PATH);
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

const ds = Datastore.create();

export const loadApiEndpoints = (app: Application): void => {
  app.get("/consignment", async (req: Request, res: Response) => {
    try {
      if (!!req.query.blindedutxo) {
        const c: Consignment | null = await ds.findOne({
          blindedutxo: req.query.blindedutxo,
        });
        if (!c) {
          return res.status(403).send({ success: false });
        }
        const file_buffer = fs.readFileSync(TMP_DIR_PATH + c.filename);

        return res.status(200).send({
          success: true,
          consignment: file_buffer.toString("base64"),
        });
      }

      res.status(403).send({ success: false });
    } catch (error) {
      res.status(500).send({ success: false });
    }
  });

  app.post(
    "/consignment",
    upload.single("consignment"),
    async (req: Request, res: Response) => {
      try {
        if (!req.file) {
          return res.status(403).send({ success: false });
        }
        const fileHash = genHashFromFile(
          TMP_DIR_PATH + "/" + req.file.filename
        );
        // We check if the file is already in consignments directory
        if (fs.existsSync(CONSIGNMENTS_DIR_PATH + "/" + fileHash)) {
          // We delete the file from the uploads directory
          fs.unlinkSync(TMP_DIR_PATH + "/" + req.file.filename);
          return res.status(403).send({ success: false });
        }
        // We move the file with the hash as name
        fs.renameSync(
          TMP_DIR_PATH + "/" + req.file.filename,
          CONSIGNMENTS_DIR_PATH + "/" + fileHash
        );
        const consignment: Consignment = {
          filename: req.file?.filename || "",
          blindedutxo: req.body.blindedutxo,
        };
        await ds.insert(consignment);
        return res.status(200).send({ success: true });
      } catch (error) {
        res.status(500).send({ success: false });
      }
    }
  );

  app.post("/ack", async (req: Request, res: Response) => {
    try {
      if (!req.body.blindedutxo) {
        return res.status(403).send({ success: false });
      }
      let c: Consignment | null = await ds.findOne({
        blindedutxo: req.body.blindedutxo,
      });

      if (!c) {
        throw new Error("No consignment found");
      }
      if (!!c.responded) {
        return res.status(403).send({ success: false });
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
      c = await ds.findOne({ blindedutxo: req.body.blindedutxo });

      return res.status(200).send({ success: true });
    } catch (error) {
      logger.error(error);
      res.status(500).send({ success: false });
    }
  });

  app.post("/nack", async (req: Request, res: Response) => {
    try {
      if (!req.body.blindedutxo) {
        return res.status(403).send({ success: false });
      }
      let c: Consignment | null = await ds.findOne({
        blindedutxo: req.body.blindedutxo,
      });
      if (!c) {
        return res.status(403).send({ success: false });
      }
      if (!!c.responded) {
        return res.status(403).send({ success: false });
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

  app.get("/ack", async (req: Request, res: Response) => {
    try {
      if (!!req.query.blindedutxo) {
        const c: Consignment | null = await ds.findOne({
          blindedutxo: req.query.blindedutxo,
        });

        if (!c) {
          throw new Error("No consignment found");
        }
        const ack = !!c.ack;
        const nack = !!c.nack;

        return res.status(200).send({
          success: true,
          ack,
          nack,
        });
      }

      res.status(403).send({ success: false });
    } catch (error) {
      logger.error(error);
      res.status(500).send({ success: false });
    }
  });
};
