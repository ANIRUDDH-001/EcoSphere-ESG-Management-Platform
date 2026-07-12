import { PageHeader } from '../../../components/shared/PageHeader';
import { StatTile } from '../../../components/shared/StatTile';
import { RankBar } from '../../../components/shared/RankBar';
import { Badge } from '../../../components/ui/badge';
import { useGovDashboard } from '../hooks';
import { ShieldCheck, AlertCircle, AlertTriangle, UserCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export function GovernanceDashboardPage() {
  const { data: stats, isLoading } = useGovDashboard();

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <PageHeader title="Governance Dashboard" description="Overview of policies, audits, and compliance." />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
          <div className="h-24 bg-muted rounded-md"></div>
          <div className="h-24 bg-muted rounded-md"></div>
          <div className="h-24 bg-muted rounded-md"></div>
          <div className="h-24 bg-muted rounded-md"></div>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Governance Dashboard" description="Overview of policies, audits, and compliance." />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile 
          title="Policy Acknowledgement Rate" 
          value={`${stats.ackRate.toFixed(1)}%`}
          icon={<UserCheck className="w-4 h-4 text-primary" />}
        />
        <StatTile 
          title="Audit Pass Rate" 
          value={`${stats.passRate.toFixed(1)}%`}
          icon={<ShieldCheck className="w-4 h-4 text-green-500" />}
        />
        <StatTile 
          title="Open Compliance Issues" 
          value={stats.openCount}
          icon={<AlertCircle className="w-4 h-4 text-orange-500" />}
        />
        <StatTile 
          title="Overdue Issues" 
          value={stats.overdueCount}
          icon={<AlertTriangle className="w-4 h-4 text-destructive" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="border rounded-lg p-6 bg-card">
          <h3 className="font-medium mb-4">Issues by Severity</h3>
          <div className="space-y-4 h-[250px]">
            <RankBar 
              data={[
                { severity: 'Critical', count: stats.severityBreakdown.critical },
                { severity: 'High', count: stats.severityBreakdown.high },
                { severity: 'Medium', count: stats.severityBreakdown.medium },
                { severity: 'Low', count: stats.severityBreakdown.low }
              ]} 
              dataKey="count" 
              xAxisKey="severity" 
            />
          </div>
        </div>

        <div className="border rounded-lg p-6 bg-card">
          <h3 className="font-medium mb-4">Top Overdue Issues</h3>
          {stats.topOverdueIssues.length === 0 ? (
            <div className="text-muted-foreground text-sm py-4">No overdue issues!</div>
          ) : (
            <div className="space-y-4">
              {stats.topOverdueIssues.map(issue => (
                <div key={issue.id} className="flex flex-col gap-1 border-b last:border-0 pb-3 last:pb-0">
                  <div className="flex justify-between items-start">
                    <span className="font-medium text-sm">{issue.description}</span>
                    <Badge variant={issue.severity === 'critical' || issue.severity === 'high' ? 'destructive' : 'secondary'}>
                      {issue.severity}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Due: {new Date(issue.due_date as string).toLocaleDateString()}
                  </div>
                </div>
              ))}
              <div className="pt-2">
                <Link to="/governance/compliance" className="text-sm text-primary hover:underline">
                  View all compliance issues &rarr;
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
