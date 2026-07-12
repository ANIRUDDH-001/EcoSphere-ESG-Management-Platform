import { Users, TrendingUp, BarChart3, UserCheck } from 'lucide-react';
import { useParticipationSummary, useDiversityMetrics, useTrainingCompletions } from '../hooks';
import { StatTile } from '@/components/shared/StatTile';
import { ChartCard } from '@/components/shared/ChartCard';
import { RankBar } from '@/components/shared/RankBar';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/hooks/useAuth';

export function SocialDashboard() {
  const { profile } = useAuth();
  const deptId = profile?.role === 'manager' ? (profile.department_id ?? undefined) : undefined;

  const { data: summary, isLoading: sumLoading, error: sumError } = useParticipationSummary();
  const { data: diversity, isLoading: divLoading } = useDiversityMetrics(deptId);
  const { data: training, isLoading: trainLoading } = useTrainingCompletions(deptId);

  const rankData = (summary?.recentByDept ?? []).slice(0, 6).map(d => ({
    name: d.name.length > 16 ? d.name.slice(0, 14) + '…' : d.name,
    participations: d.count,
  }));

  const avgTraining =
    training && training.length > 0
      ? Math.round(training.reduce((s, t) => s + (t.completion_pct ?? 0), 0) / training.length)
      : 0;

  const latestDiversity = diversity && diversity.length > 0 ? diversity[0] : null;

  if (sumError) {
    return (
      <div className="p-6">
        <PageHeader title="Social" description="Employee engagement and social performance" />
        <Card>
          <CardContent className="flex items-center gap-2 py-8 text-destructive">
            <Users size={16} />
            <span>Failed to load social data. Please refresh.</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader title="Social" description="Employee engagement, CSR participation and social performance" />

      {/* KPI tiles */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {sumLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-lg" />)
        ) : (
          <>
            <StatTile
              title="Participation Rate"
              value={`${summary?.participationRate ?? 0}%`}
              icon={<UserCheck size={18} />}
              description={`${summary?.approvedCount ?? 0} of ${summary?.totalEmployees ?? 0} employees`}
            />
            <StatTile
              title="Active Departments"
              value={String(summary?.recentByDept?.filter(d => d.count > 0).length ?? 0)}
              icon={<Users size={18} />}
              description="Departments with approved participations"
            />
            <StatTile
              title="Avg Training Completion"
              value={trainLoading ? '–' : `${avgTraining}%`}
              icon={<TrendingUp size={18} />}
              description="Average across recorded completions"
            />
            <StatTile
              title="Diversity Records"
              value={divLoading ? '–' : String(diversity?.length ?? 0)}
              icon={<BarChart3 size={18} />}
              description="Periods with diversity data"
            />
          </>
        )}
      </div>

      {/* Participation ranking */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <ChartCard title="Participation by Department" description="Approved CSR participations per department">
          {sumLoading ? (
            <Skeleton className="h-full w-full" />
          ) : rankData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
              <Users size={32} />
              <p className="text-sm">No participation data yet. Start by joining a CSR activity.</p>
            </div>
          ) : (
            <RankBar data={rankData} dataKey="participations" xAxisKey="name" />
          )}
        </ChartCard>

        {/* Diversity snapshot */}
        <ChartCard title="Latest Diversity Snapshot" description={latestDiversity ? `Period: ${latestDiversity.period}` : 'No data yet'}>
          {divLoading ? (
            <Skeleton className="h-full w-full" />
          ) : !latestDiversity ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
              <BarChart3 size={32} />
              <p className="text-sm">No diversity metrics recorded. Add metrics from the Diversity tab.</p>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              {[
                { label: 'Gender Ratio', value: `${latestDiversity.gender_ratio ?? '–'}`, unit: '' },
                { label: 'Avg Tenure', value: `${latestDiversity.avg_tenure ?? '–'}`, unit: 'yrs' },
                { label: 'Training Hours', value: `${latestDiversity.training_hours ?? '–'}`, unit: 'hrs' },
                { label: 'Headcount', value: `${latestDiversity.headcount ?? '–'}`, unit: '' },
              ].map(({ label, value, unit }) => (
                <div key={label} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <span className="text-sm text-muted-foreground">{label}</span>
                  <span className="text-sm font-semibold tabular-nums">{value}{unit ? ` ${unit}` : ''}</span>
                </div>
              ))}
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
