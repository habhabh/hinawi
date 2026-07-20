import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Readable } from "node:stream";
import { env } from "@/lib/env";
import type { StorageAdapter } from "@/lib/storage/types";

function config() {
  if (!env.S3_BUCKET || !env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) throw new Error("إعدادات S3 غير مكتملة");
  return { bucket: env.S3_BUCKET };
}

const client = new S3Client({
  endpoint: env.S3_ENDPOINT || undefined,
  region: env.S3_REGION,
  forcePathStyle: env.S3_FORCE_PATH_STYLE,
  credentials: env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY ? { accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY } : undefined,
});

export const s3Storage: StorageAdapter = {
  async createUploadUrl(key, contentType, sizeBytes) {
    const { bucket } = config();
    const command = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType, ContentLength: sizeBytes });
    return { url: await getSignedUrl(client, command, { expiresIn: 10 * 60 }), headers: { "content-type": contentType } };
  },
  async exists(key) {
    try {
      const result = await client.send(new HeadObjectCommand({ Bucket: config().bucket, Key: key }));
      return { key, size: result.ContentLength ?? 0, contentType: result.ContentType };
    } catch {
      return null;
    }
  },
  async read(key) {
    const result = await client.send(new GetObjectCommand({ Bucket: config().bucket, Key: key }));
    if (!result.Body) throw new Error("الملف غير موجود");
    return result.Body as Readable;
  },
  async write(key, body, contentType) {
    await client.send(new PutObjectCommand({ Bucket: config().bucket, Key: key, Body: body as Readable | Uint8Array, ContentType: contentType }));
  },
  async remove(key) {
    await client.send(new DeleteObjectCommand({ Bucket: config().bucket, Key: key }));
  },
  publicUrl(key) {
    return `${env.MEDIA_PUBLIC_BASE_URL.replace(/\/$/, "")}/${key.split("/").map(encodeURIComponent).join("/")}`;
  },
};
