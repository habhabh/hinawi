import type { Metadata } from "next";
import { Grid3X3, PanelsTopLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProjectGrid } from "@/components/public/project-grid";
import { SellerProfile } from "@/components/public/seller-profile";
import { ShareButton } from "@/components/public/share-button";
import { Brand } from "@/components/shared/brand";
import { getSellerPage, getSettings } from "@/db/queries/public";
import { absoluteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ sellerSlug: string }>; searchParams: Promise<{ category?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { sellerSlug } = await params;
  const data = await getSellerPage(sellerSlug);
  if (!data) return { robots: { index: false, follow: false } };
  return { title: data.seller.seoTitle || `أعمال ${data.seller.name}`, description: data.seller.seoDescription || data.seller.bio, alternates: { canonical: absoluteUrl(`/s/${sellerSlug}`) }, openGraph: { type: "profile", title: `أعمال ${data.seller.name}` } };
}

export default async function SellerPage({ params, searchParams }: Props) {
  const [{ sellerSlug }, query, settings] = await Promise.all([params, searchParams, getSettings()]);
  const data = await getSellerPage(sellerSlug, query.category);
  if (!data) notFound();
  const personJsonLd = { "@context": "https://schema.org", "@type": "Person", name: data.seller.name, jobTitle: data.seller.jobTitle, worksFor: { "@type": "Organization", name: settings.companyName }, url: absoluteUrl(`/s/${sellerSlug}`) };
  return <main id="main" className="app-shell">
    <header className="topbar"><Brand /><ShareButton title={`أعمال ${data.seller.name}`} /></header>
    <SellerProfile seller={data.seller} companyName={settings.companyName} />
    <nav className="highlights" aria-label="أقسام الأعمال"><Link className={`highlight ${!query.category ? "active" : ""}`} href={`/s/${sellerSlug}`}><span className="highlight-circle"><Grid3X3 size={23} /></span><span>الكل</span></Link>{data.categories.map((category) => <Link key={category.id} className={`highlight ${query.category === category.slug ? "active" : ""}`} href={`/s/${sellerSlug}?category=${category.slug}`}><span className="highlight-circle"><PanelsTopLeft size={23} /></span><span>{category.name}</span></Link>)}</nav>
    <div className="section-heading"><h2>{query.category ? data.categories.find((c) => c.slug === query.category)?.name : "كل الأعمال"}</h2><span className="muted">{data.projects.length} مشروع</span></div>
    <ProjectGrid projects={data.projects} advisor={sellerSlug} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd).replace(/</g, "\\u003c") }} />
  </main>;
}
