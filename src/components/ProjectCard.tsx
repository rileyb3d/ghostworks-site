"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, useEffect } from "react";
import { motion, useInView } from "framer-motion";
import type { Project } from "@/lib/projects";

type ProjectCardProps = {
  project: Project;
  index: number;
};

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

export function ProjectCard({ project, index }: ProjectCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const isInView = useInView(cardRef, { once: true, margin: "-80px" });

  useEffect(() => {
    if (!videoRef.current) return;
    if (isHovered) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [isHovered]);

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : undefined}
      transition={{
        duration: 0.7,
        delay: Math.min(index * 0.08, 0.3),
        ease: EASE_OUT,
      }}
    >
      <Link
        href={`/${project.slug}`}
        className="group block"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <article>
          <div className="relative aspect-[4/3] overflow-hidden bg-zinc-950">
            <Image
              src={project.thumbnailUrl}
              alt={project.title}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className={`object-cover transition-transform duration-[900ms] ease-out ${
                isHovered ? "scale-[1.04]" : "scale-100"
              }`}
            />
            {project.videoUrl ? (
              <video
                ref={videoRef}
                src={project.videoUrl}
                muted
                loop
                playsInline
                poster={project.thumbnailUrl}
                className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
                  isHovered ? "opacity-100" : "opacity-0"
                }`}
              />
            ) : null}
            <div
              className={`absolute inset-0 transition-colors duration-500 ${
                isHovered ? "bg-black/15" : "bg-transparent"
              }`}
            />
          </div>

          <div className="mt-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-xl font-semibold tracking-tight text-white md:text-2xl">
                <span className="relative inline-block">
                  {project.title}
                  <span
                    className={`absolute -bottom-1 left-0 h-px bg-white transition-all duration-500 ${
                      isHovered ? "w-full" : "w-0"
                    }`}
                  />
                </span>
              </h2>
              {project.client ? (
                <p className="mt-1.5 text-sm text-zinc-500">{project.client}</p>
              ) : null}
            </div>
            <span className="mt-1 shrink-0 text-sm tabular-nums text-zinc-500">
              {project.year}
            </span>
          </div>
        </article>
      </Link>
    </motion.div>
  );
}
