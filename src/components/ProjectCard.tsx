"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, useEffect } from "react";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import type { Project } from "@/lib/projects";

type ProjectCardProps = {
  project: Project;
  index: number;
  variant?: "large" | "default";
};

export function ProjectCard({
  project,
  index,
  variant = "default",
}: ProjectCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const isInView = useInView(cardRef, { once: true, margin: "-100px" });

  const { scrollYProgress } = useScroll({
    target: imageContainerRef,
    offset: ["start end", "end start"],
  });

  const imageY = useTransform(scrollYProgress, [0, 1], [-30, 30]);

  useEffect(() => {
    if (!videoRef.current) return;
    if (isHovered) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [isHovered]);

  const isLarge = variant === "large";

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 80 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{
        duration: 0.8,
        delay: index * 0.15,
        ease: [0.76, 0, 0.24, 1],
      }}
    >
      <Link
        href={`/${project.slug}`}
        className="group block"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        data-cursor="view"
        data-cursor-text="View"
      >
        <article>
          {/* Image container with parallax */}
          <div
            ref={imageContainerRef}
            className={`relative overflow-hidden bg-zinc-950 ${
              isLarge ? "aspect-[16/10]" : "aspect-[4/3]"
            }`}
          >
            <motion.div
              className="absolute -inset-8"
              style={{ y: imageY }}
            >
              <Image
                src={project.thumbnailUrl}
                alt={project.title}
                fill
                sizes={
                  isLarge
                    ? "(max-width: 768px) 100vw, 66vw"
                    : "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                }
                className={`object-cover transition-all duration-700 ${
                  isHovered ? "scale-105 opacity-0" : "scale-100 opacity-100"
                }`}
              />
              {project.videoUrl && (
                <video
                  ref={videoRef}
                  src={project.videoUrl}
                  muted
                  loop
                  playsInline
                  poster={project.thumbnailUrl}
                  className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
                    isHovered ? "opacity-100" : "opacity-0"
                  }`}
                />
              )}
            </motion.div>

            {/* Hover overlay */}
            <div
              className={`absolute inset-0 bg-black/0 transition-all duration-500 ${
                isHovered ? "bg-black/20" : ""
              }`}
            />
          </div>

          {/* Info */}
          <div className="mt-6 flex items-start justify-between gap-4">
            <div>
              <h2
                className={`font-display font-semibold tracking-tight text-white ${
                  isLarge ? "text-2xl md:text-3xl" : "text-lg md:text-xl"
                }`}
              >
                <span className="relative">
                  {project.title}
                  <span
                    className={`absolute -bottom-1 left-0 h-px bg-white transition-all duration-500 ${
                      isHovered ? "w-full" : "w-0"
                    }`}
                  />
                </span>
              </h2>
              {project.client && (
                <p className="mt-1.5 text-sm text-zinc-600">{project.client}</p>
              )}
            </div>
            <span className="mt-1 shrink-0 text-sm tabular-nums text-zinc-600">
              {project.year}
            </span>
          </div>
        </article>
      </Link>
    </motion.div>
  );
}
