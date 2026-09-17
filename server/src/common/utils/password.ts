import { scrypt, randomBytes, timingSafeEqual } from "node:crypto";

const KEY_LEN = 64;
const SALT_LEN = 16;
const SCRYPT_N = 16384;

/** 字符串转 Buffer */
function toBuffer(s: string): Buffer {
  return Buffer.from(s, "hex");
}

/**
 * 加密密码，返回 `salt:hash` 形式的字符串存库。
 */
export function hashPassword(plain: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = randomBytes(SALT_LEN);
    scrypt(plain, salt, KEY_LEN, { N: SCRYPT_N }, (err, derived) => {
      if (err) return reject(err);
      resolve(`${salt.toString("hex")}:${derived.toString("hex")}`);
    });
  });
}

/**
 * 校验密码。stored 为 hashPassword 的返回值。
 * 使用恒定时间比较，避免计时攻击。
 */
export function verifyPassword(plain: string, stored: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const [saltHex, hashHex] = stored.split(":");
    if (!saltHex || !hashHex) return resolve(false);
    const salt = toBuffer(saltHex);
    const expected = toBuffer(hashHex);
    scrypt(plain, salt, KEY_LEN, { N: SCRYPT_N }, (err, derived) => {
      if (err) return reject(err);
      if (derived.length !== expected.length) return resolve(false);
      resolve(timingSafeEqual(derived, expected));
    });
  });
}
