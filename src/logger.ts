import httpContext from "express-http-context";
import winston from "winston";

const level = process.env.LOG_LEVEL || "notice";

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp({
      format: "YYYY-MM-DDTHH:mm:ss.SSSZ",
    }),
    winston.format.colorize(),
    winston.format.printf((info) => {
      if (info.isFromMorgan) {
        return `[${info.timestamp}] ${info.level}: <- [${
          httpContext.get("reqId") || "-"
        }] ${info.message}`;
      } else {
        if (info.req) {
          const ip = info.req.headers["x-forwarded-for"]
            ? info.req.headers["x-forwarded-for"]
            : info.req.ip;
          return `[${info.timestamp}] ${info.level}: -> [${
            httpContext.get("reqId") || "-"
          }] ${ip || ""} ${info.req.method} ${info.req.originalUrl} ${
            info.req.headers["user-agent"] || ""
          } ${httpContext.get("blindedutxo") || ""}`;
        } else {
          return `[${info.timestamp}] ${info.level}: -- [${
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

export default logger;
