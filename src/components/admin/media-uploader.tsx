"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export function MediaUploader({ projectId, sellerId }: { projectId?: string; sellerId?: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const inputId = `media-file-${projectId ?? sellerId ?? "library"}`;
  const isAvatar = Boolean(sellerId);

  async function waitUntilReady(assetId: string) {
    for (let attempt = 0; attempt < 80; attempt += 1) {
      await wait(1_500);
      const query = projectId
        ? `?projectId=${encodeURIComponent(projectId)}`
        : sellerId
          ? `?sellerId=${encodeURIComponent(sellerId)}`
          : "";
      const response = await fetch(`/api/uploads/status/${assetId}${query}`, { cache: "no-store" });
      if (!response.ok) throw new Error("تعذر متابعة معالجة الملف");
      const result = await response.json();
      if (result.status === "failed") throw new Error(result.error || "فشلت معالجة الملف");
      if (result.status === "ready" && ((!projectId && !sellerId) || result.attached)) return;
    }
    throw new Error("استغرقت المعالجة وقتًا أطول من المتوقع؛ حدّث الصفحة بعد قليل");
  }

  async function upload(file: File) {
    const session = await fetch("/api/uploads/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fileName: file.name, mimeType: file.type, sizeBytes: file.size }),
    });
    const data = await session.json();
    if (!session.ok) throw new Error(data.error || "تعذر بدء الرفع");
    const target = data.driver === "local" ? `/api/uploads/local/${data.assetId}` : data.uploadUrl;
    const uploadResponse = await fetch(target, { method: "PUT", headers: data.headers || { "content-type": file.type }, body: file });
    if (!uploadResponse.ok) throw new Error("تعذر رفع الملف");
    const finalized = await fetch("/api/uploads/finalize", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ assetId: data.assetId, projectId, sellerId }),
    });
    const finalizedData = await finalized.json();
    if (!finalized.ok) throw new Error(finalizedData.error || "تم الرفع لكن تعذر بدء المعالجة");
    await waitUntilReady(data.assetId);
  }

  async function uploadFiles(files: FileList) {
    if (!files.length || uploading) return;
    const selectedFiles = isAvatar ? [files[0]] : Array.from(files);
    setUploading(true);
    setProgress(0);
    try {
      for (let index = 0; index < selectedFiles.length; index += 1) {
        setMessage(`جارٍ رفع ومعالجة ${selectedFiles[index].name} (${index + 1} من ${selectedFiles.length})…`);
        await upload(selectedFiles[index]);
        setProgress(Math.round(((index + 1) / selectedFiles.length) * 100));
      }
      setMessage(sellerId ? "تم تحديث صورة البائع بنجاح." : projectId ? "تمت إضافة الوسائط إلى المشروع تلقائيًا." : "تم رفع الوسائط ومعالجتها بنجاح.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر إكمال رفع الوسائط");
    } finally {
      setUploading(false);
    }
  }

  return <section className="card media-uploader">
    <div><h2>{sellerId ? "صورة البائع" : projectId ? "إضافة وسائط للمشروع" : "رفع وسائط"}</h2><p className="muted">{sellerId ? "ارفع صورة شخصية وستُعالج وتُربط بالبائع تلقائيًا." : projectId ? "اختر عدة صور أو فيديوهات؛ ستُعالج وتُربط بهذا المشروع تلقائيًا." : "يمكنك اختيار عدة صور أو فيديوهات دفعة واحدة."}</p></div>
    <label className={`button button-primary ${uploading ? "button-disabled" : ""}`} htmlFor={inputId}>{uploading ? "جارٍ الرفع والمعالجة…" : sellerId ? "اختيار صورة البائع" : "اختيار صور أو فيديوهات"}</label>
    <input id={inputId} type="file" accept={isAvatar ? "image/jpeg,image/png,image/webp,image/avif" : "image/jpeg,image/png,image/webp,image/avif,video/mp4"} multiple={!isAvatar} hidden disabled={uploading} onChange={(event) => { if (event.target.files) void uploadFiles(event.target.files); event.target.value = ""; }} />
    {progress > 0 && <progress max="100" value={progress} />}
    {message && <p role="status">{message}</p>}
  </section>;
}
