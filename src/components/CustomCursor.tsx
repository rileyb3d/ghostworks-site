"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export function CustomCursor() {
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  const [cursorVariant, setCursorVariant] = useState("default");
  const [cursorText, setCursorText] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const rafRef = useRef<number>(0);

  const springConfig = { damping: 30, stiffness: 400, mass: 0.5 };
  const x = useSpring(cursorX, springConfig);
  const y = useSpring(cursorY, springConfig);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
      if (!isVisible) setIsVisible(true);
    };

    const onLeave = () => setIsVisible(false);
    const onEnter = () => setIsVisible(true);

    const onMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const interactable = target.closest("[data-cursor]");
      if (interactable) {
        const variant = interactable.getAttribute("data-cursor") || "pointer";
        const text = interactable.getAttribute("data-cursor-text") || "";
        setCursorVariant(variant);
        setCursorText(text);
      }
    };

    const onMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const interactable = target.closest("[data-cursor]");
      if (interactable) {
        setCursorVariant("default");
        setCursorText("");
      }
    };

    window.addEventListener("mousemove", onMove);
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("mouseenter", onEnter);
    document.addEventListener("mouseover", onMouseOver);
    document.addEventListener("mouseout", onMouseOut);

    return () => {
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("mouseenter", onEnter);
      document.removeEventListener("mouseover", onMouseOver);
      document.removeEventListener("mouseout", onMouseOut);
      cancelAnimationFrame(rafRef.current);
    };
  }, [cursorX, cursorY, isVisible]);

  const variants: Record<string, { width: number; height: number; backgroundColor: string }> = {
    default: {
      width: 12,
      height: 12,
      backgroundColor: "rgba(255,255,255,0.9)",
    },
    pointer: {
      width: 48,
      height: 48,
      backgroundColor: "rgba(255,255,255,0.15)",
    },
    play: {
      width: 96,
      height: 96,
      backgroundColor: "rgba(255,255,255,0.95)",
    },
    view: {
      width: 80,
      height: 80,
      backgroundColor: "rgba(255,255,255,0.95)",
    },
  };

  return (
    <>
      {/* Dot */}
      <motion.div
        className="pointer-events-none fixed left-0 top-0 z-[10000] hidden rounded-full mix-blend-difference md:block"
        style={{ x, y, translateX: "-50%", translateY: "-50%" }}
        animate={{
          ...variants[cursorVariant],
          opacity: isVisible ? 1 : 0,
        }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        {cursorText && (
          <span className="flex h-full w-full items-center justify-center text-xs font-medium uppercase tracking-wider text-black">
            {cursorText}
          </span>
        )}
      </motion.div>
    </>
  );
}
