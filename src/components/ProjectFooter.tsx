"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { getAllProjects } from "@/lib/projects";

type ProjectFooterProps = {
  currentSlug: string;
};

export function ProjectFooter({ currentSlug }: ProjectFooterProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const projects = getAllProjects();
  const currentIndex = projects.findIndex((p) => p.slug === currentSlug);
  const next = projects[(currentIndex + 1) % projects.length];

  return (
    <footer ref={ref} className="border-t border-white/[0.06]">
      <div className="mx-auto max-w-7xl px-8 py-24 lg:px-16">
        <motion.p
          className="mb-4 text-xs uppercase tracking-[0.4em] text-zinc-600"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          Next Project
        </motion.p>

        <Link
          href={`/${next.slug}`}
          className="group relative block"
          data-cursor="view"
          data-cursor-text="View"
        >
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div className="flex items-end justify-between">
              <h2 className="font-display text-4xl font-bold tracking-tight text-white md:text-6xl lg:text-7xl">
                <span className="relative">
                  {next.title}
                  <span className="absolute -bottom-2 left-0 h-px w-0 bg-white/50 transition-all duration-700 group-hover:w-full" />
                </span>
              </h2>
              <span className="hidden text-sm text-zinc-600 md:block">{next.year}</span>
            </div>
          </motion.div>
        </Link>

        <motion.div
          className="mt-16"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <Link
            href="/"
            className="text-sm tracking-wider text-zinc-600 transition-colors hover:text-white"
            data-cursor="pointer"
          >
            View all work
          </Link>
        </motion.div>
      </div>
    </footer>
  );
}
