import { CategoryForm } from "@/components/admin/create-forms";
import { adminLists } from "@/db/queries/admin";
export default async function CategoriesPage() { const rows = await adminLists.categories(); return <><h1>الأقسام</h1><CategoryForm /><div className="table-wrap" style={{ marginTop: "1rem" }}><table><thead><tr><th>الاسم</th><th>الرابط</th><th>الحالة</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td>{row.name}</td><td>{row.slug}</td><td>{row.isActive ? "نشط" : "معطل"}</td></tr>)}</tbody></table></div></>; }
