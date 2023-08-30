import fs from "fs";
import path from "path";
import request from "supertest";

import app from "../src/app";
import { loadApiEndpoints } from "../src/controllers/api";

const jsonrpcVersion = "2.0";
const okStatus = 200;
const contentTypeForm = "multipart/form-data";

// temporary test directory
const tempDir = fs.mkdtempSync(path.join(__dirname, "temp-"));
process.env.APP_DIR = path.join(tempDir, "app-dir");

loadApiEndpoints(app);

afterAll(() => {
  // cleanup the temporary directory
  return fs.promises.rm(tempDir, { recursive: true, force: true });
});

describe("POST /json-rpc", () => {
  it("ack.post should succeed on 1st try then return false", async () => {
    const consignmentPath = path.join(tempDir, "ack.post");
    fs.writeFileSync(consignmentPath, "consignment ack binary data");
    let reqID = "1";
    const recipientID = "ackTest.post";
    const txid = "aTxid";
    let res = await request(app)
      .post("/json-rpc")
      .set("Content-type", contentTypeForm)
      .field("jsonrpc", jsonrpcVersion)
      .field("id", reqID)
      .field("method", "consignment.post")
      .field("params[recipient_id]", recipientID)
      .field("params[txid]", txid)
      .attach("file", fs.createReadStream(consignmentPath))
      .expect(okStatus);
    expect(res.body.result).toStrictEqual(true);

    reqID = "2";
    const method = "ack.post";
    let req = {
      jsonrpc: jsonrpcVersion,
      id: reqID,
      method: method,
      params: {
        recipient_id: recipientID,
        ack: true,
      },
    };
    res = await request(app).post("/json-rpc").send(req).expect(okStatus);
    expect(res.body.jsonrpc).toStrictEqual(jsonrpcVersion);
    expect(res.body.id).toStrictEqual(reqID);
    expect(res.body.result).toStrictEqual(true);

    reqID = "3";
    req = {
      jsonrpc: jsonrpcVersion,
      id: reqID,
      method: method,
      params: {
        recipient_id: recipientID,
        ack: true,
      },
    };
    res = await request(app).post("/json-rpc").send(req).expect(okStatus);
    expect(res.body.id).toStrictEqual(reqID);
    expect(res.body.result).toStrictEqual(false);
  });

  it("consignment.get should succeed", async () => {
    const consignmentPath = path.join(tempDir, "consignment.get");
    fs.writeFileSync(consignmentPath, "consignment get binary data");
    const consignment = fs.readFileSync(consignmentPath);
    const consignmentBase64 = consignment.toString("base64");
    let reqID = "1";
    const recipientID = "blindTest.get";
    const txid = "aTxid";
    let res = await request(app)
      .post("/json-rpc")
      .set("Content-type", contentTypeForm)
      .field("jsonrpc", jsonrpcVersion)
      .field("id", reqID)
      .field("method", "consignment.post")
      .field("params[recipient_id]", recipientID)
      .field("params[txid]", txid)
      .attach("file", fs.createReadStream(consignmentPath))
      .expect(okStatus);
    expect(res.body.result).toStrictEqual(true);

    reqID = "2";
    const req = {
      jsonrpc: jsonrpcVersion,
      id: reqID,
      method: "consignment.get",
      params: {
        recipient_id: recipientID,
      },
    };
    res = await request(app).post("/json-rpc").send(req).expect(okStatus);
    expect(res.body.jsonrpc).toStrictEqual(jsonrpcVersion);
    expect(res.body.id).toStrictEqual(reqID);
    expect(res.body.result.consignment).toStrictEqual(consignmentBase64);
    expect(res.body.result.txid).toStrictEqual(txid);
  });

  it("consignment.post should succeed on 1st try then return false", async () => {
    const consignmentPath = path.join(tempDir, "consignment.post");
    fs.writeFileSync(consignmentPath, "consignment post binary data");
    let reqID = "1";
    const method = "consignment.post";
    const recipientID = "blindTest.post";
    const txid = "aTxid";
    let res = await request(app)
      .post("/json-rpc")
      .set("Content-type", contentTypeForm)
      .field("jsonrpc", jsonrpcVersion)
      .field("id", reqID)
      .field("method", method)
      .field("params[recipient_id]", recipientID)
      .field("params[txid]", txid)
      .attach("file", fs.createReadStream(consignmentPath))
      .expect(okStatus);
    expect(res.body.jsonrpc).toStrictEqual(jsonrpcVersion);
    expect(res.body.id).toStrictEqual(reqID);
    expect(res.body.result).toStrictEqual(true);

    reqID = "2";
    res = await request(app)
      .post("/json-rpc")
      .set("Content-type", contentTypeForm)
      .field("jsonrpc", jsonrpcVersion)
      .field("id", reqID)
      .field("method", method)
      .field("params[recipient_id]", recipientID)
      .field("params[txid]", txid)
      .attach("file", fs.createReadStream(consignmentPath))
      .expect(okStatus);
    expect(res.body.id).toStrictEqual(reqID);
    expect(res.body.result).toStrictEqual(false);
  });

  it("media.get should succeed", async () => {
    const mediaPath = path.join(tempDir, "media.post");
    fs.writeFileSync(mediaPath, "media get binary data");
    const media = fs.readFileSync(mediaPath);
    const mediaBase64 = media.toString("base64");
    let reqID = "1";
    const attachmentID = "mediaTest.get";
    let res = await request(app)
      .post("/json-rpc")
      .set("Content-type", contentTypeForm)
      .field("jsonrpc", jsonrpcVersion)
      .field("id", reqID)
      .field("method", "media.post")
      .field("params[attachment_id]", attachmentID)
      .attach("file", fs.createReadStream(mediaPath))
      .expect(okStatus);
    expect(res.body.result).toStrictEqual(true);

    reqID = "2";
    const req = {
      jsonrpc: jsonrpcVersion,
      id: reqID,
      method: "media.get",
      params: {
        attachment_id: attachmentID,
      },
    };
    res = await request(app).post("/json-rpc").send(req).expect(okStatus);
    expect(res.body.jsonrpc).toStrictEqual(jsonrpcVersion);
    expect(res.body.id).toStrictEqual(reqID);
    expect(res.body.result).toStrictEqual(mediaBase64);
  });

  it("media.post should succeed on 1st try then return false", async () => {
    const mediaPath = path.join(tempDir, "media.post");
    fs.writeFileSync(mediaPath, "media post binary data");
    let reqID = "1";
    const method = "media.post";
    const attachmentID = "mediaTest.post";
    let res = await request(app)
      .post("/json-rpc")
      .set("Content-type", contentTypeForm)
      .field("jsonrpc", jsonrpcVersion)
      .field("id", reqID)
      .field("method", method)
      .field("params[attachment_id]", attachmentID)
      .attach("file", fs.createReadStream(mediaPath))
      .expect(okStatus);
    expect(res.body.jsonrpc).toStrictEqual(jsonrpcVersion);
    expect(res.body.id).toStrictEqual(reqID);
    expect(res.body.result).toStrictEqual(true);
    reqID = "2";
    res = await request(app)
      .post("/json-rpc")
      .set("Content-type", contentTypeForm)
      .field("jsonrpc", jsonrpcVersion)
      .field("id", reqID)
      .field("method", method)
      .field("params[attachment_id]", attachmentID)
      .attach("file", fs.createReadStream(mediaPath))
      .expect(okStatus);
    expect(res.body.id).toStrictEqual(reqID);
    expect(res.body.result).toStrictEqual(false);
  });

  it("server.info should succeed", async () => {
    const reqID = 1;
    const req = {
      jsonrpc: jsonrpcVersion,
      id: reqID,
      method: "server.info",
    };
    const res = await request(app).post("/json-rpc").send(req).expect(okStatus);
    expect(res.body.jsonrpc).toStrictEqual(jsonrpcVersion);
    expect(res.body.id).toStrictEqual(reqID);
    expect(res.body.result.protocol_version).toStrictEqual("0.2");
  });
});
