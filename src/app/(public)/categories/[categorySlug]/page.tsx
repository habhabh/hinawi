import { notFound } from "next/navigation";
import Link from "next/link";
import { Brand } from "@/components/shared/brand";
import { getCategoryPage, getSettings } from "@/db/queries/public";

export const dynamic = "force-dynamic";
export default async function CategoryPage({ params }: { params: Promise<{ categorySlug: string }> }) {
  const [{ categorySlug }, settings] = await Promise.all([params, getSettings()]);
  if (!settings.publicCategoryPagesEnabled) notFound();
  const data = await getCategoryPage(categorySlug); if (!data) notFound();
  return <main id="main" className="app-shell"><header className="topbar"><Brand /></header><section className="page-wrap"><span className="eyebrow">قسم الأعمال</span><h1>{data.category.name}</h1><p className="muted">{data.category.description}</p><div className="card-list" style={{ padding: "1rem 0" }}>{data.projects.map((project) => <Link className="card" href={`/works/${project.slug}`} key={project.id}><h2>{project.title}</h2><p className="muted">{project.summary}</p></Link>)}</div></section></main>;
}
