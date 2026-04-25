"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import type { Project } from "@/lib/projects";

type HeroReelProps = {
  project: Project;
};

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

export function HeroReel({ project }: HeroReelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoReady, setVideoReady] = useState(false);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const imageY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const overlayOpacity = useTransform(scrollYProgress, [0, 0.8], [0.35, 0.85]);
  const titleY = useTransform(scrollYProgress, [0, 1], [0, -40]);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.play().catch(() => {});
  }, []);

  return (
    <div ref={containerRef} className="relative h-[100vh] overflow-hidden">
      <Link
        href={`/${project.slug}`}
        className="group absolute inset-0 block"
        aria-label={`Open project: ${project.title}`}
      >
        <motion.div className="absolute inset-0" style={{ y: imageY }}>
          <Image
            src={project.thumbnailUrl}
            alt={project.title}
            fill
            sizes="100vw"
            className={`object-cover transition-opacity duration-700 ${
              videoReady ? "opacity-0" : "opacity-100"
            }`}
            priority
          />
          {project.videoUrl && (
            <video
              ref={videoRef}
              src={project.videoUrl}
              muted
              loop
              playsInline
              onCanPlay={() => setVideoReady(true)}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
                videoReady ? "opacity-100" : "opacity-0"
              }`}
            />
          )}
        </motion.div>

        <motion.div
          className="absolute inset-0 bg-black"
          style={{ opacity: overlayOpacity }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent" />

        <div className="absolute inset-0 flex items-end">
          <motion.div
            className="w-full px-8 pb-16 md:px-16 md:pb-24 lg:px-24"
            style={{ y: titleY }}
          >
            <motion.p
              className="mb-4 font-display text-xs font-medium uppercase tracking-[0.4em] text-white/60"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE_OUT }}
            >
              Featured
            </motion.p>

            <div className="overflow-hidden">
              <motion.h1
                className="font-display text-5xl font-bold tracking-tight text-white md:text-7xl lg:text-8xl"
                initial={{ y: 100 }}
                animate={{ y: 0 }}
                transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.1 }}
              >
                {project.title}
              </motion.h1>
            </div>

            <motion.div
              className="mt-6 flex items-center gap-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <span className="block h-px w-12 bg-white/30" />
              <div className="flex items-center gap-4 text-sm text-white/70">
                <span>{project.year}</span>
                {project.client && (
                  <>
                    <span className="text-white/30">—</span>
                    <span>{project.client}</span>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        </div>

        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          <motion.div
            className="flex flex-col items-center gap-2"
            animate={{ y: [0, 6, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          >
            <span className="text-[10px] uppercase tracking-[0.3em] text-white/40">
              Scroll
            </span>
            <div className="h-8 w-px bg-gradient-to-b from-white/40 to-transparent" />
          </motion.div>
        </motion.div>
      </Link>
    </div>
  );
}
