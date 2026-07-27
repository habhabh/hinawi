import { env } from "@/lib/env";
import { localStorage } from "@/lib/storage/local";
import { s3Storage } from "@/lib/storage/s3";

export const storage = env.STORAGE_DRIVER === "s3" ? s3Storage : localStorage;

export function storageForDriver(driver: string) {
  if (driver === "s3") return s3Storage;
  if (driver === "local") return localStorage;
  throw new Error(`مشغل تخزين غير مدعوم: ${driver}`);
}

export type { StorageAdapter } from "@/lib/storage/types";
