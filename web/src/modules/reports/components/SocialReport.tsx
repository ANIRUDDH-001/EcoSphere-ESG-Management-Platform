import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Table as TableIcon, Download } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

import { useReportData } from '../hooks';
import type { ReportFilters as FiltersType } from '../api';
import { exportReportPdf } from '../lib/pdf';
import { exportReportXlsx, exportReportCsv } from '../lib/sheets';
import { ExecSummary } from './ExecSummary';

interface SocialReportProps {
  filters: FiltersType;
}

export function SocialReport({ filters }: SocialReportProps) {
  const { data, isLoading, error } = useReportData('social', filters);
  const [aiSummary, setAiSummary] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center text-destructive">
        Failed to load Social report data.
      </div>
    );
  }

  const kpis = {
    'csr_activities_count': data.csr_activities_count,
    'total_participations': data.total_participations,
    'total_points_earned': data.total_points_earned,
    'avg_completion_pct': Number(data.avg_completion_pct)
  };

  const diversityRows = [
    { metric: 'Gender Ratio (F:M)', value: data.diversity.gender_ratio?.toFixed(2) || '0.00' },
    { metric: 'Average Tenure (Years)', value: data.diversity.avg_tenure?.toFixed(1) || '0.0' },
    { metric: 'Total Training Hours', value: data.diversity.training_hours || 0 },
    { metric: 'Headcount', value: data.diversity.headcount || 0 }
  ];

  const tableHeaders = [
    { key: 'metric', label: 'Metric' },
    { key: 'value', label: 'Value' }
  ];

  const handleExportPdf = () => {
    exportReportPdf({
      type: 'social',
      title: 'Social ESG Report',
      period: 'Custom Period',
      filters: {
        fromDate: filters.fromDate,
        toDate: filters.toDate
      },
      kpis,
      tableData: diversityRows,
      tableHeaders,
      aiSummary: aiSummary || undefined
    });
  };

  const handleExportXlsx = () => {
    exportReportXlsx({
      type: 'social',
      title: 'Social ESG Report',
      period: 'Custom Period',
      filters: {
        fromDate: filters.fromDate,
        toDate: filters.toDate
      },
      kpis,
      tableData: diversityRows,
      tableHeaders
    });
  };

  const handleExportCsv = () => {
    exportReportCsv({
      type: 'social',
      title: 'Social ESG Report',
      period: 'Custom Period',
      filters: {
        fromDate: filters.fromDate,
        toDate: filters.toDate
      },
      kpis,
      tableData: diversityRows,
      tableHeaders
    });
  };

  const chartData = [
    { name: 'CSR Count', val: data.csr_activities_count },
    { name: 'Participations', val: data.total_participations },
    { name: 'Training %', val: Number(data.avg_completion_pct) }
  ];

  return (
    <div className="space-y-6">
      {/* Export Toolbar */}
      <div className="flex flex-wrap gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={handleExportPdf}>
          <FileText size={14} className="mr-1.5" /> Export PDF
        </Button>
        <Button variant="outline" size="sm" onClick={handleExportXlsx}>
          <TableIcon size={14} className="mr-1.5" /> Export XLSX
        </Button>
        <Button variant="outline" size="sm" onClick={handleExportCsv}>
          <Download size={14} className="mr-1.5" /> Export CSV
        </Button>
      </div>

      {/* AI Summary */}
      <ExecSummary
        title="Social ESG Report"
        period={`${filters.fromDate || 'Start'} to ${filters.toDate || 'Present'}`}
        metrics={kpis}
        onSummaryGenerated={setAiSummary}
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <span className="text-xs text-muted-foreground uppercase font-semibold">CSR Activities</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums text-sky-600">{data.csr_activities_count}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <span className="text-xs text-muted-foreground uppercase font-semibold">Total Participations</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{data.total_participations}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <span className="text-xs text-muted-foreground uppercase font-semibold">Total Points Earned</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums text-sky-600">{data.total_points_earned}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <span className="text-xs text-muted-foreground uppercase font-semibold">Avg Training Completion</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{Number(data.avg_completion_pct).toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Engagement Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Social Metrics & Engagement Overview</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }} />
              <Bar dataKey="val" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Diversity Metrics Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Diversity & Workforce Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Metric</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {diversityRows.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{r.metric}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.value}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
