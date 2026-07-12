import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

import { useReportData, useDepartments } from '../hooks';
import { exportReportPdf } from '../lib/pdf';
import { ExecSummary } from './ExecSummary';

export function CustomReport() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: departments = [] } = useDepartments();

  // Read URL params or apply sensible defaults (all pillars, last 90 days)
  const pillarsParam = searchParams.get('pillars')?.split(',') || ['environmental', 'social', 'governance'];
  const deptsParam = searchParams.get('depts')?.split(',') || [];
  const fromParam = searchParams.get('from') || '';
  const toParam = searchParams.get('to') || '';
  const groupByParam = searchParams.get('groupBy') || 'department';

  const [pillars, setPillars] = useState<string[]>(pillarsParam);
  const [selectedDepts, setSelectedDepts] = useState<string[]>(deptsParam);
  const [fromDate, setFromDate] = useState(fromParam);
  const [toDate, setToDate] = useState(toParam);
  const [groupBy, setGroupBy] = useState(groupByParam);

  const [aiSummary, setAiSummary] = useState<string | null>(null);

  // Sync state to URL params when changes occur
  const applyFilters = () => {
    setSearchParams({
      pillars: pillars.join(','),
      depts: selectedDepts.join(','),
      from: fromDate,
      to: toDate,
      groupBy
    });
  };

  const handlePillarToggle = (pillar: string) => {
    setPillars(prev => 
      prev.includes(pillar) ? prev.filter(p => p !== pillar) : [...prev, pillar]
    );
  };

  const handleDeptToggle = (deptId: string) => {
    setSelectedDepts(prev =>
      prev.includes(deptId) ? prev.filter(d => d !== deptId) : [...prev, deptId]
    );
  };

  // Queries for standard report data to compose
  const envFilters = { departmentId: selectedDepts[0], fromDate, toDate }; // Simplified to first selected dept for baseline queries
  const envQuery = useReportData('environmental', envFilters);
  const socialQuery = useReportData('social', envFilters);
  const govQuery = useReportData('governance', envFilters);

  const isAnyLoading = 
    (pillars.includes('environmental') && envQuery.isLoading) ||
    (pillars.includes('social') && socialQuery.isLoading) ||
    (pillars.includes('governance') && govQuery.isLoading);

  // Compose combined KPIs
  const composedKpis: Record<string, number | string> = {};
  const composedTableData: any[] = [];
  const chartData: any[] = [];

  if (pillars.includes('environmental') && envQuery.data) {
    composedKpis['total_co2e_kg'] = envQuery.data.total_co2e;
    composedKpis['total_quantity'] = envQuery.data.total_quantity;
    composedTableData.push(...envQuery.data.transactions.map((t: any) => ({
      pillar: 'Environmental',
      date: t.date,
      metric: t.source_type,
      value: `${t.co2e} kg CO2e`
    })));
    chartData.push({ name: 'Carbon (CO2e)', value: envQuery.data.total_co2e });
  }
  if (pillars.includes('social') && socialQuery.data) {
    composedKpis['csr_activities'] = socialQuery.data.csr_activities_count;
    composedKpis['social_participations'] = socialQuery.data.total_participations;
    composedTableData.push({
      pillar: 'Social',
      date: 'N/A',
      metric: 'Workforce Headcount',
      value: socialQuery.data.diversity?.headcount || 0
    });
    chartData.push({ name: 'CSR Count', value: socialQuery.data.csr_activities_count });
  }
  if (pillars.includes('governance') && govQuery.data) {
    composedKpis['compliance_issues'] = govQuery.data.compliance_issues_count;
    composedKpis['passed_audits'] = govQuery.data.audits_pass_count;
    composedTableData.push(...govQuery.data.issues.map((i: any) => ({
      pillar: 'Governance',
      date: new Date(i.created_at).toLocaleDateString(),
      metric: `Issue (${i.severity})`,
      value: i.status
    })));
    chartData.push({ name: 'Issues Count', value: govQuery.data.compliance_issues_count });
  }

  const tableHeaders = [
    { key: 'pillar', label: 'Pillar' },
    { key: 'date', label: 'Date/Period' },
    { key: 'metric', label: 'Metric/Details' },
    { key: 'value', label: 'Value/Status' }
  ];

  const handleExportPdf = () => {
    exportReportPdf({
      type: 'custom',
      title: 'Custom ESG Report',
      period: `${fromDate || 'Start'} to ${toDate || 'Present'}`,
      filters: {
        fromDate,
        toDate
      },
      kpis: composedKpis,
      tableData: composedTableData,
      tableHeaders,
      aiSummary: aiSummary || undefined
    });
  };

  return (
    <div className="space-y-6">
      {/* Configuration Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Custom Report Configurator</CardTitle>
          <CardDescription>Select pillars, departments, dates, and click Apply to generate.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Pillars */}
            <div className="space-y-2 border p-3 rounded-md">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pillars</Label>
              <div className="space-y-1.5 mt-1">
                {['environmental', 'social', 'governance'].map(p => (
                  <div key={p} className="flex items-center gap-2">
                    <input 
                      type="checkbox"
                      id={`p-${p}`}
                      checked={pillars.includes(p)} 
                      onChange={() => handlePillarToggle(p)}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <Label htmlFor={`p-${p}`} className="capitalize text-sm">{p}</Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Departments */}
            <div className="space-y-2 border p-3 rounded-md max-h-36 overflow-y-auto">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Departments</Label>
              <div className="space-y-1.5 mt-1">
                {departments.map((d: any) => (
                  <div key={d.id} className="flex items-center gap-2">
                    <input 
                      type="checkbox"
                      id={`d-${d.id}`}
                      checked={selectedDepts.includes(d.id)}
                      onChange={() => handleDeptToggle(d.id)}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <Label htmlFor={`d-${d.id}`} className="text-sm">{d.name}</Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Date range */}
            <div className="space-y-2 border p-3 rounded-md">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Date Range</Label>
              <div className="space-y-2 mt-1">
                <div>
                  <Label htmlFor="cust-from" className="text-[10px]">From</Label>
                  <Input id="cust-from" type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="h-8" />
                </div>
                <div>
                  <Label htmlFor="cust-to" className="text-[10px]">To</Label>
                  <Input id="cust-to" type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="h-8" />
                </div>
              </div>
            </div>

            {/* Grouping */}
            <div className="space-y-2 border p-3 rounded-md">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Group By</Label>
              <Select value={groupBy} onValueChange={setGroupBy}>
                <SelectTrigger className="mt-1 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="department">Department</SelectItem>
                  <SelectItem value="period">Period</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button size="sm" onClick={applyFilters}>Generate Custom Report</Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Output */}
      {isAnyLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={handleExportPdf}>
              <FileText size={14} className="mr-1.5" /> Export PDF
            </Button>
          </div>

          {/* AI Executive Summary */}
          {Object.keys(composedKpis).length > 0 && (
            <ExecSummary
              title="Custom ESG Report"
              period={`${fromDate || 'Start'} to ${toDate || 'Present'}`}
              metrics={composedKpis}
              onSummaryGenerated={setAiSummary}
            />
          )}

          {/* KPI grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(composedKpis).map(([k, v]) => (
              <Card key={k}>
                <CardHeader className="pb-2">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">{k.replace(/_/g, ' ')}</span>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold tabular-nums">
                    {typeof v === 'number' ? v.toFixed(1) : v}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Composed Chart */}
          {chartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Composed Report Chart Overview</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }} />
                    <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Composed Ledger Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pillar</TableHead>
                      <TableHead>Date/Period</TableHead>
                      <TableHead>Metric/Details</TableHead>
                      <TableHead>Value/Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {composedTableData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          Configure filters and click Apply to see composed data.
                        </TableCell>
                      </TableRow>
                    ) : (
                      composedTableData.map((row, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-semibold">{row.pillar}</TableCell>
                          <TableCell className="tabular-nums">{row.date}</TableCell>
                          <TableCell className="capitalize">{row.metric}</TableCell>
                          <TableCell className="font-mono text-xs">{row.value}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
