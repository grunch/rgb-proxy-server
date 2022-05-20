import crypto from "crypto";
import fs from "fs";

const genHashFromFile = (fileName: string): string => {
  const fileBuffer = fs.readFileSync(fileName);
  const hash = crypto.createHash("sha256");
  hash.update(fileBuffer);

  return hash.digest("hex");
};

export { genHashFromFile };
