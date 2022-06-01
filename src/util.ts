import crypto from "crypto";
import fs from "fs";

const genHashFromFile = (fileName: string): string => {
  const fileBuffer = fs.readFileSync(fileName);
  const hash = crypto.createHash("sha256");
  hash.update(fileBuffer);

  return hash.digest("hex");
};

// If dir doesn't exist we create it
const setDir = (dir: string): string => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);

  return dir;
};

export { genHashFromFile, setDir };
