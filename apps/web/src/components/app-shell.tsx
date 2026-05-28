"use client";

import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import {
  appChromeStripClass,
  appHeaderGutterClass,
  appShellContentClass,
  appShellLayoutClass,
  stickyGlassChromeClass,
} from "@/components/app-layout";
import { AppSidebar } from "@/components/app-sidebar";
import { PredictorProvider } from "@/components/predictor/predictor-context";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <PredictorProvider>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset className="flex min-h-svh flex-col">
            <div
              className={cn(
                appChromeStripClass,
                appHeaderGutterClass,
                "sticky top-0 z-50 w-full",
                stickyGlassChromeClass,
              )}
            >
              <AppHeader />
            </div>
            <div className={cn(appShellLayoutClass(), "min-h-0 flex-1")}>
              <div className={appShellContentClass()}>{children}</div>
            </div>
          </SidebarInset>
        </SidebarProvider>
      </PredictorProvider>
    </Suspense>
  );
}
