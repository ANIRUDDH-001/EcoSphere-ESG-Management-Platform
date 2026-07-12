import { useMemo } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useEnvDashboard } from '../hooks';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatTile } from '@/components/shared/StatTile';
import { ChartCard } from '@/components/shared/ChartCard';
import { TrendLine } from '@/components/shared/TrendLine';
import { RankBar } from '@/components/shared/RankBar';
import { Gauge } from '@/components/shared/Gauge';
import { Skeleton } from '@/components/ui/skeleton';
import { Leaf } from 'lucide-react';
import { goalProgressPct } from '../utils';

export const EnvironmentalDashboardPage = () => {
  const { profile } = useAuth();
  const { deptEms, carbonTxns, goals, isLoading } = useEnvDashboard();

  // Compute total CO2e
  const totalCo2e = useMemo(() => {
    return deptEms.reduce((acc, curr) => acc + Number(curr.total_co2e), 0);
  }, [deptEms]);

  // Compute trend data (monthly)
  const trendData = useMemo(() => {
    const monthly: Record<string, number> = {};
    carbonTxns.forEach(txn => {
      if (txn.date) {
        const month = txn.date.substring(0, 7); // YYYY-MM
        monthly[month] = (monthly[month] || 0) + Number(txn.co2e || 0);
      }
    });
    return Object.entries(monthly)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, total]) => ({ month, total }));
  }, [carbonTxns]);

  // Rank data
  const rankData = useMemo(() => {
    return [...deptEms]
      .sort((a, b) => Number(b.total_co2e) - Number(a.total_co2e))
      .map(d => ({
        name: d.department_name || 'Org-wide',
        co2e: Number(d.total_co2e),
        // If the user has a department, we could highlight it by changing its color or just rely on the tooltips.
        // For Recharts RankBar, the color is generated automatically. 
        isHighlight: d.department_id === profile?.department_id
      }));
  }, [deptEms, profile]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <PageHeader title="Environmental" description="Loading metrics..." />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  // Active or Achieved Goals for Gauge (only 'co2e' metric goals)
  const displayGoals = goals
    .filter(g => g.metric === 'co2e' && g.status !== 'archived')
    .slice(0, 4);

  return (
    <div className="p-6 space-y-6">
      <PageHeader 
        title="Environmental Dashboard" 
        description="Carbon emissions and reduction goals" 
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatTile 
          title="Total Emissions" 
          value={`${totalCo2e.toFixed(1)} kg`} 
          icon={<Leaf className="w-4 h-4" />}
          description="Rolling 12 months"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Emissions Trend" description="Monthly CO₂e (kg)">
          {trendData.length > 0 ? (
            <TrendLine data={trendData} dataKey="total" xAxisKey="month" />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              No carbon data available
            </div>
          )}
        </ChartCard>

        <ChartCard title="Department Breakdown" description="CO₂e (kg) by department">
          {rankData.length > 0 ? (
            <RankBar data={rankData} dataKey="co2e" xAxisKey="name" />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              No department data available
            </div>
          )}
        </ChartCard>
      </div>

      {displayGoals.length > 0 && (
        <div className="mt-8 space-y-6">
          <h2 className="text-xl font-bold">Reduction Goals</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {displayGoals.map(goal => {
               const progress = goalProgressPct({
                 baseline: Number(goal.baseline || 0),
                 target: Number(goal.target || 0),
                 current_value: Number(goal.current_value || 0)
               });
               return (
                 <ChartCard key={goal.id} title={goal.name || ''} description={`${progress.toFixed(0)}% achieved`}>
                   <Gauge value={progress} />
                 </ChartCard>
               );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
