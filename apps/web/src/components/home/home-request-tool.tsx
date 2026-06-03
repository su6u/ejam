import { ArrowUpRightIcon } from "lucide-react";
import Link from "next/link";
import { pressableClass } from "@/lib/pressable";
import { toolRequestIssueUrl } from "@/lib/tool-request-issue";
import { cn } from "@/lib/utils";

export function HomeRequestTool({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <section
      aria-labelledby="home-request-tool-label"
      className={cn("flex flex-col gap-1.5", className)}
      style={style}
    >
      <h2
        id="home-request-tool-label"
        className="mb-1.5 font-mono text-[9px] font-medium leading-none tracking-[0.14em] text-[#2e2e2e]/45 uppercase"
      >
        Missing something?
      </h2>
      <p className="font-instrument-sans text-[13px] leading-snug tracking-[-0.01em] text-[#2e2e2e]/70">
        Wish a <span className="font-serif-display italic">tool</span> existed?{" "}
        Tell me what — if I find the time, I&apos;ll try to build it :)
      </p>
      <Link
        href={toolRequestIssueUrl()}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "group/request mt-0.5 inline-flex w-fit items-center gap-1 font-instrument-sans text-[13px] font-medium tracking-[-0.01em] text-[#2e2e2e]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2e2e2e]/20 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F6FBFF]",
          pressableClass,
        )}
      >
        <span className="border-b border-[#2e2e2e]/25 pb-px transition-colors duration-150 ease-out group-hover/request:border-[#2e2e2e]/60">
          Request a tool
        </span>
        <ArrowUpRightIcon
          aria-hidden
          className="size-3.5 shrink-0 translate-y-px transition-transform duration-150 ease-out group-hover/request:translate-x-0.5 group-hover/request:-translate-y-0.5"
        />
      </Link>
    </section>
  );
}
