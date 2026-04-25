"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

export function HeroPlaceholder() {
  return (
    <div className="relative h-[100vh] overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.04),_transparent_60%)]" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent" />

      <div className="absolute inset-0 flex items-end">
        <div className="w-full px-8 pb-16 md:px-16 md:pb-24 lg:px-24">
          <motion.p
            className="mb-4 font-display text-xs font-medium uppercase tracking-[0.4em] text-white/60"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE_OUT }}
          >
            Ghostworks
          </motion.p>

          <div className="overflow-hidden">
            <motion.h1
              className="font-display text-5xl font-bold tracking-tight text-white md:text-7xl lg:text-8xl"
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.1 }}
            >
              New work, soon.
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
              <span>Currently between projects.</span>
              <span className="text-white/30">—</span>
              <Link
                href="/contact"
                className="underline-offset-4 transition-colors hover:text-white hover:underline"
              >
                Start one with us
              </Link>
            </div>
          </motion.div>
        </div>
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
    </div>
  );
}
