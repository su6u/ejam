import { homeCardsRowClass } from "@/components/app-layout";
import { TOOL_REQUEST_ISSUE_URL } from "@/lib/github";
import { cn } from "@/lib/utils";

export function HomeRequestTool() {
  return (
    <div className={cn(homeCardsRowClass, "text-center")}>
      <p className="font-instrument-sans text-pretty text-[0.9375rem] leading-[1.55] tracking-normal text-white/45 sm:text-[15px] sm:text-base">
        There is only one tool shipped so far. If you need something that isn&apos;t here yet, I&apos;d love to hear what would help
        <a
          href={TOOL_REQUEST_ISSUE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "relative inline-flex min-h-10 items-center text-[0.9375rem] font-medium leading-[1.55] text-white/80 transition-[color,transform] duration-150 ease-out sm:text-[15px]",
            "after:absolute after:-inset-x-2 after:-inset-y-1.5 after:content-['']",
            "active:scale-[0.96] motion-reduce:active:scale-100",
            "[@media(hover:hover)_and_(pointer:fine)]:hover:text-white",
          )}
        >
          <span className="relative -top-px inline pl-3 pr-2 leading-[1.55] sm:pl-4 sm:pr-3">
            <img
              src="/media/loop.svg"
              alt=""
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2 h-auto w-[calc(100%+4.5rem)] -translate-x-1/2 -translate-y-1/2 opacity-75"
            />
            <span className="relative z-10">Request a tool</span>
          </span>
        </a>
      </p>
    </div>
  );
}
