"use client";

import Image from "next/image";
import Link from "next/link";
import { pressableClass } from "@/lib/pressable";
import { cn } from "@/lib/utils";

const breadcrumb = ["Engineering", "Tools"] as const;

function FolderIcon() {
  return (
    <Image
      src="/media/folder.png"
      alt=""
      width={176}
      height={144}
      aria-hidden
      className="h-[5.5rem] w-auto select-none"
      draggable={false}
    />
  );
}

export function HomeFolderGrid({ className }: { className?: string }) {
  return (
    <div
      className={cn("home-folders flex flex-col items-center gap-8", className)}
    >
      <nav
        aria-label="Category"
        className="home-folder-item flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm"
      >
        {breadcrumb.map((segment, index) => (
          <span key={segment} className="inline-flex items-center gap-2">
            {index > 0 ? (
              <span
                aria-hidden
                className="text-muted-foreground/40 select-none"
              >
                /
              </span>
            ) : null}
            <span
              className={cn(
                "text-pretty",
                index === breadcrumb.length - 1
                  ? "font-medium text-foreground"
                  : "text-muted-foreground",
              )}
            >
              {segment}
            </span>
          </span>
        ))}
      </nav>

      <Link
        href="/college-predictor"
        className={cn(
          "home-folder-item flex min-h-28 min-w-28 flex-col items-center gap-2.5 px-3 py-2 outline-none",
          pressableClass,
          "rounded-lg focus-visible:ring-2 focus-visible:ring-ring",
        )}
        style={{ animationDelay: "50ms" }}
      >
        <FolderIcon />
        <span className="max-w-[6.75rem] text-pretty text-center text-sm leading-snug font-medium text-foreground">
          College Predictor
        </span>
      </Link>
    </div>
  );
}
