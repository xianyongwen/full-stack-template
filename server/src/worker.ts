import "dotenv/config";
import cron from "node-cron";

// 独立 worker 进程：注册与应用主进程解耦的定时任务。
// 在此添加任务，例如：
// cron.schedule("* * * * *", () => { ... });
