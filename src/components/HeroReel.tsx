"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import type { Project } from "@/lib/projects";

type HeroReelProps = {
  project: Project;
};

export function HeroReel({ project }: HeroReelProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (!videoRef.current) return;
    if (isHovered) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, [isHovered]);

  return (
    <Link
      href={`/${project.slug}`}
      className="group relative block"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative aspect-[21/9] w-full overflow-hidden md:aspect-[3/1]"
      >
        <div className="absolute inset-0 bg-zinc-950" />
        {project.videoUrl ? (
          <>
            <Image
              src={project.thumbnailUrl}
              alt={project.title}
              fill
              sizes="100vw"
              className="object-cover transition-all duration-700 group-hover:scale-105"
              priority
            />
            <video
              ref={videoRef}
              src={project.videoUrl}
              muted
              loop
              playsInline
              poster={project.thumbnailUrl}
              className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-700 group-hover:opacity-100"
            />
          </>
        ) : (
          <Image
            src={project.thumbnailUrl}
            alt={project.title}
            fill
            sizes="100vw"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            priority
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute inset-0 flex items-end p-8 md:p-12 lg:p-16">
          <div className="flex w-full flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              <h2 className="font-display text-4xl font-semibold tracking-tight text-white md:text-6xl lg:text-7xl">
                {project.title}
              </h2>
              <div className="mt-2 flex items-center gap-4 text-sm text-white/70">
                <span>{project.year}</span>
                {project.client && (
                  <>
                    <span className="text-white/40">/</span>
                    <span>{project.client}</span>
                  </>
                )}
              </div>
            </motion.div>
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="hidden shrink-0 text-sm uppercase tracking-[0.3em] text-white/60 transition-all group-hover:text-white sm:block"
            >
              View project
            </motion.span>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
