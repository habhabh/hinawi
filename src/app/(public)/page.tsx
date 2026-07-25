import { ArrowLeft, Layers3, Sparkles } from "lucide-react";
import Link from "next/link";
import { Brand } from "@/components/shared/brand";
import { getRandomPublishedProject, listActiveSellers, listPublicCategories, listPublicProjects, publicCounts } from "@/db/queries/public";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [sellers, categories, projects, counts, randomProject] = await Promise.all([listActiveSellers(), listPublicCategories(), listPublicProjects(6), publicCounts(), getRandomPublishedProject()]);
  const businessJsonLd = { "@context": "https://schema.org", "@type": "LocalBusiness", name: "الحناوي للديكور", url: process.env.APP_URL || "http://localhost:3000" };
  return <main id="main" className="app-shell">
    <header className="topbar"><Brand /><Link className="button" href="/works">كل الأعمال <ArrowLeft size={17} /></Link></header>
    <section className="hero"><span className="eyebrow">تصميم يُفصّل على حياتك</span><h1>مساحات هادئة، وخزائن مصنوعة لتبقى.</h1><p>استكشف مجموعة منتقاة من أعمال الحناوي، وتواصل مباشرة مع مستشار التصميم الذي يناسب مشروعك.</p><div style={{ display: "flex", justifyContent: "center", gap: ".6rem", flexWrap: "wrap" }}><Link className="button button-primary" href={randomProject ? `/works/${randomProject.slug}` : "/works"}>ابدأ الاستكشاف <Sparkles size={18} /></Link><Link className="button" href="/works">مكتبة المشاريع <Layers3 size={18} /></Link></div></section>
    <section className="card-list" aria-label="إحصاءات المكتبة"><article className="card"><span className="muted">مشروع منشور</span><h2>{counts.projects}</h2></article><article className="card"><span className="muted">مستشار متاح</span><h2>{counts.sellers}</h2></article><article className="card"><span className="muted">تخصصات التصميم</span><h2>{categories.length}</h2></article></section>
    <div className="section-heading"><h2>مستشارو التصميم</h2></div><section className="card-list">{sellers.map((seller) => <Link className="card" href={`/s/${seller.slug}`} key={seller.id}><span className="eyebrow">{seller.jobTitle}</span><h3>{seller.name}</h3><span className="muted">{seller.branch || "معرض الحناوي"}</span></Link>)}</section>
    <div className="section-heading"><h2>أحدث الأعمال</h2><Link href="/works">عرض الكل</Link></div><section className="card-list">{projects.map((project) => <Link className="card" href={`/works/${project.slug}`} key={project.id}><h3>{project.title}</h3><p className="muted">{project.summary || "تفاصيل مختارة من تنفيذ الحناوي"}</p></Link>)}</section>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(businessJsonLd).replace(/</g, "\\u003c") }} />
  </main>;
}
