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
import { cn } from "@/lib/utils";

export function AppSidebar() {
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
                  href="/"
                  aria-label="Ejam home"
                  className="flex items-center"
                >
                  <Image
                    src="/brand/logo.svg"
                    alt=""
                    width={116}
                    height={92}
                    priority
                    aria-hidden
                    className="h-6 w-auto shrink-0"
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
