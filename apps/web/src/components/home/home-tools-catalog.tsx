import { ToolFolderRow } from "@/components/home/tool-folder-row";
import { TOOL_CATALOG_GROUPS } from "@/lib/tools-catalog";
import { cn } from "@/lib/utils";

export function HomeToolsCatalog({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "theme-scrollbar -mx-2 flex min-h-0 flex-1 flex-col overflow-y-auto px-2",
        className,
      )}
    >
      <div className="flex flex-col gap-4 pt-3">
        {TOOL_CATALOG_GROUPS.map((group) => (
          <section
            key={group.id}
            aria-labelledby={`tool-group-${group.id}`}
            className={cn(
              "flex flex-col gap-2",
              group.id === "medical" && "mt-10 md:mt-12",
            )}
          >
            <h2
              id={`tool-group-${group.id}`}
              className="-translate-y-2 font-mono text-[9px] font-medium leading-none tracking-[0.14em] text-[#2e2e2e]/45 uppercase"
            >
              {group.label}
            </h2>
            <ToolFolderRow tools={group.tools} />
          </section>
        ))}
      </div>
    </div>
  );
}
