import { Redis } from "ioredis";
import { config } from "../config.js";

let redisClient: Redis | null = null;

/** 获取 Redis 单例客户端 */
export function getRedis(): Redis {
  if (!redisClient) {
    redisClient = new Redis({
      host: config.redisHost,
      port: config.redisPort,
      password: config.redisPassword || undefined,
      retryStrategy(times: number) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    redisClient.on("error", (err: Error) => {
      console.error("[Redis] connection error:", err.message);
    });

    redisClient.on("connect", () => {
      console.log("[Redis] connected");
    });
  }
  return redisClient;
}

/** 确保 Redis 连接就绪（在 app 启动时调用） */
export async function connectRedis(): Promise<void> {
  const redis = getRedis();
  if (redis.status !== "ready" && redis.status !== "connecting") {
    await redis.connect();
  }
}

/** 优雅关闭 Redis 连接 */
export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}
