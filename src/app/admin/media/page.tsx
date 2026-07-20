import { adminLists } from "@/db/queries/admin";
import { MediaUploader } from "@/components/admin/media-uploader";
export default async function MediaPage() { const rows = await adminLists.media(); return <><h1>مكتبة الوسائط</h1><MediaUploader /><div className="table-wrap" style={{ marginTop: "1rem" }}><table><thead><tr><th>الملف</th><th>النوع</th><th>الحالة</th><th>الحجم</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td>{row.originalName}</td><td>{row.type}</td><td>{row.status}</td><td>{Math.round(row.sizeBytes / 1024)} KB</td></tr>)}</tbody></table></div></>; }
