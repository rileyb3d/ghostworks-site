"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function Preloader() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 2200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1] }}
        >
          <div className="relative flex flex-col items-center">
            {/* Logo line wipe */}
            <motion.div
              className="overflow-hidden"
              initial={{ width: 0 }}
              animate={{ width: "auto" }}
              transition={{
                duration: 1.0,
                delay: 0.3,
                ease: [0.76, 0, 0.24, 1],
              }}
            >
              <h1 className="whitespace-nowrap font-display text-4xl font-bold tracking-tight text-white md:text-6xl">
                Ghostworks
              </h1>
            </motion.div>

            {/* Underline reveal */}
            <motion.div
              className="mt-4 h-px bg-white/40"
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{
                duration: 0.8,
                delay: 1.0,
                ease: [0.76, 0, 0.24, 1],
              }}
            />

            {/* Tagline */}
            <motion.p
              className="mt-4 text-xs uppercase tracking-[0.4em] text-zinc-500"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.4, duration: 0.5 }}
            >
              Creative Studio
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
