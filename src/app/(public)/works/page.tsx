import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Brand } from "@/components/shared/brand";
import { getSettings, listPublicProjects } from "@/db/queries/public";
import { absoluteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "مكتبة المشاريع", alternates: { canonical: absoluteUrl("/works") } };

export default async function WorksPage() {
  const [settings, projects] = await Promise.all([getSettings(), listPublicProjects()]);
  if (!settings.publicProjectsDirectoryEnabled) notFound();
  return <main id="main" className="app-shell"><header className="topbar"><Brand /><span className="muted">{projects.length} مشروع</span></header><section className="page-wrap"><span className="eyebrow">مكتبة الحناوي</span><h1>أعمال صُممت بعناية</h1><p className="muted">تصفح المشاريع المنشورة، وافتح أي مشروع لمشاهدة تفاصيله ووسائطه.</p><div className="card-list" style={{ padding: "1rem 0" }}>{projects.map((project) => <Link className="card" href={`/works/${project.slug}`} key={project.id}><h2>{project.title}</h2><p className="muted">{project.summary}</p></Link>)}</div></section></main>;
}
