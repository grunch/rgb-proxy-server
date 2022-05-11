import express from "express";
import morgan from 'morgan';
import httpContext from 'express-http-context';
import { loadApiEndpoints } from "./controllers/api";
import logger from './logger';

let reqId = 0;
// Create Express server
const app = express();
app.use(httpContext.middleware);
// Set the Id to be used in the logs
app.use(function (req, res, next) {
  httpContext.ns.bindEmitter(req);
  httpContext.ns.bindEmitter(res);
  // Assign an Id to each request or reuse it if it already exists

  if (req.headers['logger-req-id']) {
    reqId = +req.headers['logger-req-id'];
  } else {
    reqId++;
  }

  httpContext.set('reqId', reqId);
  // set the req-id to every response
  res.setHeader('logger-req-id', reqId);
  logger.notice('', { 'req': req });

  next();
});

app.use(morgan(":status", {
  stream: {
    write: (message: string) => {
      logger.notice(message.trim(), { 'isFromMorgan': true });
    }
  }
}));

// Express configuration
app.set("port", process.env.PORT || 3000);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

loadApiEndpoints(app);

export default app;
