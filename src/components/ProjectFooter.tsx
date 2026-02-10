"use client";

import Link from "next/link";
import { getAllProjects } from "@/lib/projects";

type ProjectFooterProps = {
  currentSlug: string;
};

export function ProjectFooter({ currentSlug }: ProjectFooterProps) {
  const projects = getAllProjects();
  const currentIndex = projects.findIndex((p) => p.slug === currentSlug);
  const next = projects[currentIndex + 1];
  const prev = projects[currentIndex - 1];

  return (
    <footer className="border-t border-white/10">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <p className="mb-8 text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
          More work
        </p>
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
          {prev ? (
            <Link
              href={`/${prev.slug}`}
              className="group flex items-center gap-2 text-zinc-400 transition-colors hover:text-white"
            >
              <span className="text-zinc-600 transition-colors group-hover:text-white">
                ←
              </span>
              <span>{prev.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link
              href={`/${next.slug}`}
              className="group flex items-center gap-2 text-zinc-400 transition-colors hover:text-white"
            >
              <span>{next.title}</span>
              <span className="text-zinc-600 transition-colors group-hover:text-white">
                →
              </span>
            </Link>
          ) : (
            <span />
          )}
        </div>
        <Link
          href="/"
          className="mt-12 inline-block text-sm text-zinc-500 transition-colors hover:text-white"
        >
          View all work
        </Link>
      </div>
    </footer>
  );
}
