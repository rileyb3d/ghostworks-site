import { HeroReel } from "@/components/HeroReel";
import { HeroPlaceholder } from "@/components/HeroPlaceholder";
import { Marquee } from "@/components/Marquee";
import { ProjectGrid } from "@/components/ProjectGrid";
import { getAllProjects } from "@/lib/projects";

export default function Home() {
  const allProjects = getAllProjects();
  const featured = allProjects.find((p) => p.featured) ?? allProjects[0];
  const rest = featured
    ? allProjects.filter((p) => p.slug !== featured.slug)
    : [];

  return (
    <div className="min-h-screen">
      {featured ? <HeroReel project={featured} /> : <HeroPlaceholder />}

      {allProjects.length > 0 && (
        <>
          <SectionDivider label="Selected Work" count={allProjects.length} />
          <ProjectGrid projects={rest} />
        </>
      )}

      <Marquee />
    </div>
  );
}

function SectionDivider({ label, count }: { label: string; count: number }) {
  return (
    <div className="mx-auto max-w-7xl px-8 pt-28 pb-12 lg:px-16">
      <div className="flex items-end justify-between border-b border-white/[0.06] pb-6">
        <span className="font-display text-xs font-medium uppercase tracking-[0.4em] text-zinc-500">
          {label}
        </span>
        <span className="text-sm tabular-nums text-zinc-600">
          ({String(count).padStart(2, "0")})
        </span>
      </div>
    </div>
  );
}
