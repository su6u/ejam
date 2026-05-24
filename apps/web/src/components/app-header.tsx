import { BookOpenIcon } from "lucide-react";
import Image from "next/image";
import GitHubStars from "@/components/github-stars";
import { headerPillClass } from "@/lib/pressable";

export function AppHeader() {
  return (
    <header className="flex h-14 items-center justify-end gap-2">
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
          className="size-4 shrink-0 invert"
        />
        <GitHubStars className="text-xs" countClassName="text-xs" />
      </a>
    </header>
  );
}
