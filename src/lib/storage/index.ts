import { env } from "@/lib/env";
import { localStorage } from "@/lib/storage/local";
import { s3Storage } from "@/lib/storage/s3";

export const storage = env.STORAGE_DRIVER === "s3" ? s3Storage : localStorage;
export type { StorageAdapter } from "@/lib/storage/types";
