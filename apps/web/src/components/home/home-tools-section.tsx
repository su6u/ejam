import Link from "next/link";
import { ToolCardGrid, type ToolCardItem } from "@/components/ui/tools-card";
import { homeCardPillClass } from "@/lib/pressable";

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
];

export function HomeToolsSection() {
  return (
    <div
      className="home-enter-item mx-auto w-full max-w-[calc((100%-0.75rem)/2)]"
      style={{ animationDelay: "120ms" }}
    >
      <ToolCardGrid
        compact
        className="grid-cols-1 gap-3"
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
