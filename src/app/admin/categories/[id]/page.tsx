import Link from "next/link";
import { notFound } from "next/navigation";
import { CategoryEditForm } from "@/components/admin/edit-forms";
import { getCategoryEditor } from "@/db/queries/admin";

export default async function CategoryEditorPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const data = await getCategoryEditor(id);
  if (!data) notFound();
  return <><div className="page-title"><div><span className="eyebrow">تحرير القسم</span><h1>{data.category.name}</h1></div><Link className="button" href="/admin/categories">العودة للأقسام</Link></div>{query.saved === "1" && <p className="save-notice" role="status">تم حفظ القسم وتحديث الواجهة.</p>}<CategoryEditForm data={data} /></>;
}
