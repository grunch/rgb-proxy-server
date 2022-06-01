import dotenv from "dotenv";
import fs from "fs";
import { homedir } from "os";
import path from "path";

import app from "./app";
import { setDir } from "./util";
import { APP_DIR } from "./vars";

dotenv.config();

setDir(path.join(homedir(), APP_DIR));

/**
 * Start Express server.
 */
const server = app.listen(app.get("port"), () => {
  console.log(
    "  App is running at http://localhost:%d in %s mode",
    app.get("port"),
    app.get("env")
  );
  console.log("  Press CTRL-C to stop\n");
});

export default server;
