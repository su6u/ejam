import { cn } from "@/lib/utils";

/** one horizontal gutter for main content */
const appContentGutterClass = "px-4 md:px-6";

/** home page content column — navbar and body share one width */
export const homePageContainerClass = "mx-auto w-full max-w-3xl px-4 md:px-6";

/** tools catalog inner column — same box as HomeTagline (pair with items-center wrapper) */
export const homeHeroColumnClass =
  "w-full max-w-[24rem] -ml-1.5 md:max-w-[28rem] md:-ml-2";

/** header logo — matches catalog column left edge when tagline stays centered */
export const homeLogoAlignClass =
  "ml-[calc((100%-min(100%,24rem))/2+1.25rem-0.375rem)] md:ml-[calc((100%-min(100%,28rem))/2+1.75rem-0.5rem)]";

/** header actions — inset left from catalog column right edge */
export const homeHeaderActionsAlignClass =
  "mr-[max(0px,calc((100%-min(100%,24rem))/2-1.25rem+0.375rem+0.75rem))] md:mr-[max(0px,calc((100%-min(100%,28rem))/2-1.75rem+0.5rem+1rem))]";

/** frosted sticky chrome — navbar, table headers, etc. */
export const stickyGlassChromeClass =
  "bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/50";

/** sticky table thead — blur on thead, tint on cells so rows scroll beneath */
export const stickyGlassTableHeaderClass =
  "sticky top-0 z-10 backdrop-blur-sm [&_th]:bg-background/95 supports-backdrop-filter:[&_th]:bg-background/50";

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
