import type { FastifyInstance } from "fastify";
import cron from "node-cron";

export function registerCronJobs(app: FastifyInstance) {
  app.log.info("Cron jobs enabled – registering scheduled tasks");

  // 在此注册定时任务，例如：
  // cron.schedule("* * * * *", () => { ... });
}
