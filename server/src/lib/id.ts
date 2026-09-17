import { randomBytes } from "node:crypto";

/** 24-char hex id compatible with legacy Mongo ObjectId string length */
export function newObjectId(): string {
  return randomBytes(12).toString("hex");
}
