import { AlertCircle, FileText } from 'lucide-react';
import { useDashboardData } from '../hooks';

export function DashboardPage() {
  const { orgScore, isLoading, isError } = useDashboardData();

  if (isError) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6 flex flex-col items-center justify-center min-h-[400px]">
          <AlertCircle className="h-8 w-8 text-danger mb-4" />
          <h2 className="text-lg font-semibold">Failed to load dashboard</h2>
          <p className="text-sm text-muted-foreground mt-2">There was a problem loading your ESG scores.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-8 animate-pulse">
        <div className="h-8 bg-muted rounded w-48"></div>
        <div className="grid gap-6 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-muted rounded-lg border"></div>
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="h-64 bg-muted rounded-lg border"></div>
          <div className="h-64 bg-muted rounded-lg border"></div>
        </div>
      </div>
    );
  }

  // Empty state logic: if overall score is 0 and no scores exist
  // We infer a fresh org if all main scores are exactly 0
  const isOrgEmpty = orgScore?.overall === 0 && orgScore?.environmental === 0 && orgScore?.social === 0 && orgScore?.governance === 0;

  if (isOrgEmpty) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6 flex flex-col items-center justify-center min-h-[400px]">
          <FileText className="h-8 w-8 text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold">No scores yet — seed the demo</h2>
          <p className="text-sm text-muted-foreground mt-2">Run the seeder to populate ESG data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Executive Dashboard</h1>
      </div>
      
      {/* Headline score row */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Headline Scores</h2>
        <div className="grid gap-6 md:grid-cols-4">
          <div className="rounded-lg border bg-card p-4 shadow-sm h-32 flex items-center justify-center text-muted-foreground">Overall Score Placeholder</div>
          <div className="rounded-lg border bg-card p-4 shadow-sm h-32 flex items-center justify-center text-muted-foreground">Environmental Placeholder</div>
          <div className="rounded-lg border bg-card p-4 shadow-sm h-32 flex items-center justify-center text-muted-foreground">Social Placeholder</div>
          <div className="rounded-lg border bg-card p-4 shadow-sm h-32 flex items-center justify-center text-muted-foreground">Governance Placeholder</div>
        </div>
      </section>

      {/* Pillar + trend + ranking rows */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Performance Trends & Rankings</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border bg-card p-6 shadow-sm h-64 flex items-center justify-center text-muted-foreground">
            Trend Chart Placeholder
          </div>
          <div className="rounded-lg border bg-card p-6 shadow-sm h-64 flex items-center justify-center text-muted-foreground">
            Rankings Placeholder
          </div>
        </div>
      </section>
    </div>
  );
}
