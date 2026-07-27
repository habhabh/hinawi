import { DeleteMediaForm } from "@/components/admin/delete-media-form";
import { MediaUploader } from "@/components/admin/media-uploader";
import { adminLists } from "@/db/queries/admin";

export default async function MediaPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string; deleteError?: string; busy?: string }>;
}) {
  const [rows, query] = await Promise.all([adminLists.media(), searchParams]);
  return (
    <>
      <h1>مكتبة الوسائط</h1>
      {query.deleted === "1" && (
        <p className="save-notice" role="status">
          تم حذف الوسيط وجميع نسخه من R2 وتحديث المشاريع المرتبطة.
        </p>
      )}
      {query.deleteError === "1" && (
        <p className="save-notice save-notice-error" role="alert">
          تعذر حذف بعض ملفات R2. بقي السجل مؤرشفًا؛ اضغط حذف نهائي مرة أخرى لإكمال العملية.
        </p>
      )}
      {query.busy === "1" && (
        <p className="save-notice save-notice-error" role="alert">
          الوسيط قيد الرفع أو المعالجة الآن. انتظر اكتمال المعالجة ثم أعد الحذف.
        </p>
      )}
      <MediaUploader />
      <div className="table-wrap" style={{ marginTop: "1rem" }}>
        <table>
          <thead>
            <tr>
              <th>الملف</th>
              <th>النوع</th>
              <th>الحالة</th>
              <th>الحجم</th>
              <th>إجراء</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.originalName}</td>
                <td>{row.type === "image" ? "صورة" : "فيديو"}</td>
                <td>{row.status}</td>
                <td>{Math.round(row.sizeBytes / 1024)} KB</td>
                <td>
                  <DeleteMediaForm id={row.id} name={row.originalName} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
