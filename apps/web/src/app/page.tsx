import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import {
  homeHeaderActionsAlignClass,
  homeHeroColumnClass,
  homeLogoAlignClass,
  homePageContainerClass,
} from "@/components/app-layout";
import { HomeRequestTool } from "@/components/home/home-request-tool";
import { HomeToolsCatalog } from "@/components/home/home-tools-catalog";
import { HomeTagline } from "@/components/home-tagline";
import { pressableClass } from "@/lib/pressable";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "ejam",
  description: "Open-source tools for students around Indian exams",
};

export default function ToolsHub() {
  return (
    <div className="home-page flex h-svh flex-col overflow-hidden bg-[#F6FBFF]">
      <div className="sticky top-0 z-50 h-auto min-h-14 w-full bg-[#F6FBFF] pt-8 pb-3 md:pt-10 md:pb-4">
        <div
          className={cn(
            homePageContainerClass,
            "flex h-full items-center justify-between gap-4",
          )}
        >
          <div className={cn(homeLogoAlignClass, "w-fit shrink-0")}>
            <Link
              href="/"
              aria-label="Ejam home"
              className={cn(
                "home-enter-item flex min-h-10 shrink-0 items-center",
                pressableClass,
              )}
            >
              <Image
                src="/identity/logo_dark.png"
                alt=""
                width={116}
                height={32}
                priority
                aria-hidden
                className="h-6 w-auto"
              />
            </Link>
          </div>
          <div
            className={cn(
              "home-enter-item shrink-0",
              homeHeaderActionsAlignClass,
            )}
            style={{ animationDelay: "40ms" }}
          >
            <AppHeader variant="home" />
          </div>
        </div>
      </div>
      <main
        className={cn(
          homePageContainerClass,
          "flex min-h-0 flex-1 flex-col overflow-hidden pb-0",
        )}
      >
        <div className="flex shrink-0 flex-col items-center pt-16 text-center md:pt-20">
          <HomeTagline />
        </div>
        <div className="flex min-h-0 flex-1 flex-col items-center">
          <div
            className={cn(
              homeHeroColumnClass,
              "mt-16 ml-5 flex min-h-0 flex-1 flex-col md:mt-20 md:ml-7",
            )}
          >
            <HomeToolsCatalog className="min-h-0 flex-1" />
            <HomeRequestTool
              className="home-enter-item shrink-0 pt-6 pb-8 md:pt-8 md:pb-10"
              style={{ animationDelay: "560ms" }}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
