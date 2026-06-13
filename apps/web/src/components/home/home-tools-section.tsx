import Link from "next/link";
import { ToolCardGrid, type ToolCardItem } from "@/components/ui/tools-card";

const HOME_TOOL_CARDS: ToolCardItem[] = [
  {
    name: "College Predictor",
    href: "/college-predictor",
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
        renderLink={(href, children) => <Link href={href}>{children}</Link>}
      />
    </div>
  );
}
