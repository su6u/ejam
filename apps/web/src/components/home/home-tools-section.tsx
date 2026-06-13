"use client";

import Link from "next/link";
import { ToolsCards, type ToolsCard } from "@/components/ui/tools-card";

const HOME_TOOL_CARDS: ToolsCard[] = [
  {
    name: "College Predictor",
    description:
      "",
    href: "/college-predictor",
  },
];

export function HomeToolsSection() {
  return (
    <ToolsCards
      compact
      className="home-enter-item mx-auto grid w-full max-w-[calc((100%-0.75rem)/2)] grid-cols-1 gap-3"
      items={HOME_TOOL_CARDS}
      renderLink={(href, children) => <Link href={href}>{children}</Link>}
    />
  );
}
