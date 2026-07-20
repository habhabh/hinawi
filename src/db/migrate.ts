import { migrate } from "drizzle-orm/node-postgres/migrator";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_MIGRATION_URL || process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL مطلوب لتشغيل migrations");

const pool = new Pool({ connectionString, max: 1 });
try {
  await migrate(drizzle(pool), { migrationsFolder: "src/db/migrations" });
  console.info("تم تطبيق migrations بنجاح");
} finally {
  await pool.end();
}
