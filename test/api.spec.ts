import request from "supertest";

import app from "../src/app";
import { loadApiEndpoints } from "../src/controllers/api";

loadApiEndpoints(app);

describe("POST /json-rpc", () => {
  it("server.info should succeed", async () => {
    const jsonrpcVersion = "2.0";
    const reqID = 1;
    const req = {
      jsonrpc: jsonrpcVersion,
      id: reqID,
      method: "server.info",
    };
    const res = await request(app)
      .post("/json-rpc")
      .set("Content-type", "application/json")
      .send(req)
      .expect(200);
    expect(res.body.jsonrpc).toStrictEqual(jsonrpcVersion);
    expect(res.body.id).toStrictEqual(reqID);
    expect(res.body.result.protocol_version).toStrictEqual("0.1");
  });
});
