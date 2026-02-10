"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const words = [
  "Ghostworks",
  "Creative",
  "Production",
  "Cinematic",
  "Ghostworks",
  "Creative",
  "Production",
  "Cinematic",
];

export function Marquee() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <section ref={ref} className="overflow-hidden py-20 md:py-32">
      <motion.div
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : {}}
        transition={{ duration: 1 }}
      >
        {/* Row 1 — right to left */}
        <div className="mb-4 flex overflow-hidden whitespace-nowrap">
          <div className="animate-scroll-left flex shrink-0">
            {[...words, ...words].map((word, i) => (
              <span
                key={`a-${i}`}
                className={`mx-4 font-display text-6xl font-bold md:mx-8 md:text-8xl lg:text-9xl ${
                  i % 2 === 0
                    ? "text-stroke"
                    : "text-white/[0.03]"
                }`}
              >
                {word}
              </span>
            ))}
          </div>
        </div>

        {/* Row 2 — left to right (reversed) */}
        <div className="flex overflow-hidden whitespace-nowrap">
          <div
            className="animate-scroll-left flex shrink-0"
            style={{ animationDirection: "reverse", animationDuration: "50s" }}
          >
            {[...words, ...words].map((word, i) => (
              <span
                key={`b-${i}`}
                className={`mx-4 font-display text-6xl font-bold md:mx-8 md:text-8xl lg:text-9xl ${
                  i % 2 === 1
                    ? "text-stroke"
                    : "text-white/[0.03]"
                }`}
              >
                {word}
              </span>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
}
