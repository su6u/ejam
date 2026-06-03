import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { HomeTagline } from "@/components/home-tagline";
import { homePageContainerClass } from "@/components/app-layout";
import { pressableClass } from "@/lib/pressable";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "ejam",
  description: "Open-source tools for students around Indian exams",
};

export default function ToolsHub() {
  return (
    <div className="home-page flex min-h-svh flex-col bg-[#F6FBFF]">
      <div className="sticky top-0 z-50 h-auto min-h-14 w-full bg-[#F6FBFF] pt-8 pb-3 md:pt-10 md:pb-4">
        <div
          className={cn(
            homePageContainerClass,
            "flex h-full items-center justify-between gap-4",
          )}
        >
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
          <div className="home-enter-item" style={{ animationDelay: "40ms" }}>
            <AppHeader variant="home" />
          </div>
        </div>
      </div>
      <main
        className={cn(
          homePageContainerClass,
          "flex flex-1 flex-col items-center pt-16 pb-12 text-center md:pt-20 md:pb-16",
        )}
      >
        <HomeTagline />
      </main>
    </div>
  );
}
