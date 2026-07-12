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

interface EnvironmentalReportProps {
  filters: FiltersType;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#6366f1'];

export function EnvironmentalReport({ filters }: EnvironmentalReportProps) {
  const { data, isLoading, error } = useReportData('environmental', filters);
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
        Failed to load Environmental report data.
      </div>
    );
  }

  const kpis = {
    'total_co2e_kg': Number(data.total_co2e),
    'total_quantity': Number(data.total_quantity),
    'transactions_count': data.transactions.length
  };

  const tableHeaders = [
    { key: 'date', label: 'Date' },
    { key: 'source_type', label: 'Source Type' },
    { key: 'source_ref', label: 'Reference' },
    { key: 'quantity', label: 'Quantity' },
    { key: 'co2e', label: 'CO2e (kg)' },
    { key: 'note', label: 'Note' }
  ];

  const handleExportPdf = () => {
    exportReportPdf({
      type: 'environmental',
      title: 'Environmental ESG Report',
      period: 'Custom Period',
      filters: {
        fromDate: filters.fromDate,
        toDate: filters.toDate
      },
      kpis,
      tableData: data.transactions,
      tableHeaders,
      aiSummary: aiSummary || undefined
    });
  };

  const handleExportXlsx = () => {
    exportReportXlsx({
      type: 'environmental',
      title: 'Environmental ESG Report',
      period: 'Custom Period',
      filters: {
        fromDate: filters.fromDate,
        toDate: filters.toDate
      },
      kpis,
      tableData: data.transactions,
      tableHeaders
    });
  };

  const handleExportCsv = () => {
    exportReportCsv({
      type: 'environmental',
      title: 'Environmental ESG Report',
      period: 'Custom Period',
      filters: {
        fromDate: filters.fromDate,
        toDate: filters.toDate
      },
      kpis,
      tableData: data.transactions,
      tableHeaders
    });
  };

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
        title="Environmental ESG Report"
        period={`${filters.fromDate || 'Start'} to ${filters.toDate || 'Present'}`}
        metrics={kpis}
        onSummaryGenerated={setAiSummary}
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <span className="text-xs text-muted-foreground uppercase font-semibold">Total Carbon (CO2e)</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums text-emerald-600">{data.total_co2e.toFixed(2)} kg</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <span className="text-xs text-muted-foreground uppercase font-semibold">Total Quantity</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{data.total_quantity.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <span className="text-xs text-muted-foreground uppercase font-semibold">Total Transactions</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{data.transactions.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Source Breakdown Chart */}
      {data.source_breakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Carbon Emissions by Source (kg CO2e)</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.source_breakdown}>
                <XAxis dataKey="source_type" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }} />
                <Bar dataKey="co2e" fill="#10b981" radius={[4, 4, 0, 0]}>
                  {data.source_breakdown.map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Details Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Carbon Ledger Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Source Type</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">CO2e (kg)</TableHead>
                  <TableHead>Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No records found for this period.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.transactions.map((t: any) => (
                    <TableRow key={t.id}>
                      <TableCell className="tabular-nums">{t.date}</TableCell>
                      <TableCell className="capitalize">{t.source_type}</TableCell>
                      <TableCell className="font-mono text-xs">{t.source_ref}</TableCell>
                      <TableCell className="text-right tabular-nums">{t.quantity}</TableCell>
                      <TableCell className="text-right tabular-nums text-emerald-600 font-medium">{t.co2e}</TableCell>
                      <TableCell>{t.note}</TableCell>
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
