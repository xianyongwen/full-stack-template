import { AsyncLocalStorage } from "node:async_hooks";
import { prisma } from "./client.ts";

/**
 * 请求级事务上下文。
 *
 * 目的：让 Repository 不感知事务，方法签名里不出现 tx 参数。
 * 事务由 Service 通过 runInTransaction 开启，
 * 在该异步作用域内所有 Repository 调用自动复用同一事务。
 */

/** $transaction 回调里的 tx 对象类型 */
type TransactionClient = Parameters<
  Parameters<PrismaClient["$transaction"]>[0]
>[0];
type PrismaClient = typeof prisma;

const storage = new AsyncLocalStorage<TransactionClient>();

/**
 * 取当前上下文的 tx；若不在事务里则返回默认 client。
 * Repository 统一从这里取。
 */
export function getClient(): TransactionClient | PrismaClient {
  return storage.getStore() ?? prisma;
}

/**
 * 在 Service 中开启事务。
 * 嵌套调用自动复用外层事务，不会重复开启。
 *
 * @example
 * await runInTransaction(async () => {
 *   await userRepository.create(dto);
 *   await roleRepository.assign(userId, roleIds); // 同一事务
 * });
 */
export function runInTransaction<T>(
  fn: (tx: TransactionClient) => Promise<T>
): Promise<T> {
  const existing = storage.getStore();
  if (existing) return fn(existing); // 已在事务中，复用
  return prisma.$transaction((tx) => storage.run(tx, () => fn(tx)));
}
