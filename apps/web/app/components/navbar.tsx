"use client";

import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import GitHubStars from "./github-stars";

const NAV_ITEMS = [
  { label: "Docs", href: "#" },
  { label: "Sponsor", href: "#" },
] as const;

const PILL_TEXT = "oklch(15% 0.005 260)";

export function Navbar() {
  return (
    <header
      className="fixed top-0 left-0 right-0 pointer-events-none"
      style={{ zIndex: "var(--z-navbar)" }}
    >
      <div className="mx-auto max-w-[1100px] px-6 py-5 flex items-center justify-between">

        <Link
          href="/"
          className="pointer-events-auto p-1 rounded-md"
          aria-label="ejam home"
        >
          <Image
            src="/logo.svg"
            alt="ejam"
            width={118}
            height={89}
            className="h-9 w-auto shrink-0"
            priority
            style={{
              outline: "1px solid rgba(255,255,255,0.1)",
              outlineOffset: "-1px",
              borderRadius: 5,
            }}
          />
        </Link>

        {/* Pill group */}
        <nav
          className="pointer-events-auto flex items-center"
          aria-label="Main navigation"
        >
          {/* GitHub stars pill */}
          <motion.a
            href="https://github.com/su6u/ejam"
            target="_blank"
            rel="noopener noreferrer"
            whileTap={{ scale: 0.96 }}
            className="nav-pill inline-flex items-center gap-2 h-9 pl-3 pr-4
              bg-white rounded-full
              hover:opacity-85"
            style={{
              color: PILL_TEXT,
              transitionProperty: "opacity",
              transitionDuration: "150ms",
              transitionTimingFunction: "ease-out",
            }}
            aria-label="GitHub repository"
          >
            <Image
              src="/icons/github.svg"
              alt=""
              width={16}
              height={16}
              className="shrink-0"
              aria-hidden
            />
            <GitHubStars
              className="text-[13px]"
              countClassName="text-[13px]"
            />
          </motion.a>

          {/* Docs + Sponsor */}
          {NAV_ITEMS.map((item) => (
            <motion.a
              key={item.label}
              href={item.href}
              whileTap={{ scale: 0.96 }}
              className="nav-pill inline-flex items-center h-9 px-5
                bg-white rounded-full
                text-[13px] font-semibold tracking-tight
                hover:opacity-85"
              style={{
                color: PILL_TEXT,
                transitionProperty: "opacity",
                transitionDuration: "150ms",
                transitionTimingFunction: "ease-out",
              }}
            >
              {item.label}
            </motion.a>
          ))}
        </nav>
      </div>
    </header>
  );
}
