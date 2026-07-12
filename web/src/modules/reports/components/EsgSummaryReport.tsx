import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Table as TableIcon, Download } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

import { useReportData } from '../hooks';
import type { ReportFilters as FiltersType } from '../api';
import { exportReportPdf } from '../lib/pdf';
import { exportReportXlsx, exportReportCsv } from '../lib/sheets';
import { ExecSummary } from './ExecSummary';
import { scoreBand, scoreBandColor } from '@/lib/scoreBand';

interface EsgSummaryReportProps {
  filters: FiltersType;
}

export function EsgSummaryReport({ filters }: EsgSummaryReportProps) {
  const { data, isLoading, error } = useReportData('esg_summary', filters);
  const [aiSummary, setAiSummary] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Skeleton className="h-32 w-full" />
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
        Failed to load ESG Summary report data.
      </div>
    );
  }

  const kpis = {
    'environmental_score': Number(data.environmental_score),
    'social_score': Number(data.social_score),
    'governance_score': Number(data.governance_score),
    'total_score': Number(data.total_score)
  };

  const tableHeaders = [
    { key: 'name', label: 'Department' },
    { key: 'environmental_score', label: 'Environmental' },
    { key: 'social_score', label: 'Social' },
    { key: 'governance_score', label: 'Governance' },
    { key: 'total_score', label: 'Total ESG Score' }
  ];

  const handleExportPdf = () => {
    exportReportPdf({
      type: 'esg_summary',
      title: 'ESG Overall Summary Report',
      period: 'Custom Period',
      filters: {
        fromDate: filters.fromDate,
        toDate: filters.toDate
      },
      kpis,
      tableData: data.department_scores,
      tableHeaders,
      aiSummary: aiSummary || undefined
    });
  };

  const handleExportXlsx = () => {
    exportReportXlsx({
      type: 'esg_summary',
      title: 'ESG Overall Summary Report',
      period: 'Custom Period',
      filters: {
        fromDate: filters.fromDate,
        toDate: filters.toDate
      },
      kpis,
      tableData: data.department_scores,
      tableHeaders
    });
  };

  const handleExportCsv = () => {
    exportReportCsv({
      type: 'esg_summary',
      title: 'ESG Overall Summary Report',
      period: 'Custom Period',
      filters: {
        fromDate: filters.fromDate,
        toDate: filters.toDate
      },
      kpis,
      tableData: data.department_scores,
      tableHeaders
    });
  };

  const chartData = [
    { name: 'Environmental', score: data.environmental_score, color: 'hsl(var(--pillar-environmental))' },
    { name: 'Social', score: data.social_score, color: 'hsl(var(--pillar-social))' },
    { name: 'Governance', score: data.governance_score, color: 'hsl(var(--pillar-governance))' }
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
        title="ESG Overall Summary Report"
        period={`${filters.fromDate || 'Start'} to ${filters.toDate || 'Present'}`}
        metrics={kpis}
        onSummaryGenerated={setAiSummary}
      />

      {/* KPIs with Score Bands */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2">
            <span className="text-xs text-muted-foreground uppercase font-semibold">Environmental Score</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{Number(data.environmental_score).toFixed(1)}</div>
            <div className="text-[10px] text-emerald-600 uppercase font-bold mt-1">Weight: {data.weight_environmental * 100}%</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <span className="text-xs text-muted-foreground uppercase font-semibold">Social Score</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{Number(data.social_score).toFixed(1)}</div>
            <div className="text-[10px] text-blue-600 uppercase font-bold mt-1">Weight: {data.weight_social * 100}%</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <span className="text-xs text-muted-foreground uppercase font-semibold">Governance Score</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{Number(data.governance_score).toFixed(1)}</div>
            <div className="text-[10px] text-purple-600 uppercase font-bold mt-1">Weight: {data.weight_governance * 100}%</div>
          </CardContent>
        </Card>
        <Card 
          style={{ borderLeft: `4px solid ${scoreBandColor(Number(data.total_score))}` }}
        >
          <CardHeader className="pb-2">
            <span className="text-xs text-muted-foreground uppercase font-semibold">Total ESG Score</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{Number(data.total_score).toFixed(1)}</div>
            <div className="text-[10px] uppercase font-bold mt-1" style={{ color: scoreBandColor(Number(data.total_score)) }}>
              Band: {scoreBand(Number(data.total_score))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pillars Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">ESG Pillar Scores Comparison</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
              <Tooltip cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }} />
              <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Details Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Department Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Department</TableHead>
                  <TableHead className="text-right">Environmental</TableHead>
                  <TableHead className="text-right">Social</TableHead>
                  <TableHead className="text-right">Governance</TableHead>
                  <TableHead className="text-right font-bold">Total ESG Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.department_scores.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No departments scores recorded.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.department_scores.map((ds: any) => (
                    <TableRow key={ds.name}>
                      <TableCell className="font-medium">{ds.name}</TableCell>
                      <TableCell className="text-right tabular-nums text-emerald-600 font-semibold">{Number(ds.environmental_score).toFixed(1)}</TableCell>
                      <TableCell className="text-right tabular-nums text-blue-600 font-semibold">{Number(ds.social_score).toFixed(1)}</TableCell>
                      <TableCell className="text-right tabular-nums text-purple-600 font-semibold">{Number(ds.governance_score).toFixed(1)}</TableCell>
                      <TableCell 
                        className="text-right tabular-nums font-bold"
                        style={{ color: scoreBandColor(Number(ds.total_score)) }}
                      >
                        {Number(ds.total_score).toFixed(1)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
