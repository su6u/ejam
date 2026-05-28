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
import { type AppIdentity, ejamIdentity } from "@/lib/identity";
import { cn } from "@/lib/utils";

export function AppShell({
  children,
  identity = ejamIdentity,
}: {
  children: React.ReactNode;
  identity?: AppIdentity;
}) {
  return (
    <Suspense fallback={null}>
      <PredictorProvider>
        <SidebarProvider>
          <AppSidebar identity={identity} />
          <SidebarInset className="flex min-h-svh flex-col">
            <div
              className={cn(
                appChromeStripClass,
                appHeaderGutterClass,
                "sticky top-0 z-50 w-full",
                stickyGlassChromeClass,
              )}
            >
              <AppHeader className="w-full" />
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
