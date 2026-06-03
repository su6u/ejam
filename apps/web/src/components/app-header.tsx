import { LayoutGridIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import GitHubStars from "@/components/github-stars";
import { headerPillClass, homeHeaderPillClass } from "@/lib/pressable";
import { cn } from "@/lib/utils";

export function AppHeader({
  className,
  showToolsLink = false,
  variant = "default",
}: {
  className?: string;
  showToolsLink?: boolean;
  variant?: "default" | "home";
}) {
  const pillClass = variant === "home" ? homeHeaderPillClass : headerPillClass;
  const homeIconClass = "shrink-0 brightness-0 invert";

  return (
    <header
      className={cn(
        "flex shrink-0 items-center justify-end",
        variant === "home" ? "gap-2" : "gap-2",
        className,
      )}
    >
      {showToolsLink ? (
        <Link href="/" className={pillClass}>
          <LayoutGridIcon aria-hidden className="size-4 shrink-0" />
          Tools
        </Link>
      ) : null}
      <a
        href="https://github.com/su6u/ejam#readme"
        target="_blank"
        rel="noopener noreferrer"
        className={pillClass}
        aria-label="Documentation"
      >
        <Image
          src="/icons/docs.svg"
          alt=""
          width={variant === "home" ? 16 : 20}
          height={variant === "home" ? 16 : 20}
          aria-hidden
          className={cn(
            variant === "home" ? "size-4" : "size-5",
            "shrink-0",
            variant === "home" && homeIconClass,
          )}
        />
        Docs
      </a>
      <a
        href="https://github.com/su6u/ejam"
        target="_blank"
        rel="noopener noreferrer"
        className={pillClass}
      >
        <Image
          src="/icons/github.svg"
          alt=""
          width={variant === "home" ? 14 : 16}
          height={variant === "home" ? 14 : 16}
          aria-hidden
          className={cn(
            variant === "home" ? "size-3.5" : "size-4",
            "shrink-0",
            variant === "home" && homeIconClass,
          )}
        />
        <GitHubStars
          className="text-xs"
          countClassName={cn(
            "text-xs font-medium",
            variant === "home" && "text-[#ffffff]",
          )}
          starsLabelClassName={
            variant === "home"
              ? "font-normal text-[#f0f0f0]"
              : undefined
          }
          skeletonClassName={
            variant === "home" ? "bg-white/35" : undefined
          }
        />
      </a>
    </header>
  );
}
