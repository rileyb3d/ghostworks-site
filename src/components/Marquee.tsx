"use client";

import { motion } from "framer-motion";

const phrases = [
  "Award winning",
  "World-class creative",
  "3D production",
  "Brand storytelling",
  "Cinematic",
];

export function Marquee() {
  return (
    <section className="border-y border-white/5 py-6">
      <div className="flex overflow-hidden">
        <motion.div
          className="flex shrink-0 gap-16 pr-16"
          animate={{ x: [0, -1920] }}
          transition={{
            x: {
              repeat: Infinity,
              repeatType: "loop",
              duration: 30,
              ease: "linear",
            },
          }}
        >
          {[...phrases, ...phrases].map((text, i) => (
            <span
              key={i}
              className="whitespace-nowrap font-display text-lg font-medium tracking-wider text-zinc-600"
            >
              {text}
            </span>
          ))}
        </motion.div>
        <motion.div
          className="flex shrink-0 gap-16 pr-16"
          aria-hidden
          animate={{ x: [0, -1920] }}
          transition={{
            x: {
              repeat: Infinity,
              repeatType: "loop",
              duration: 30,
              ease: "linear",
            },
          }}
        >
          {[...phrases, ...phrases].map((text, i) => (
            <span
              key={i}
              className="whitespace-nowrap font-display text-lg font-medium tracking-wider text-zinc-600"
            >
              {text}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
