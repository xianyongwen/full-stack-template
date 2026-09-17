import { mkdirSync } from "node:fs";
import { join } from "node:path";
import pino from "pino";
import pinoRoll from "pino-roll";

const LOG_DIR = process.env.LOG_DIR ?? "/xyw/logs/xywtest";

// 确保日志目录存在
mkdirSync(LOG_DIR, { recursive: true });

// pino-roll 是 async 函数，返回 Promise，必须 await 才能拿到 stream
export async function createLoggerConfig() {
  const fileStream = await pinoRoll({
    file: join(LOG_DIR, "xywtest"),
    extension: ".log",
    frequency: "daily",
    mkdir: true,
  });

  const streams = [
    { level: "info" as const, stream: process.stdout },
    { level: "info" as const, stream: fileStream },
  ];

  return {
    level: "info",
    stream: pino.multistream(streams),
  };
}
