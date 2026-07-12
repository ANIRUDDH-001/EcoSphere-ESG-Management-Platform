import * as XLSX from 'xlsx';

export interface ReportModelForExport {
  type: string;
  title: string;
  period: string;
  filters: {
    departmentName?: string;
    fromDate?: string;
    toDate?: string;
  };
  kpis: Record<string, number | string>;
  tableData: Record<string, any>[];
  tableHeaders: { key: string; label: string }[];
}

export function exportReportXlsx(report: ReportModelForExport) {
  const wb = XLSX.utils.book_new();

  // 1. KPI Sheet
  const kpisRows = Object.entries(report.kpis).map(([key, val]) => ({
    Metric: key.replace(/_/g, ' ').toUpperCase(),
    Value: typeof val === 'number' ? val : String(val).replace(/[\uE000-\uF8FF]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDDFF]/g, '') // remove emoji
  }));
  const wsKPIs = XLSX.utils.json_to_sheet(kpisRows);
  XLSX.utils.book_append_sheet(wb, wsKPIs, 'KPIs');

  // 2. Table Data Sheet
  const tableRows = report.tableData.map(row => {
    const cleanRow: Record<string, any> = {};
    for (const h of report.tableHeaders) {
      const val = row[h.key];
      // strip emoji from strings
      cleanRow[h.label] = typeof val === 'string' 
        ? val.replace(/[\uE000-\uF8FF]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDDFF]/g, '') 
        : val;
    }
    return cleanRow;
  });
  const wsDetails = XLSX.utils.json_to_sheet(tableRows);
  XLSX.utils.book_append_sheet(wb, wsDetails, 'Detail Data');

  // Filename format: esg-<type>-<period>.xlsx
  const safeTitle = report.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const filename = `esg-${safeTitle}-${report.period.replace(/\s+/g, '')}.xlsx`;
  XLSX.writeFile(wb, filename);
}

export function exportReportCsv(report: ReportModelForExport) {
  // Convert table data to CSV format
  const tableRows = report.tableData.map(row => {
    const cleanRow: Record<string, any> = {};
    for (const h of report.tableHeaders) {
      const val = row[h.key];
      cleanRow[h.label] = typeof val === 'string' 
        ? val.replace(/[\uE000-\uF8FF]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDDFF]/g, '') 
        : val;
    }
    return cleanRow;
  });
  const ws = XLSX.utils.json_to_sheet(tableRows);
  const csvContent = XLSX.utils.sheet_to_csv(ws);

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const safeTitle = report.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  link.setAttribute('download', `esg-${safeTitle}-${report.period.replace(/\s+/g, '')}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
