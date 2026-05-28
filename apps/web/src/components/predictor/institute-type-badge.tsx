import { Badge } from "@/components/ui/badge";

export function InstituteTypeBadge({ type }: { type: string }) {
  return (
    <Badge
      variant="outline"
      className="rounded-none font-mono text-[10px] text-muted-foreground"
    >
      {type}
    </Badge>
  );
}
