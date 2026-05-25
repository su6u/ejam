import { DashboardCard } from "@/components/dashboard-card";
import { DecorIcon } from "@/components/decor-icon";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function ResultsCardShell({
  children,
  headerExtra,
  toolbar,
  footer,
  contentClassName,
}: {
  children: React.ReactNode;
  headerExtra?: React.ReactNode;
  toolbar?: React.ReactNode;
  footer?: React.ReactNode;
  contentClassName?: string;
}) {
  return (
    <DashboardCard
      className={cn("relative h-full min-h-0 gap-0 overflow-visible py-0")}
    >
      <DecorIcon position="top-left" />
      <DecorIcon position="top-right" />
      <DecorIcon position="bottom-left" />
      <DecorIcon position="bottom-right" />
      <CardHeader className="relative shrink-0 overflow-visible rounded-none border-b px-4 pt-4 pb-4">
        <DecorIcon position="bottom-left" />
        <DecorIcon position="bottom-right" />
        <div className="flex flex-row items-end justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <CardTitle>Prediction results</CardTitle>
            <CardDescription>
              Ranked by chance, strongest programs first within each band.
            </CardDescription>
          </div>
          {headerExtra}
        </div>
        {toolbar ? (
          <div className="mt-3 border-t border-border pt-3">{toolbar}</div>
        ) : null}
      </CardHeader>
      <CardContent
        className={cn(
          "flex min-h-0 flex-1 flex-col px-0 py-0",
          contentClassName,
        )}
      >
        {children}
      </CardContent>
      {footer}
    </DashboardCard>
  );
}
