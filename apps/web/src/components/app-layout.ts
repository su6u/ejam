import { cn } from "@/lib/utils";

/** shared centered column — header and main content */
export const appWrapperClass = "mx-auto w-full max-w-(--app-wrapper-max-width)";

/** one horizontal gutter for main content */
export const appContentGutterClass = "px-4 md:px-6";

/** header right gutter includes the dashboard 1px frame so actions sit on the card edge */
export const appHeaderGutterClass =
  "pl-4 pr-[calc(1rem+1px)] md:pl-6 md:pr-[calc(1.5rem+1px)]";

export function appShellLayoutClass(className?: string) {
  return cn(
    appWrapperClass,
    "flex min-h-full w-full flex-1 flex-col",
    className,
  );
}

export function appShellContentClass(className?: string) {
  return cn(appContentGutterClass, "flex flex-1 flex-col py-4 md:py-6", className);
}
