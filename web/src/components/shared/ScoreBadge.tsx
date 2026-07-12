import { Badge } from "@/components/ui/badge";
import { scoreBand } from "@/lib/scoreBand";

export function ScoreBadge({ score, className }: { score: number, className?: string }) {
  const band = scoreBand(score);

  const variants: Record<string, string> = {
    strong: "bg-primary text-primary-foreground hover:bg-primary",
    good: "bg-[hsl(var(--pillar-environmental))] text-primary-foreground hover:bg-[hsl(var(--pillar-environmental))]",
    warning: "bg-warning text-primary-foreground hover:bg-warning",
    danger: "bg-danger text-destructive-foreground hover:bg-danger"
  };

  return (
    <Badge className={`${variants[band]} ${className || ''} tabular-nums`}>
      {score}
    </Badge>
  );
}
