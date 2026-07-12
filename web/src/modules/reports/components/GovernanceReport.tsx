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

interface GovernanceReportProps {
  filters: FiltersType;
}

export function GovernanceReport({ filters }: GovernanceReportProps) {
  const { data, isLoading, error } = useReportData('governance', filters);
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
        Failed to load Governance report data.
      </div>
    );
  }

  const kpis = {
    'compliance_issues_count': data.compliance_issues_count,
    'open_issues_count': data.open_issues_count,
    'resolved_issues_count': data.resolved_issues_count,
    'audits_count': data.audits_count,
    'audits_pass_count': data.audits_pass_count
  };

  const tableHeaders = [
    { key: 'created_at', label: 'Date Created' },
    { key: 'severity', label: 'Severity' },
    { key: 'status', label: 'Status' },
    { key: 'description', label: 'Description' }
  ];

  const handleExportPdf = () => {
    exportReportPdf({
      type: 'governance',
      title: 'Governance ESG Report',
      period: 'Custom Period',
      filters: {
        fromDate: filters.fromDate,
        toDate: filters.toDate
      },
      kpis,
      tableData: data.issues,
      tableHeaders,
      aiSummary: aiSummary || undefined
    });
  };

  const handleExportXlsx = () => {
    exportReportXlsx({
      type: 'governance',
      title: 'Governance ESG Report',
      period: 'Custom Period',
      filters: {
        fromDate: filters.fromDate,
        toDate: filters.toDate
      },
      kpis,
      tableData: data.issues,
      tableHeaders
    });
  };

  const handleExportCsv = () => {
    exportReportCsv({
      type: 'governance',
      title: 'Governance ESG Report',
      period: 'Custom Period',
      filters: {
        fromDate: filters.fromDate,
        toDate: filters.toDate
      },
      kpis,
      tableData: data.issues,
      tableHeaders
    });
  };

  const chartData = [
    { name: 'Total Issues', count: data.compliance_issues_count },
    { name: 'Open Issues', count: data.open_count || data.open_issues_count },
    { name: 'Resolved', count: data.resolved_count || data.resolved_issues_count }
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
        title="Governance ESG Report"
        period={`${filters.fromDate || 'Start'} to ${filters.toDate || 'Present'}`}
        metrics={kpis}
        onSummaryGenerated={setAiSummary}
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <span className="text-xs text-muted-foreground uppercase font-semibold">Total Issues</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums text-purple-600">{data.compliance_issues_count}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <span className="text-xs text-muted-foreground uppercase font-semibold">Open Issues</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums text-rose-600">{data.open_issues_count}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <span className="text-xs text-muted-foreground uppercase font-semibold">Resolved Issues</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums text-emerald-600">{data.resolved_issues_count}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <span className="text-xs text-muted-foreground uppercase font-semibold">Total Audits</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{data.audits_count}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <span className="text-xs text-muted-foreground uppercase font-semibold">Passed Audits</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums text-emerald-600">{data.audits_pass_count}</div>
          </CardContent>
        </Card>
      </div>

      {/* Issues Status Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Compliance Issues Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }} />
              <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Details Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Governance Compliance Ledger</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date Created</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.issues.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No compliance issues found.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.issues.map((issue: any) => (
                    <TableRow key={issue.id}>
                      <TableCell className="tabular-nums">{new Date(issue.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="capitalize font-semibold text-rose-500">{issue.severity}</TableCell>
                      <TableCell className="capitalize">{issue.status.replace(/_/g, ' ')}</TableCell>
                      <TableCell>{issue.description}</TableCell>
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
