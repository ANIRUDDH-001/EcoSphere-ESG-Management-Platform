import { Trophy, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';

export function LeaderboardPage() {
  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Leaderboard"
        description="See the top-ranking employees based on total sustainability XP."
      />
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
          <Trophy size={40} strokeWidth={1.5} />
          <p className="text-sm">Leaderboard view is coming up next.</p>
          <span className="flex items-center gap-1 text-xs"><Loader2 size={12} className="animate-spin" /> Building…</span>
        </CardContent>
      </Card>
    </div>
  );
}
