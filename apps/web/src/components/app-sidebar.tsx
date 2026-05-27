"use client";

import Image from "next/image";
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
      <SidebarHeader className="h-14 justify-center border-b px-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="h-9 hover:bg-transparent active:bg-transparent data-active:bg-transparent"
              render={
                <a
                  href="/"
                  aria-label="Ejam home"
                  className="flex items-center"
                >
                  <Image
                    src="/brand/logo.svg"
                    alt=""
                    width={118}
                    height={89}
                    priority
                    aria-hidden
                    className="image-outline size-6 shrink-0 rounded-[5px]"
                  />
                </a>
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
