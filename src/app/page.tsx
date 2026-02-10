import { HeroReel } from "@/components/HeroReel";
import { Marquee } from "@/components/Marquee";
import { ProjectGrid } from "@/components/ProjectGrid";
import { getAllProjects } from "@/lib/projects";

export default function Home() {
  const allProjects = getAllProjects();
  const featured = allProjects.find((p) => p.featured) ?? allProjects[0];
  const rest = allProjects.filter((p) => p.slug !== featured.slug);

  return (
    <div className="min-h-screen">
      {/* Full-screen hero with video */}
      <section className="relative">
        <HeroReel project={featured} />
      </section>

      {/* Section divider */}
      <SectionDivider label="Selected Work" count={allProjects.length} />

      {/* Asymmetric project grid */}
      <ProjectGrid projects={rest} />

      {/* Marquee */}
      <Marquee />
    </div>
  );
}

function SectionDivider({ label, count }: { label: string; count: number }) {
  return (
    <div className="mx-auto max-w-7xl px-8 pt-32 pb-16 lg:px-16">
      <div className="flex items-end justify-between border-b border-white/[0.06] pb-8">
        <div className="flex items-center gap-6">
          <span className="font-display text-xs font-medium uppercase tracking-[0.4em] text-zinc-500">
            {label}
          </span>
        </div>
        <span className="hidden text-sm tabular-nums text-zinc-700 md:block">
          ({String(count).padStart(2, "0")})
        </span>
      </div>
    </div>
  );
}
