import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectViewer } from "@/components/media/project-viewer";
import { getProjectBySlug, getSellerPage, getSettings } from "@/db/queries/public";
import { projectCanonical } from "@/lib/seo";
import { buildWhatsappUrl, interpolateWhatsappMessage } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ projectSlug: string }>; searchParams: Promise<{ advisor?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { projectSlug } = await params;
  const project = await getProjectBySlug(projectSlug);
  if (!project) return { robots: { index: false, follow: false } };
  return {
    title: project.seoTitle || project.title,
    description: project.seoDescription || project.summary,
    alternates: { canonical: projectCanonical(project.slug) },
    openGraph: {
      type: "article",
      title: project.title,
      description: project.summary || undefined,
      images: project.coverUrl ? [project.coverUrl] : undefined,
    },
  };
}

export default async function ProjectPage({ params, searchParams }: Props) {
  const [{ projectSlug }, query, settings] = await Promise.all([params, searchParams, getSettings()]);
  const project = await getProjectBySlug(projectSlug);
  if (!project) notFound();
  const advisor = query.advisor ? await getSellerPage(query.advisor) : null;
  const phone = advisor?.seller.whatsappE164 || settings.generalWhatsappE164;
  const sellerName = advisor?.seller.name;
  const template = sellerName ? "مرحبًا أستاذ/ة {seller_name}، شاهدت مشروع {project_title} وأرغب في تنفيذ مشروع مشابه." : "مرحبًا، شاهدت مشروع {project_title} وأرغب في تنفيذ مشروع مشابه.";
  const whatsappUrl = phone ? buildWhatsappUrl(phone, interpolateWhatsappMessage(template, { sellerName, companyName: settings.companyName, projectTitle: project.title }), `${projectCanonical(project.slug)}${sellerName ? `?advisor=${query.advisor}` : ""}`) : null;
  const jsonLd = { "@context": "https://schema.org", "@type": "CreativeWork", name: project.title, description: project.description || project.summary, url: projectCanonical(project.slug), image: project.coverUrl ? [project.coverUrl] : project.items.filter((i) => i.primaryType === "image").map((i) => i.primaryUrl) };
  return <><ProjectViewer project={project} whatsappUrl={whatsappUrl} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} /></>;
}
