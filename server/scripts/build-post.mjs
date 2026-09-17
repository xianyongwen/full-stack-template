import { readFileSync, writeFileSync, cpSync, rmSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const dist = join(root, "dist");

// 1. 生成 dist/package.json（只保留生产依赖）
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf-8"));
const deployPkg = {
  name: pkg.name,
  version: pkg.version,
  private: true,
  type: pkg.type,
  dependencies: { ...pkg.dependencies, prisma: pkg.devDependencies.prisma },
  prisma: pkg.prisma,
  scripts: {
    start: "node --import ./prod-alias-loader.mjs index.js --name xywtest",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate deploy"
  },
};
writeFileSync(join(dist, "package.json"), JSON.stringify(deployPkg, null, 2));
console.log("✓ dist/package.json generated");

// 2. 复制 pnpm-lock.yaml 到 dist（保证服务器安装依赖版本一致）
cpSync(join(root, "pnpm-lock.yaml"), join(dist, "pnpm-lock.yaml"));
console.log("✓ pnpm-lock.yaml copied to dist/");

// 3. 复制 prisma 目录到 dist
//    先清空由源 prisma/ 复制而来的子目录（migrations/schema），避免已删除的迁移残留
//    导致 migrate deploy 报 P3015；保留 tsc 编译产物（client.js / transaction-context.js）
for (const sub of ["migrations", "schema"]) {
  rmSync(join(dist, "prisma", sub), { recursive: true, force: true });
}
cpSync(join(root, "prisma"), join(dist, "prisma"), { recursive: true });
console.log("✓ prisma/ copied to dist/");

// 3.1 复制 prisma.config.ts 到 dist（Prisma 7.x 配置文件，migrate/generate 都依赖它）
cpSync(join(root, "prisma.config.ts"), join(dist, "prisma.config.ts"));
console.log("✓ prisma.config.ts copied to dist/");

// 3.2 复制生产 ESM alias loader（运行时解析 @/ 路径别名）
cpSync(join(root, "scripts", "prod-alias-loader.mjs"), join(dist, "prod-alias-loader.mjs"));
console.log("✓ prod-alias-loader.mjs copied to dist/");

// 4. 复制 docker-compose.yml 到 dist
cpSync(join(root, "..", "docker-compose.yml"), join(dist, "docker-compose.yml"));
console.log("✓ docker-compose.yml copied to dist/");

// 5. 复制 .env.production 为 dist/.env（应用和 Prisma CLI 默认加载 .env）
cpSync(join(root, ".env.production"), join(dist, ".env"));
console.log("✓ .env.production → dist/.env");

console.log("\nDeploy steps on server:");
console.log("  1. docker compose up -d postgres        # 启动数据库");
console.log("  2. pnpm install --production");
console.log("  3. pnpm run prisma:generate");
console.log("  4. pnpm run prisma:migrate");
console.log("  5. pnpm start");
