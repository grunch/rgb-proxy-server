import { Application, Request, Response } from "express";
import multer from "multer";
import Datastore from "nedb-promises";
import fs from "fs";
import logger from '../logger';

const FILE_PATH = './files/';

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, FILE_PATH)
  },
  filename: function (req, file, cb) {
    if (!fs.existsSync(FILE_PATH + file.originalname)) {
      cb(null, file.originalname);
    }
    return false;
  }
});

const fileFilter = (req: any, file: any, cb: any) => {
  if (fs.existsSync(FILE_PATH + file.originalname)) {
    cb(null, false);
  } else {
    cb(null, true);
  }
};

const upload = multer({ storage, fileFilter });

interface Consignment {
  _id?: string;
  filename: string;
  blindedutxo: string;
  ack?: boolean;
  nack?: boolean;
  responded?: boolean;
}

let ds = Datastore.create();

export const loadApiEndpoints = (app: Application): void => {
  app.get("/consignment", async (req: Request, res: Response) => {
    try {
      if (!!req.query.blindedutxo) {
        const c: Consignment | null = await ds.findOne({ blindedutxo: req.query.blindedutxo });
        if (!c) {
          return res.status(403).send({ success: false });
        }
        const file_buffer  = fs.readFileSync(FILE_PATH + c.filename);

        return res.status(200).send({
          success: true,
          consignment: file_buffer.toString('base64'),
        });
      }

      res.status(403).send({ success: false });
    } catch (error) {
      res.status(500).send({ success: false });
    }
  });

  app.post("/consignment", upload.single('consignment'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(403).send({ success: false });
      }
      const consignment: Consignment = {
        filename: req.file?.filename || '',
        blindedutxo: req.body.blindedutxo,
      };
      await ds.insert(consignment);
      return res.status(200).send({ success: true });
    } catch (error) {
      res.status(500).send({ success: false });
    }
  });

  app.post("/ack", async (req: Request, res: Response) => {
    try {
      if (!req.body.blindedutxo) {
        return res.status(403).send({ success: false });
      }
      let c: Consignment | null = await ds.findOne({ blindedutxo: req.body.blindedutxo });

      if (!c) {
        throw new Error('No consignment found');
      }
      if (!!c.responded) {
        return res.status(403).send({ success: false });
      }
      await ds.update(
        { blindedutxo: req.body.blindedutxo },
        { $set: {
            ack: true,
            nack: false,
            responded: true,
          } },
        { multi: false },
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
      let c: Consignment | null = await ds.findOne({ blindedutxo: req.body.blindedutxo });
      if (!c) {
        return res.status(403).send({ success: false });
      }
      if (!!c.responded) {
        return res.status(403).send({ success: false });
      }
      await ds.update(
        { blindedutxo: req.body.blindedutxo },
        { $set: {
          nack: true,
          ack: false,
          responded: true,
        } },
        { multi: false },
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
        const c: Consignment | null = await ds.findOne({ blindedutxo: req.query.blindedutxo });

        if (!c) {
          throw new Error('No consignment found');
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
