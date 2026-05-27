import { cn } from "@/lib/utils";

/** one horizontal gutter for main content */
export const appContentGutterClass = "px-4 md:px-6";

/** h-14 top chrome — sidebar logo row and main header actions share one strip height */
export const appChromeStripClass =
  "flex h-14 shrink-0 items-center border-b border-border";

/** header right gutter includes the dashboard 1px frame so actions sit on the card edge */
export const appHeaderGutterClass =
  "pl-4 pr-[calc(1rem+1px)] md:pl-6 md:pr-[calc(1.5rem+1px)]";

/** top inset below h-14 chrome — pairs sidebar exam grid with main card header */
export const sidebarPanelTopInsetClass = "pt-[26px]";

/** title strip height — exam picker row and results card header (pt-4 + title + pb-4) */
export const predictorHeaderStripClass = "min-h-[55px]";

export function appShellLayoutClass(className?: string) {
  return cn("flex min-h-0 w-full min-w-0 flex-1 flex-col", className);
}

export function appShellContentClass(className?: string) {
  return cn(
    appContentGutterClass,
    "flex min-h-0 w-full min-w-0 flex-1 flex-col py-4 md:py-6",
    className,
  );
}
