import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import sharp from "sharp";
import { eq } from "drizzle-orm";
import { db, pool } from "@/db";
import { mediaAssets, mediaJobs } from "@/db/schema";
import { storage } from "@/lib/storage";

const exec = promisify(execFile);
const workerId = `media-${process.pid}-${crypto.randomUUID().slice(0, 8)}`;
let stopping = false;

async function toBuffer(stream: NodeJS.ReadableStream) {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

async function claimJob() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query<{ id: string; media_asset_id: string; job_type: string; attempts: number; max_attempts: number }>(`SELECT id, media_asset_id, job_type, attempts, max_attempts FROM media_jobs WHERE status = 'queued' AND available_at <= now() ORDER BY available_at, created_at FOR UPDATE SKIP LOCKED LIMIT 1`);
    const job = result.rows[0];
    if (!job) { await client.query("COMMIT"); return null; }
    await client.query(`UPDATE media_jobs SET status='processing', locked_at=now(), locked_by=$2, attempts=attempts+1, updated_at=now() WHERE id=$1`, [job.id, workerId]);
    await client.query("COMMIT");
    return job;
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}

async function processImage(asset: typeof mediaAssets.$inferSelect) {
  const source = await toBuffer(await storage.read(asset.objectKey));
  const meta = await sharp(source, { failOn: "error" }).metadata();
  if (!meta.width || !meta.height || !["jpeg", "png", "webp", "avif"].includes(meta.format || "")) throw new Error("صيغة الصورة الحقيقية غير مدعومة");
  const variants: Record<string, { key: string; width?: number; height?: number }> = {};
  for (const [name, width] of Object.entries({ thumbnail: 320, grid: 640, medium: 1280, large: 1920 })) {
    const key = `variants/${asset.id}/${name}.webp`;
    if (!(await storage.exists(key))) {
      const output = await sharp(source).rotate().resize({ width, height: name === "thumbnail" ? width : undefined, fit: name === "thumbnail" ? "cover" : "inside", withoutEnlargement: true }).webp({ quality: name === "thumbnail" ? 78 : 84 }).toBuffer();
      await storage.write(key, output, "image/webp");
    }
    variants[name] = { key, width: Math.min(width, meta.width) };
  }
  await db.update(mediaAssets).set({ status: "ready", width: meta.width, height: meta.height, variants, updatedAt: new Date(), errorMessage: null }).where(eq(mediaAssets.id, asset.id));
}

async function inspectVideo(asset: typeof mediaAssets.$inferSelect) {
  const source = await toBuffer(await storage.read(asset.objectKey));
  if (source.subarray(4, 12).toString("ascii").includes("ftyp") === false) throw new Error("الملف ليس فيديو MP4 صالحًا");
  const dir = await mkdtemp(path.join(tmpdir(), "alhinnawi-media-"));
  const input = path.join(dir, "input.mp4"); const poster = path.join(dir, "poster.jpg");
  try {
    await writeFile(input, source);
    const { stdout } = await exec("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=codec_name,width,height:format=duration", "-of", "json", input]);
    const info = JSON.parse(stdout) as { streams?: Array<{ codec_name?: string; width?: number; height?: number }>; format?: { duration?: string } };
    const stream = info.streams?.[0];
    if (!stream || !["h264", "hevc"].includes(stream.codec_name || "")) throw new Error("ترميز الفيديو غير مدعوم. استخدم MP4 بترميز H.264 أو HEVC.");
    await exec("ffmpeg", ["-y", "-ss", "00:00:00.500", "-i", input, "-frames:v", "1", "-vf", "scale='min(1280,iw)':-2", poster]);
    const posterKey = `variants/${asset.id}/poster.jpg`;
    if (!(await storage.exists(posterKey))) await storage.write(posterKey, await readFile(poster), "image/jpeg");
    await db.update(mediaAssets).set({ status: "ready", width: stream.width, height: stream.height, durationMs: Math.round(Number(info.format?.duration || 0) * 1000), variants: { poster: { key: posterKey, width: stream.width, height: stream.height } }, updatedAt: new Date(), errorMessage: null }).where(eq(mediaAssets.id, asset.id));
  } finally { await rm(dir, { recursive: true, force: true }); }
}

async function runJob(job: NonNullable<Awaited<ReturnType<typeof claimJob>>>) {
  const [asset] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, job.media_asset_id)).limit(1);
  if (!asset) throw new Error("الوسيط المرتبط بالمهمة غير موجود");
  if (asset.status === "ready") return;
  if (job.job_type === "process_image") await processImage(asset); else if (job.job_type === "inspect_video") await inspectVideo(asset); else throw new Error("نوع مهمة غير معروف");
}

async function main() {
  console.info(`Media worker started: ${workerId}`);
  while (!stopping) {
    const job = await claimJob();
    if (!job) { await new Promise((resolve) => setTimeout(resolve, 2_000)); continue; }
    try {
      await runJob(job);
      await db.update(mediaJobs).set({ status: "completed", completedAt: new Date(), lockedAt: null, lockedBy: null, updatedAt: new Date() }).where(eq(mediaJobs.id, job.id));
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 2000) : "خطأ معالجة غير معروف";
      const terminal = job.attempts + 1 >= job.max_attempts;
      await db.update(mediaJobs).set({ status: terminal ? "failed" : "queued", lastError: message, availableAt: new Date(Date.now() + 30_000 * (job.attempts + 1)), lockedAt: null, lockedBy: null, updatedAt: new Date() }).where(eq(mediaJobs.id, job.id));
      if (terminal) await db.update(mediaAssets).set({ status: "failed", errorMessage: message, updatedAt: new Date() }).where(eq(mediaAssets.id, job.media_asset_id));
    }
  }
  await pool.end();
}

process.on("SIGTERM", () => { stopping = true; });
process.on("SIGINT", () => { stopping = true; });
main().catch((error) => { console.error(error); process.exitCode = 1; });
