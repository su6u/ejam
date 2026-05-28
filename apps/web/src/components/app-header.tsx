import { BookOpenIcon } from "lucide-react";
import Image from "next/image";
import GitHubStars from "@/components/github-stars";
import { headerPillClass } from "@/lib/pressable";
import { cn } from "@/lib/utils";

export function AppHeader({ className }: { className?: string }) {
  return (
    <header
      className={cn("flex shrink-0 items-center justify-end gap-2", className)}
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
        aria-label="View ejam repository on GitHub"
      >
        <Image
          src="/icons/github.svg"
          alt=""
          width={16}
          height={16}
          aria-hidden
          className="image-outline size-4 shrink-0 invert"
        />
        <GitHubStars className="text-xs" countClassName="text-xs" />
      </a>
    </header>
  );
}
