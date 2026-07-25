"use client";

import { ArrowRight, MessageCircle } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { BeforeAfter } from "@/components/media/before-after";
import { ShareButton } from "@/components/public/share-button";
import { AnalyticsLink } from "@/components/public/analytics-link";

type Item = { id: string; itemType: "image" | "video" | "before_after"; primaryUrl: string; secondaryUrl: string | null; posterUrl: string | null; altText: string; caption: string | null };

export function ProjectViewer({ project, whatsappUrl }: { project: { title: string; summary: string | null; location: string | null; projectYear: number | null; items: Item[] }; whatsappUrl?: string | null }) {
  const router = useRouter();
  return <main id="main" className="viewer">
    <div className="viewer-top"><button className="icon-button" onClick={() => router.back()} aria-label="العودة"><ArrowRight size={20} /></button><ShareButton title={project.title} /></div>
    <div className="media-stage" aria-label="وسائط المشروع">{project.items.map((item) => <section className="media-slide" key={item.id}>
      {item.itemType === "video" ? <video src={item.primaryUrl} poster={item.posterUrl ?? undefined} controls playsInline muted preload="metadata" aria-label={item.altText} /> : item.itemType === "before_after" && item.secondaryUrl ? <BeforeAfter before={item.primaryUrl} after={item.secondaryUrl} alt={item.altText} /> : <Image src={item.primaryUrl} alt={item.altText} fill sizes="100vw" unoptimized />}
    </section>)}</div>
    <div className="viewer-caption"><h1>{project.title}</h1><p>{[project.location, project.projectYear, project.summary].filter(Boolean).join(" · ")}</p></div>
    {whatsappUrl && <AnalyticsLink href={whatsappUrl} eventType="whatsapp_click" className="button button-primary viewer-cta"><MessageCircle size={19} />اطلب تنفيذًا مشابهًا</AnalyticsLink>}
  </main>;
}
