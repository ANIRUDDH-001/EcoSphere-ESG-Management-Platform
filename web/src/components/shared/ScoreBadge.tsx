import { Badge } from "@/components/ui/badge";

export function ScoreBadge({ score, className }: { score: number, className?: string }) {
  let band = "poor";
  if (score >= 80) band = "excellent";
  else if (score >= 60) band = "good";
  else if (score >= 40) band = "average";

  const variants: Record<string, string> = {
    excellent: "bg-[hsl(var(--score-excellent))] text-primary-foreground",
    good: "bg-[hsl(var(--score-good))] text-primary-foreground",
    average: "bg-[hsl(var(--score-average))] text-primary-foreground",
    poor: "bg-[hsl(var(--score-poor))] text-destructive-foreground"
  };

  return (
    <Badge className={`${variants[band]} ${className || ''} hover:${variants[band]}`}>
      {score}
    </Badge>
  );
}
