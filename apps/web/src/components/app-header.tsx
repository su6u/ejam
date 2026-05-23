import { BookOpenIcon } from "lucide-react";
import Image from "next/image";
import GitHubStars from "@/components/github-stars";
import { cn } from "@/lib/utils";

const headerPillClass = cn(
  "inline-flex h-9 items-center gap-2 rounded-none border border-border bg-background px-3 text-xs font-medium text-foreground shadow-none",
  "transition-[opacity,scale,background-color] hover:bg-muted hover:opacity-90 active:scale-[0.96]",
);

export function AppHeader() {
  return (
    <header
      className={cn(
        "sticky top-0 z-50 flex h-14 shrink-0 items-center justify-end gap-2 border-b px-4 md:px-6",
        "bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/50",
      )}
    >
      <a
        href="https://github.com/su6u/ejam#readme"
        target="_blank"
        rel="noopener noreferrer"
        className={headerPillClass}
        aria-label="Documentation"
      >
        <BookOpenIcon aria-hidden className="size-4 shrink-0" />
        Docs
      </a>
      <a
        href="https://github.com/su6u/ejam"
        target="_blank"
        rel="noopener noreferrer"
        className={headerPillClass}
        aria-label="GitHub repository"
      >
        <Image
          src="/icons/GitHub.svg"
          alt=""
          width={16}
          height={16}
          aria-hidden
          className="shrink-0 invert"
        />
        <GitHubStars className="text-xs" countClassName="text-xs" />
      </a>
    </header>
  );
}
