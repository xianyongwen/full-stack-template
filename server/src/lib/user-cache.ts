import { getRedis } from "./redis.js";
import type { CurrentUser } from "../types/fastify.d.ts";

const CACHE_PREFIX = "user:cache:";
const CACHE_TTL = 24 * 60 * 60; // 1 day

function buildKey(userId: string) {
  return `${CACHE_PREFIX}${userId}`;
}

export const userCache = {
  async get(userId: string): Promise<CurrentUser | null> {
    const raw = await getRedis().get(buildKey(userId));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as CurrentUser;
    } catch {
      return null;
    }
  },

  async set(userId: string, user: CurrentUser): Promise<void> {
    await getRedis().setex(buildKey(userId), CACHE_TTL, JSON.stringify(user));
  },

  async del(userId: string): Promise<void> {
    await getRedis().del(buildKey(userId));
  },

  /** 删除匹配模式的所有缓存 key（用于角色/权限变更时批量失效） */
  async delByPattern(pattern: string): Promise<void> {
    const redis = getRedis();
    const keys = await redis.keys(`${CACHE_PREFIX}${pattern}`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  },
};
