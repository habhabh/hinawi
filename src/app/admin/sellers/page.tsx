import Link from "next/link";
import { SellerForm } from "@/components/admin/create-forms";
import { adminLists } from "@/db/queries/admin";

export default async function SellersPage() {
  const rows = await adminLists.sellers();
  return <><h1>البائعون</h1><p className="muted">أنشئ البائع ثم افتح التحرير لتعديل صفحته وربط الأقسام والمشاريع والصورة.</p><SellerForm /><div className="table-wrap list-table"><table><thead><tr><th>الاسم</th><th>المسمى</th><th>الفرع</th><th>الحالة</th><th>الإجراءات</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td>{row.name}</td><td>{row.jobTitle || "—"}</td><td>{row.branch || "—"}</td><td>{row.isActive ? "نشط" : "معطل"}</td><td className="table-actions"><Link className="button button-small" href={`/admin/sellers/${row.id}`}>تعديل وربط</Link><Link href={`/s/${row.slug}`} target="_blank">معاينة</Link></td></tr>)}</tbody></table></div></>;
}
