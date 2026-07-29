import { Badge } from "@/components/ui/badge";

/** Compact labels for dense rows; full type stays on `title`. */
const INSTITUTE_TYPE_SHORT: Record<string, string> = {
  "Government / Autonomous": "Govt·A",
  "Government / Non-Autonomous": "Govt",
  "Government-Aided / Autonomous": "Aided·A",
  "Government-Aided / Non-Autonomous": "Aided",
  "Un-Aided / Autonomous": "Unaided·A",
  "Un-Aided / Non-Autonomous": "Unaided",
  "University / Autonomous": "Univ·A",
  "University / Non-Autonomous": "Univ",
  "University Department / Non-Autonomous": "Dept",
  "University Managed / Autonomous": "Univ Mgd·A",
  "University Managed (Un-Aided) / Non-Autonomous": "Univ Mgd",
  "Deemed University / Autonomous": "Deemed·A",
};

export function shortInstituteTypeLabel(type: string): string {
  return INSTITUTE_TYPE_SHORT[type] ?? type;
}

export function InstituteTypeBadge({ type }: { type: string }) {
  const label = shortInstituteTypeLabel(type);
  return (
    <Badge
      variant="outline"
      title={type}
      className="shrink-0 rounded-none font-mono text-[10px] text-muted-foreground"
    >
      {label}
    </Badge>
  );
}
