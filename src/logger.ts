import httpContext from "express-http-context";
import winston from "winston";

const { combine, colorize, timestamp, printf } = winston.format;

const level = process.env.LOG_LEVEL || "debug";

export const logger = winston.createLogger({
  format: combine(
    timestamp({
      format: "YYYY-MM-DDTHH:mm:ss.SSSZ",
    }),
    colorize(),
    printf((info) => {
      const prefix = `[${info.timestamp}] ${info.level}: `;
      const reqIDs = `[${httpContext.get("reqId") || "N/A"} - ${
        httpContext.get("clientID") || "N/A"
      }]`;
      let arrow = "--";
      let extra = "";

      if (info.req) {
        arrow = "->";
        const clientIP = info.req.headers["x-forwarded-for"]
          ? info.req.headers["x-forwarded-for"]
          : info.req.ip;
        let ip = "";
        if (clientIP) {
          ip = `${clientIP} `;
        }
        const apiMethod = httpContext.get("apiMethod");
        const reqParams = httpContext.get("reqParams");
        let params = "";
        if (reqParams) {
          params = `${reqParams} `;
        }
        const userAgent = info.req.headers["user-agent"] || "";
        extra = ` ${ip}${apiMethod} ${params}${userAgent}`;
      } else if (info.isFromMorgan) {
        arrow = "<-";
        const response = httpContext.get("response");
        if (response) {
          extra = ` ${response}`;
        }
      }

      return `${prefix}${arrow} ${reqIDs}${extra} ${info.message}`;
    })
  ),
  levels: winston.config.syslog.levels,
  level,
  transports: [
    new winston.transports.Console({
      handleExceptions: true,
    }),
  ],
  exitOnError: false,
});

export const oldAPILogger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp({
      format: "YYYY-MM-DDTHH:mm:ss.SSSZ",
    }),
    winston.format.colorize(),
    winston.format.printf((info) => {
      if (info.isFromMorgan) {
        return `[${info.timestamp}] ${info.level}: [OLD] <- [${
          httpContext.get("reqId") || "-"
        }] ${info.message}`;
      } else {
        if (info.req) {
          const ip = info.req.headers["x-forwarded-for"]
            ? info.req.headers["x-forwarded-for"]
            : info.req.ip;
          return `[${info.timestamp}] ${info.level}: [OLD] -> [${
            httpContext.get("reqId") || "-"
          }] ${ip || ""} ${info.req.method} ${info.req.originalUrl} ${
            info.req.headers["user-agent"] || ""
          } ${httpContext.get("blindedutxo") || ""}`;
        } else {
          return `[${info.timestamp}] ${info.level}: [OLD] -- [${
            httpContext.get("reqId") || "-"
          }] ${info.message}`;
        }
      }
    })
  ),
  levels: winston.config.syslog.levels,
  level,
  transports: [
    new winston.transports.Console({
      handleExceptions: true,
    }),
  ],
  exitOnError: false,
});
