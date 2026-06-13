import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import {
  homeHeaderContainerClass,
  homePageContainerClass,
} from "@/components/app-layout";
import { HomeManifesto } from "@/components/home/home-manifesto";
import { HomeSmoothScroll } from "@/components/home/home-smooth-scroll";
import { HomeToolsSection } from "@/components/home/home-tools-section";
import { HomeTagline } from "@/components/home-tagline";
import { pressableClass } from "@/lib/pressable";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "ejam",
  description: "Open-source tools for students around Indian exams",
};

export default function ToolsHub() {
  return (
    <HomeSmoothScroll>
      <div className="home-page bg-[#191919]">
        <div className="home-hero sticky top-0 z-10 flex h-svh flex-col bg-[#191919]">
          <header className="w-full shrink-0 pt-8 pb-4 md:pt-10 md:pb-5">
            <div className={homeHeaderContainerClass}>
              <Link
                href="/"
                aria-label="Ejam home"
                className={cn(
                  "home-enter-item flex min-h-10 shrink-0 items-center",
                  pressableClass,
                )}
              >
                <Image
                  src="/identity/logo.svg"
                  alt=""
                  width={116}
                  height={92}
                  priority
                  aria-hidden
                  className="h-7 md:h-8"
                  style={{ width: "auto" }}
                />
              </Link>
              <div
                className="home-enter-item shrink-0"
                style={{ animationDelay: "40ms" }}
              >
                <AppHeader variant="home" />
              </div>
            </div>
          </header>
          <main
            className={cn(
              homePageContainerClass,
              "flex min-h-0 flex-1 flex-col",
            )}
          >
            <div className="flex w-full shrink-0 justify-center pt-12 md:pt-16">
              <HomeTagline />
            </div>
            <div className="mt-16 w-full px-4 md:mt-24">
              <HomeToolsSection />
            </div>
          </main>
        </div>
        <HomeManifesto />
      </div>
    </HomeSmoothScroll>
  );
}
