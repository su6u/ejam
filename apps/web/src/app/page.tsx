import { GraduationCapIcon } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import {
  appChromeStripClass,
  appContentGutterClass,
  appHeaderGutterClass,
} from "@/components/app-layout";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
          appHeaderGutterClass,
          "sticky top-0 z-50 w-full justify-between gap-4",
          "bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/50",
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
      <main
        className={cn(
          appContentGutterClass,
          "mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 py-12 md:py-16",
        )}
      >
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-medium tracking-tight">
            Tools
          </h1>
          <p className="text-sm text-muted-foreground">
            Open-source utilities for JEE and college admissions.
          </p>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2">
          <li>
            <Link
              href="/college-predictor"
              className="block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Card className="h-full transition-colors hover:bg-muted/30">
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <GraduationCapIcon
                      aria-hidden
                      className="mt-0.5 size-5 shrink-0 text-muted-foreground"
                    />
                    <div className="space-y-1">
                      <CardTitle>College Predictor</CardTitle>
                      <CardDescription>
                        Estimate admission chances across JoSAA, CSAB, and JEE
                        Advanced from your rank.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          </li>
        </ul>
      </main>
    </div>
  );
}
