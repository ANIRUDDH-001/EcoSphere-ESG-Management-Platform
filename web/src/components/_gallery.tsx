import { PageHeader } from './shared/PageHeader';
import { ScoreBadge } from './shared/ScoreBadge';
import { StatTile } from './shared/StatTile';
import { Gauge } from './shared/Gauge';
import { ChartCard } from './shared/ChartCard';
import { TrendLine } from './shared/TrendLine';
import { RankBar } from './shared/RankBar';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ConfirmDialog } from './shared/ConfirmDialog';
import { useState } from 'react';
import { DataTable } from './shared/DataTable';
import { Leaf } from 'lucide-react';
import { FormField } from './shared/FormField';
import { Input } from '@/components/ui/input';

const trendData = [
  { month: 'Jan', value: 40 },
  { month: 'Feb', value: 30 },
  { month: 'Mar', value: 20 },
  { month: 'Apr', value: 27 },
  { month: 'May', value: 18 },
];

const rankData = [
  { name: 'Dep A', score: 85 },
  { name: 'Dep B', score: 72 },
  { name: 'Dep C', score: 65 },
  { name: 'Dep D', score: 45 },
];

const tableData = [
  { id: '1', name: 'Task 1', status: 'Done' },
  { id: '2', name: 'Task 2', status: 'Pending' },
];
const tableColumns = [
  { header: 'ID', accessorKey: 'id' },
  { header: 'Name', accessorKey: 'name' },
  { header: 'Status', accessorKey: 'status' },
];

export function Gallery() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="p-8 space-y-8">
      <PageHeader title="Component Gallery" description="Shared UI primitives for EcoSphere" />

      <section>
        <h2 className="text-xl font-bold mb-4">Badges & Stats</h2>
        <div className="flex gap-4 mb-4">
          <ScoreBadge score={85} />
          <ScoreBadge score={65} />
          <ScoreBadge score={45} />
          <ScoreBadge score={25} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatTile title="Total Users" value="1,234" icon={<Leaf size={16} />} description="+12% from last month" />
          <StatTile title="Avg Score" value={<ScoreBadge score={72} />} description="Good standing" />
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">Charts</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ChartCard title="Current Score" description="Overall ESG Rating">
            <Gauge value={72} />
          </ChartCard>
          <ChartCard title="Emissions Trend" description="Past 5 months">
            <TrendLine data={trendData} dataKey="value" xAxisKey="month" />
          </ChartCard>
          <ChartCard title="Department Rank" description="By Score">
            <RankBar data={rankData} dataKey="score" xAxisKey="name" />
          </ChartCard>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">Data Table</h2>
        <DataTable columns={tableColumns} data={tableData} />
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">Forms & Dialogs</h2>
        <div className="max-w-sm space-y-4">
          <FormField id="email" label="Email address" error="Invalid email">
            <Input id="email" placeholder="Enter your email" />
          </FormField>
          
          <div className="flex gap-4">
            <Button onClick={() => toast("This is a toast message")}>Show Toast</Button>
            <Button variant="outline" onClick={() => setDialogOpen(true)}>Show Confirm</Button>
          </div>
        </div>
      </section>

      <ConfirmDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen}
        title="Are you absolutely sure?"
        description="This action cannot be undone."
        onConfirm={() => toast("Confirmed!")}
      />
    </div>
  );
}
