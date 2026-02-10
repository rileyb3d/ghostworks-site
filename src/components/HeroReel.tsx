"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import type { Project } from "@/lib/projects";

type HeroReelProps = {
  project: Project;
};

export function HeroReel({ project }: HeroReelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoReady, setVideoReady] = useState(false);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const imageY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const overlayOpacity = useTransform(scrollYProgress, [0, 0.8], [0.3, 0.9]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.1]);
  const titleY = useTransform(scrollYProgress, [0, 1], [0, -60]);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.play().catch(() => {});
  }, []);

  return (
    <div ref={containerRef} className="relative h-[100vh] overflow-hidden">
      <Link
        href={`/${project.slug}`}
        className="group absolute inset-0 block"
        data-cursor="play"
        data-cursor-text="Play"
      >
        {/* Background media with parallax */}
        <motion.div className="absolute inset-0" style={{ y: imageY, scale }}>
          <Image
            src={project.thumbnailUrl}
            alt={project.title}
            fill
            sizes="100vw"
            className={`object-cover transition-opacity duration-1000 ${
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
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${
                videoReady ? "opacity-100" : "opacity-0"
              }`}
            />
          )}
        </motion.div>

        {/* Dark overlay that increases on scroll */}
        <motion.div
          className="absolute inset-0 bg-black"
          style={{ opacity: overlayOpacity }}
        />

        {/* Gradient from bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent" />

        {/* Content */}
        <div className="absolute inset-0 flex items-end">
          <motion.div
            className="w-full px-8 pb-16 md:px-16 md:pb-24 lg:px-24"
            style={{ y: titleY }}
          >
            <div className="overflow-hidden">
              <motion.p
                className="mb-4 text-xs uppercase tracking-[0.4em] text-white/50"
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 2.4, duration: 0.6, ease: [0.76, 0, 0.24, 1] }}
              >
                Featured
              </motion.p>
            </div>

            <div className="overflow-hidden">
              <motion.h1
                className="font-display text-5xl font-bold tracking-tight text-white md:text-7xl lg:text-8xl xl:text-9xl"
                initial={{ y: 120 }}
                animate={{ y: 0 }}
                transition={{ delay: 2.5, duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
              >
                {project.title}
              </motion.h1>
            </div>

            <div className="mt-6 flex items-center gap-6">
              <motion.div
                className="h-px bg-white/30"
                initial={{ width: 0 }}
                animate={{ width: 60 }}
                transition={{ delay: 3.0, duration: 0.6, ease: [0.76, 0, 0.24, 1] }}
              />
              <motion.div
                className="flex items-center gap-4 text-sm text-white/60"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 3.2, duration: 0.5 }}
              >
                <span>{project.year}</span>
                {project.client && (
                  <>
                    <span className="text-white/30">—</span>
                    <span>{project.client}</span>
                  </>
                )}
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 3.5, duration: 0.5 }}
        >
          <motion.div
            className="flex flex-col items-center gap-2"
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          >
            <span className="text-[10px] uppercase tracking-[0.3em] text-white/30">
              Scroll
            </span>
            <div className="h-8 w-px bg-gradient-to-b from-white/40 to-transparent" />
          </motion.div>
        </motion.div>
      </Link>
    </div>
  );
}
