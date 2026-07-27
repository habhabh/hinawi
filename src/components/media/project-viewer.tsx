"use client";

import { ArrowRight, MessageCircle, Pause, Play, Volume2, VolumeX } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BeforeAfter } from "@/components/media/before-after";
import { ShareButton } from "@/components/public/share-button";
import { AnalyticsLink } from "@/components/public/analytics-link";

type Item = { id: string; itemType: "image" | "video" | "before_after"; primaryUrl: string; secondaryUrl: string | null; posterUrl: string | null; altText: string; caption: string | null };

export function ProjectViewer({ project, whatsappUrl }: { project: { title: string; summary: string | null; location: string | null; projectYear: number | null; items: Item[] }; whatsappUrl?: string | null }) {
  const router = useRouter();
  const stageRef = useRef<HTMLDivElement>(null);
  const videosRef = useRef(new Map<string, HTMLVideoElement>());
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(true);
  const activeItem = project.items[activeIndex];

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting || entry.intersectionRatio < 0.6) continue;
        const index = Number((entry.target as HTMLElement).dataset.index);
        setActiveIndex(index);
        setPaused(false);
      }
    }, { root: stage, threshold: [0.6, 0.8] });
    stage.querySelectorAll<HTMLElement>(".media-slide").forEach((slide) => observer.observe(slide));
    return () => observer.disconnect();
  }, [project.items.length]);

  useEffect(() => {
    videosRef.current.forEach((video, itemId) => {
      const isActive = activeItem?.id === itemId;
      video.muted = muted;
      if (isActive && !paused) void video.play().catch(() => undefined);
      else video.pause();
    });
  }, [activeItem?.id, muted, paused]);

  function togglePlayback() {
    if (!activeItem || activeItem.itemType !== "video") return;
    const video = videosRef.current.get(activeItem.id);
    if (!video) return;
    if (video.paused) {
      setPaused(false);
      void video.play().catch(() => undefined);
    } else {
      video.pause();
      setPaused(true);
    }
  }

  return <main id="main" className="viewer">
    <div className="viewer-top"><button className="icon-button" onClick={() => router.back()} aria-label="العودة"><ArrowRight size={20} /></button><ShareButton title={project.title} /></div>
    <div ref={stageRef} className="media-stage" aria-label="وسائط المشروع">{project.items.map((item, index) => <section className="media-slide" data-index={index} key={item.id}>
      {item.itemType === "video" ? <video
        ref={(video) => { if (video) videosRef.current.set(item.id, video); else videosRef.current.delete(item.id); }}
        src={item.primaryUrl}
        poster={item.posterUrl ?? undefined}
        autoPlay={index === 0}
        loop
        playsInline
        muted={muted}
        preload={index === 0 ? "auto" : "metadata"}
        aria-label={`${item.altText}، اضغط للتشغيل أو الإيقاف`}
        tabIndex={0}
        onClick={togglePlayback}
        onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); togglePlayback(); } }}
      /> : item.itemType === "before_after" && item.secondaryUrl ? <BeforeAfter before={item.primaryUrl} after={item.secondaryUrl} alt={item.altText} /> : <Image src={item.primaryUrl} alt={item.altText} fill sizes="100vw" unoptimized />}
    </section>)}</div>
    {project.items.length > 1 && <div className="viewer-counter" aria-live="polite">{activeIndex + 1} / {project.items.length}</div>}
    {activeItem?.itemType === "video" && <div className="viewer-media-controls">
      <button type="button" className="icon-button" onClick={togglePlayback} aria-label={paused ? "تشغيل الفيديو" : "إيقاف الفيديو"}>{paused ? <Play size={20} fill="currentColor" /> : <Pause size={20} fill="currentColor" />}</button>
      <button type="button" className="icon-button" onClick={() => setMuted((value) => !value)} aria-label={muted ? "تشغيل الصوت" : "كتم الصوت"}>{muted ? <VolumeX size={20} /> : <Volume2 size={20} />}</button>
    </div>}
    <div className="viewer-caption"><h1>{project.title}</h1><p>{[project.location, project.projectYear, project.summary].filter(Boolean).join(" · ")}</p></div>
    {whatsappUrl && <AnalyticsLink href={whatsappUrl} eventType="whatsapp_click" className="button button-primary viewer-cta"><MessageCircle size={19} />اطلب تنفيذًا مشابهًا</AnalyticsLink>}
  </main>;
}
