"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { RevealText } from "@/components/RevealText";
import type { Project } from "@/lib/projects";

type ProjectDetailProps = {
  project: Project;
};

export function ProjectDetail({ project }: ProjectDetailProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <div ref={ref} className="mx-auto max-w-4xl px-8 py-20 md:py-32 lg:px-16">
      {/* Back link */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : {}}
        transition={{ duration: 0.5 }}
      >
        <Link
          href="/"
          className="group mb-16 inline-flex items-center gap-3 text-sm tracking-wider text-zinc-600 transition-colors hover:text-white"
          data-cursor="pointer"
        >
          <motion.span
            className="inline-block"
            whileHover={{ x: -4 }}
            transition={{ duration: 0.2 }}
          >
            ←
          </motion.span>
          Back to Work
        </Link>
      </motion.div>

      {/* Title */}
      <h1 className="font-display text-5xl font-bold tracking-tight text-white md:text-6xl lg:text-7xl">
        <RevealText>{project.title}</RevealText>
      </h1>

      {/* Meta */}
      <motion.div
        className="mt-8 flex flex-wrap gap-x-10 gap-y-4"
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-[0.3em] text-zinc-600">
            Year
          </p>
          <p className="text-sm text-zinc-300">{project.year}</p>
        </div>
        {project.client && (
          <div>
            <p className="mb-1 text-[10px] uppercase tracking-[0.3em] text-zinc-600">
              Client
            </p>
            <p className="text-sm text-zinc-300">{project.client}</p>
          </div>
        )}
      </motion.div>

      {/* Divider */}
      <motion.div
        className="my-16 h-px bg-white/[0.06]"
        initial={{ scaleX: 0 }}
        animate={isInView ? { scaleX: 1 } : {}}
        transition={{ delay: 0.4, duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
        style={{ transformOrigin: "left" }}
      />

      {/* Description */}
      {project.description && (
        <motion.p
          className="max-w-2xl text-lg leading-relaxed text-zinc-400 md:text-xl md:leading-relaxed"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          {project.description}
        </motion.p>
      )}
    </div>
  );
}
