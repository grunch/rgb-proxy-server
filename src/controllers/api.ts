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
  app.get("/consignment/:blindedutxo", async (req: Request, res: Response) => {
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
          CONSIGNMENTS_DIR_PATH + "/" + c.filename
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
  });

  app.post(
    "/consignment",
    upload.single("consignment"),
    async (req: Request, res: Response) => {
      try {
        if (!req.file) {
          return res
            .status(400)
            .send({ success: false, error: "Consignment file is missing!" });
        }
        const fileHash = genHashFromFile(
          TMP_DIR_PATH + "/" + req.file.filename
        );
        // We check if the file is already in consignments directory
        if (fs.existsSync(CONSIGNMENTS_DIR_PATH + "/" + fileHash)) {
          // We delete the file from the uploads directory
          fs.unlinkSync(TMP_DIR_PATH + "/" + req.file.filename);
          return res
            .status(403)
            .send({ success: false, error: "File already uploaded!" });
        }
        // We move the file with the hash as name
        fs.renameSync(
          TMP_DIR_PATH + "/" + req.file.filename,
          CONSIGNMENTS_DIR_PATH + "/" + fileHash
        );
        const consignment: Consignment = {
          filename: fileHash,
          blindedutxo: req.body.blindedutxo,
        };
        await ds.insert(consignment);
        return res.status(200).send({ success: true });
      } catch (error) {
        res.status(500).send({ success: false });
      } finally {
        if (fs.existsSync(TMP_DIR_PATH + "/" + req.file?.filename)) {
          // We delete the file from the uploads directory
          fs.unlinkSync(TMP_DIR_PATH + "/" + req.file?.filename);
        }
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
        return res.status(400).send({ success: false });
      }
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

  app.get("/ack/:blindedutxo", async (req: Request, res: Response) => {
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
  });
};
