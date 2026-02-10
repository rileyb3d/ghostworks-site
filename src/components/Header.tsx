"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [lastScroll, setLastScroll] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      const current = window.scrollY;
      setScrolled(current > 50);
      setVisible(current < lastScroll || current < 100);
      setLastScroll(current);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScroll]);

  return (
    <motion.header
      initial={{ y: 0 }}
      animate={{ y: visible ? 0 : -100 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="fixed left-0 right-0 top-0 z-50"
    >
      <div
        className={`mx-auto flex h-20 max-w-7xl items-center justify-between px-6 transition-colors duration-300 ${
          scrolled ? "border-b border-white/5 bg-black/90 backdrop-blur-xl" : ""
        }`}
      >
        <Link
          href="/"
          className="font-display text-lg font-semibold tracking-tight text-white"
        >
          Ghostworks
        </Link>
        <nav className="flex items-center gap-10">
          <Link
            href="/"
            className="text-sm tracking-wide text-zinc-400 transition-colors hover:text-white"
          >
            Work
          </Link>
        </nav>
      </div>
    </motion.header>
  );
}
