export const config = {
  jwtSecret: process.env.JWT_SECRET ?? "dev-only-change-me",
  /** MinIO / S3 兼容对象存储配置 */
  minioEndpoint: process.env.MINIO_ENDPOINT ?? "127.0.0.1",
  minioPort: Number(process.env.MINIO_PORT) || 9000,
  minioUseSSL: process.env.MINIO_USE_SSL === "true",
  minioAccessKey: process.env.MINIO_ACCESS_KEY ?? "minioadmin",
  minioSecretKey: process.env.MINIO_SECRET_KEY ?? "minioadmin",
  minioBucket: process.env.MINIO_BUCKET ?? "files",
  /** 对象公网访问 Base URL（留空则按 endpoint+bucket 拼接，供本地预览） */
  publicObjectBaseUrl: process.env.PUBLIC_OBJECT_BASE_URL ?? "",
  enableCron: process.env.ENABLE_CRON === "true",
  nodeEnv: process.env.NODE_ENV ?? "development",
  /** Redis 配置 */
  redisHost: process.env.REDIS_HOST ?? "127.0.0.1",
  redisPort: Number(process.env.REDIS_PORT) || 6379,
  redisPassword: process.env.REDIS_PASSWORD ?? "",
  /** 超级管理员初始账号（环境启动时自动创建） */
  superAdminUsername: process.env.SUPER_ADMIN_USERNAME ?? "admin",
  superAdminPassword: process.env.SUPER_ADMIN_PASSWORD ?? "admin123",
};
