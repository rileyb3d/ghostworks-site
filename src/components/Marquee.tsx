"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const words = [
  "Direction",
  "Production",
  "Design",
  "Brand",
  "Film",
  "Story",
];

export function Marquee() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const looped = [...words, ...words, ...words, ...words];

  return (
    <section ref={ref} className="overflow-hidden border-t border-white/[0.06] py-24">
      <motion.div
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : undefined}
        transition={{ duration: 0.8 }}
      >
        <div className="flex overflow-hidden whitespace-nowrap">
          <div className="animate-scroll-left flex shrink-0 items-center">
            {looped.map((word, i) => (
              <span
                key={`m-${i}`}
                className="mx-8 flex items-center gap-8 font-display text-5xl font-semibold tracking-tight md:text-7xl"
              >
                <span className={i % 2 === 0 ? "text-white/90" : "text-stroke"}>
                  {word}
                </span>
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white/30" />
              </span>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
}
