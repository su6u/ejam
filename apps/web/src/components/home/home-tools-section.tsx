import { homeCardsRowClass } from "@/components/app-layout";
import Link from "next/link";
import { ToolCardGrid, type ToolCardItem } from "@/components/ui/tools-card";
import { homeCardPillClass } from "@/lib/pressable";
import { cn } from "@/lib/utils";

const HOME_TOOL_CARDS: ToolCardItem[] = [
  {
    name: "College Predictor",
    breadcrumb: "engineering / tools",
    href: "/college-predictor",
    img: "/media/magic-cat.png",
    cardClassName:
      "border-transparent bg-[#191919] shadow-[var(--shadow-border)]",
    pill: {
      label: "visit site",
      iconSrc: "/icons/magic.svg",
    },
  },
  {
    name: "Scholarship Finder",
    breadcrumb: "generic / tools",
    img: "/media/hat.png",
    imgClassName:
      "translate-x-1.5 -translate-y-1.5 sm:translate-x-2 sm:-translate-y-2",
    cardClassName:
      "border-transparent bg-[#191919] shadow-[var(--shadow-border)]",
    pill: {
      label: "soon",
      iconSrc: "/icons/magic.svg",
    },
  },
];

export function HomeToolsSection() {
  return (
    <div
      className={cn("home-enter-item", homeCardsRowClass)}
      style={{ animationDelay: "120ms" }}
    >
      <ToolCardGrid
        compact
        className="grid-cols-2 gap-2.5"
        items={HOME_TOOL_CARDS}
        renderPillLink={(href, children) => (
          <Link
            href={href}
            prefetch
            aria-label="Visit College Predictor"
            className={homeCardPillClass}
          >
            {children}
          </Link>
        )}
      />
    </div>
  );
}
