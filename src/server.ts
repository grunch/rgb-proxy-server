import dotenv from "dotenv";

import app from "./app";
import { loadApiEndpoints } from "./controllers/api";

dotenv.config();

loadApiEndpoints(app);

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
