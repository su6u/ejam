import { DashboardCard } from "@/components/dashboard-card";
import { DecorIcon } from "@/components/decor-icon";
import { predictorHeaderStripClass } from "@/components/app-layout";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const RESULTS_DESCRIPTION =
  "Programs matched to your rank, have fun exploring!";

export function ResultsCardShell({
  children,
  headerExtra,
  toolbar,
  footer,
  contentClassName,
  description = RESULTS_DESCRIPTION,
}: {
  children: React.ReactNode;
  headerExtra?: React.ReactNode;
  toolbar?: React.ReactNode;
  footer?: React.ReactNode;
  contentClassName?: string;
  description?: string | null;
}) {
  return (
    <DashboardCard
      className={cn("relative h-full min-h-0 gap-0 overflow-visible py-0")}
    >
      <DecorIcon position="top-left" />
      <DecorIcon position="top-right" />
      <DecorIcon position="bottom-left" />
      <DecorIcon position="bottom-right" />
      <CardHeader
        className={cn(
          "relative shrink-0 overflow-visible rounded-none border-b px-4 pt-4 pb-4",
          predictorHeaderStripClass,
        )}
      >
        <DecorIcon position="bottom-left" />
        <DecorIcon position="bottom-right" />
        <div className="flex flex-row items-center justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <CardTitle>Prediction results</CardTitle>
            {description ? (
              <CardDescription>{description}</CardDescription>
            ) : null}
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
