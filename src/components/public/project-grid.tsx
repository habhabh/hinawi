import { Images, Play } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

type Project = { id: string; slug: string; title: string; coverUrl?: string | null; coverType?: string | null; itemCount?: number };

export function ProjectGrid({ projects, advisor }: { projects: Project[]; advisor?: string }) {
  if (!projects.length) return <div className="empty"><strong>لا توجد أعمال منشورة هنا بعد</strong><p>ستظهر المشاريع الجديدة في هذا القسم فور نشرها.</p></div>;
  return <div className="project-grid" role="list">{projects.map((project) => {
    const href = `/works/${project.slug}${advisor ? `?advisor=${encodeURIComponent(advisor)}` : ""}`;
    return <Link key={project.id} href={href} className="project-tile" role="listitem" aria-label={`فتح مشروع ${project.title}`} scroll>
      {project.coverUrl ? <Image src={project.coverUrl} alt={project.title} fill sizes="(max-width: 864px) 33vw, 288px" unoptimized /> : <div className="tile-placeholder">{project.title}</div>}
      <span className="tile-badges" aria-hidden>{project.coverType === "video" && <Play size={17} fill="currentColor" />}{(project.itemCount ?? 0) > 1 && <Images size={17} />}</span>
    </Link>;
  })}</div>;
}
