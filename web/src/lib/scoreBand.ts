export function scoreBand(score: number): 'danger' | 'warning' | 'good' | 'strong' {
  if (score < 40) return 'danger';
  if (score < 70) return 'warning';
  if (score < 85) return 'good';
  return 'strong';
}

export function scoreBandColor(score: number): string {
  const band = scoreBand(score);
  switch (band) {
    case 'danger': return 'hsl(var(--danger))';
    case 'warning': return 'hsl(var(--warning))';
    case 'good': return 'hsl(var(--pillar-environmental))';
    case 'strong': return 'hsl(var(--primary))';
  }
}
