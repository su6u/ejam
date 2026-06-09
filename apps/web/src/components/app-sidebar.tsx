"use client";

import Image from "next/image";
import Link from "next/link";
import { appChromeStripClass } from "@/components/app-layout";
import { PredictorSidebarPanel } from "@/components/predictor/predictor-sidebar-panel";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { type AppIdentity, ejamIdentity } from "@/lib/identity";
import { cn } from "@/lib/utils";

export function AppSidebar({
  identity = ejamIdentity,
}: {
  identity?: AppIdentity;
}) {
  return (
    <Sidebar
      className={cn(
        "*:data-[slot=sidebar-inner]:bg-background",
        "**:data-[slot=sidebar-menu-button]:[&>span]:text-foreground/75",
      )}
      variant="sidebar"
    >
      <SidebarHeader
        className={cn(appChromeStripClass, "gap-0 p-0 px-2 flex-row")}
      >
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="h-9 hover:bg-transparent active:bg-transparent data-active:bg-transparent"
              render={
                <Link
                  href={identity.homeHref}
                  aria-label={identity.homeAriaLabel}
                  className="flex max-w-full items-center"
                >
                  <Image
                    src={identity.logoSrc}
                    alt=""
                    width={identity.logoWidth}
                    height={identity.logoHeight}
                    priority
                    unoptimized
                    aria-hidden
                    className={cn(
                      "max-w-full w-auto shrink-0",
                      identity.logoDisplayClass ?? "h-6",
                    )}
                  />
                </Link>
              }
            />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="gap-0 p-0">
        <PredictorSidebarPanel />
      </SidebarContent>
    </Sidebar>
  );
}
