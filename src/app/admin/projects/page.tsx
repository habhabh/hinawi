import Link from "next/link";
import { ProjectForm } from "@/components/admin/create-forms";
import { adminLists } from "@/db/queries/admin";

const statusLabel = { draft: "مسودة", published: "منشور", archived: "مؤرشف" };

export default async function ProjectsPage() {
  const rows = await adminLists.projects();
  return <><h1>المشاريع</h1><p className="muted">المشروع مركزي ويمكن ربطه بعدة بائعين وأقسام وإضافة وسائطه من شاشة التحرير.</p><ProjectForm /><div className="table-wrap list-table"><table><thead><tr><th>العنوان</th><th>الحالة</th><th>آخر تحديث</th><th>الإجراءات</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td>{row.title}</td><td>{statusLabel[row.status]}</td><td>{row.updatedAt.toLocaleDateString("ar-SA")}</td><td className="table-actions"><Link className="button button-small" href={`/admin/projects/${row.id}`}>تعديل وربط</Link><Link href={`/works/${row.slug}`} target="_blank">معاينة</Link></td></tr>)}</tbody></table></div></>;
}
