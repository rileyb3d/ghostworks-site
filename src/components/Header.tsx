"use client";

import Link from "next/link";
import { useState, useRef } from "react";
import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import { UserButton, useAuth } from "@clerk/nextjs";

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [visible, setVisible] = useState(true);
  const lastScrollRef = useRef(0);
  const { scrollY } = useScroll();
  const { isLoaded, isSignedIn } = useAuth();

  useMotionValueEvent(scrollY, "change", (current) => {
    const diff = current - lastScrollRef.current;
    setScrolled(current > 60);
    if (current < 100) {
      setVisible(true);
    } else if (diff < -5) {
      setVisible(true);
    } else if (diff > 5) {
      setVisible(false);
    }
    lastScrollRef.current = current;
  });

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: visible ? 0 : -100 }}
      transition={{ duration: 0.4, ease: [0.76, 0, 0.24, 1] }}
      className="fixed left-0 right-0 top-0 z-[200]"
    >
      <div
        className={`transition-all duration-500 ${
          scrolled
            ? "bg-black/70 backdrop-blur-2xl"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-8 lg:px-16">
          <Link
            href="/"
            className="font-display text-lg font-bold tracking-tight text-white"
            data-cursor="pointer"
          >
            Ghostworks
          </Link>
          <nav className="flex items-center gap-8">
            <Link
              href="/contact"
              className="group relative text-sm tracking-wider text-zinc-400 transition-colors hover:text-white"
              data-cursor="pointer"
            >
              Contact
              <span className="absolute -bottom-1 left-0 h-px w-0 bg-white transition-all duration-300 group-hover:w-full" />
            </Link>
            {isLoaded && !isSignedIn ? (
              <Link
                href="/sign-in"
                className="group relative text-sm tracking-wider text-zinc-400 transition-colors hover:text-white"
                data-cursor="pointer"
              >
                Sign in
                <span className="absolute -bottom-1 left-0 h-px w-0 bg-white transition-all duration-300 group-hover:w-full" />
              </Link>
            ) : null}
            {isLoaded && isSignedIn ? (
              <>
                <Link
                  href="/account"
                  className="group relative text-sm tracking-wider text-zinc-400 transition-colors hover:text-white"
                  data-cursor="pointer"
                >
                  Account
                  <span className="absolute -bottom-1 left-0 h-px w-0 bg-white transition-all duration-300 group-hover:w-full" />
                </Link>
                <UserButton>
                  <UserButton.MenuItems>
                    <UserButton.Link
                      label="Billing"
                      labelIcon={<BillingIcon />}
                      href="/account"
                    />
                  </UserButton.MenuItems>
                </UserButton>
              </>
            ) : null}
          </nav>
        </div>
      </div>
    </motion.header>
  );
}

function BillingIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
      <path d="M6 15h4" />
    </svg>
  );
}
