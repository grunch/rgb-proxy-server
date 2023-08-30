import cors from "cors";
import express from "express";
import httpContext from "express-http-context";
import morgan from "morgan";
import { homedir } from "os";
import path from "path";

import { logger, oldAPILogger } from "./logger";
import { setDir } from "./util";
import { APP_DIR } from "./vars";

let reqId = 0;
// Create Express server
const app = express();

// Create app directory if it doesn't exist
setDir(path.join(homedir(), APP_DIR));

// Allow request from any origin
app.use(cors());

app.use(httpContext.middleware);

// Set the Id to be used in the logs
app.use(function (req, res, next) {
  httpContext.ns.bindEmitter(req);
  httpContext.ns.bindEmitter(res);

  // Assign an Id to each request or reuse it if it already exists
  if (req.headers["logger-req-id"]) {
    reqId = +req.headers["logger-req-id"];
  } else {
    reqId++;
  }

  httpContext.set("reqId", reqId);
  // set the req-id to every response
  res.setHeader("logger-req-id", reqId);

  next();
});

app.use(
  morgan(":status", {
    skip: (req, _res) => {
      return !req.originalUrl.startsWith("/json-rpc");
    },
    stream: {
      write: (message: string) => {
        logger.info(message.trim(), { isFromMorgan: true });
      },
    },
  })
);

app.use(
  morgan(":status", {
    skip: (req, _res) => {
      return req.originalUrl.startsWith("/json-rpc");
    },
    stream: {
      write: (message: string) => {
        oldAPILogger.notice(message.trim(), { isFromMorgan: true });
      },
    },
  })
);

// Express configuration
app.set("port", process.env.PORT || 3000);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

export default app;
