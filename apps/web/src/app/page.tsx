import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import {
  appChromeStripClass,
  homePageContainerClass,
  stickyGlassChromeClass,
} from "@/components/app-layout";
import { HomeFolderGrid } from "@/components/home-folder-grid";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "ejam",
  description: "Open tools for exam prep and admissions.",
};

export default function ToolsHub() {
  return (
    <div className="flex min-h-svh flex-col">
      <div
        className={cn(
          appChromeStripClass,
          stickyGlassChromeClass,
          "sticky top-0 z-50 h-auto min-h-14 w-full border-b-0 pt-4 md:pt-6",
        )}
      >
        <div
          className={cn(
            homePageContainerClass,
            "flex h-full items-center justify-between gap-4",
          )}
        >
          <Link
            href="/"
            aria-label="Ejam home"
            className="flex shrink-0 items-center"
          >
            <Image
              src="/identity/logo.svg"
              alt=""
              width={116}
              height={92}
              priority
              aria-hidden
              className="h-6 w-auto"
            />
          </Link>
          <AppHeader />
        </div>
      </div>
      <main
        className={cn(
          homePageContainerClass,
          "flex flex-1 flex-col items-center justify-center py-12 md:py-16",
        )}
      >
        <HomeFolderGrid />
      </main>
    </div>
  );
}
