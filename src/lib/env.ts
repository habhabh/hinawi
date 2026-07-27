import { z } from "zod";

const optionalUrl = z.string().url().optional().or(z.literal(""));

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1).default("postgresql://alhinnawi:alhinnawi@localhost:5432/alhinnawi"),
  DATABASE_MIGRATION_URL: optionalUrl,
  DB_POOL_MAX: z.coerce.number().int().positive().default(10),
  DB_IDLE_TIMEOUT: z.coerce.number().int().positive().default(30_000),
  DB_CONNECTION_TIMEOUT: z.coerce.number().int().positive().default(5_000),
  BETTER_AUTH_SECRET: z.string().min(32).default("development-only-secret-change-before-production"),
  BETTER_AUTH_URL: z.string().url().default("http://localhost:3000"),
  BETTER_AUTH_TRUSTED_ORIGINS: z.string().default("http://localhost:3000"),
  STORAGE_DRIVER: z.enum(["s3", "local"]).default("local"),
  MEDIA_ROOT: z.string().default("/data/media"),
  MEDIA_PUBLIC_BASE_URL: z.string().default("/api/media"),
  IMAGE_MAX_SIZE_MB: z.coerce.number().positive().default(20),
  IMAGE_MAX_PIXELS: z.coerce.number().int().positive().max(268_402_689).default(268_402_689),
  VIDEO_MAX_SIZE_MB: z.coerce.number().positive().default(150),
  S3_ENDPOINT: optionalUrl,
  S3_REGION: z.string().default("auto"),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_FORCE_PATH_STYLE: z.string().default("false").transform((v) => v === "true"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  SMTP_SECURE: z.string().default("false").transform((v) => v === "true"),
  ANALYTICS_SESSION_SECRET: z.string().optional(),
  CRON_SECRET: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(`إعدادات البيئة غير صالحة: ${parsed.error.issues.map((i) => i.path.join(".")).join(", ")}`);
}

export const env = parsed.data;
