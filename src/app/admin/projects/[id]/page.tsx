import Link from "next/link";
import { notFound } from "next/navigation";
import { ProjectEditForm } from "@/components/admin/edit-forms";
import { getProjectEditor } from "@/db/queries/admin";

export default async function ProjectEditorPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const data = await getProjectEditor(id);
  if (!data) notFound();
  return <><div className="page-title"><div><span className="eyebrow">تحرير المشروع وربطه</span><h1>{data.project.title}</h1></div><Link className="button" href="/admin/projects">العودة للمشاريع</Link></div>{query.saved === "1" && <p className="save-notice" role="status">تم حفظ المشروع وعلاقاته ووسائطه وتحديث الواجهة.</p>}<ProjectEditForm data={data} /></>;
}
