import Link from "next/link";
import { CategoryForm } from "@/components/admin/create-forms";
import { adminLists } from "@/db/queries/admin";

export default async function CategoriesPage() {
  const rows = await adminLists.categories();
  return <><h1>الأقسام</h1><p className="muted">الأقسام ترتبط بالمشاريع والبائعين من صفحات التحرير.</p><CategoryForm /><div className="table-wrap list-table"><table><thead><tr><th>الاسم</th><th>الرابط</th><th>الحالة</th><th>الإجراءات</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td>{row.name}</td><td>{row.slug}</td><td>{row.isActive ? "نشط" : "معطل"}</td><td className="table-actions"><Link className="button button-small" href={`/admin/categories/${row.id}`}>تعديل</Link><Link href={`/categories/${row.slug}`} target="_blank">معاينة</Link></td></tr>)}</tbody></table></div></>;
}
