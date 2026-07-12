import { BarChart3, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';

export function DiversityPage() {
  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Diversity Metrics"
        description="Record and track workforce diversity metrics by department and period"
      />
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
          <BarChart3 size={40} strokeWidth={1.5} />
          <p className="text-sm">Diversity metrics management is coming up next.</p>
          <span className="flex items-center gap-1 text-xs"><Loader2 size={12} className="animate-spin" /> Building…</span>
        </CardContent>
      </Card>
    </div>
  );
}
