// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import pdfMake from 'pdfmake/build/pdfmake';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import pdfFonts from 'pdfmake/build/vfs_fonts';

// Initialize virtual file system for pdfmake
try {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (pdfMake as any).vfs = (pdfFonts as any).pdfMake?.vfs ?? pdfFonts;
} catch (e) {
  // Safe catch in case of server side rendering or hot reloading
}

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
  tableData: Record<string, unknown>[];
  tableHeaders: { key: string; label: string }[];
  aiSummary?: string;
}

export function exportReportPdf(report: ReportModelForExport) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const docDefinition: any = {
    content: [
      // Branded Header
      { text: 'EcoSphere ESG Platform', style: 'brandHeader' },
      { text: report.title, style: 'reportTitle' },
      { text: `Report Period: ${report.period}`, style: 'subheader' },
      
      // Filters
      {
        text: `Filters Applied — Department: ${report.filters.departmentName || 'All'}, Date Range: ${report.filters.fromDate || 'Beginning'} to ${report.filters.toDate || 'Present'}`,
        style: 'filters'
      },
      
      { canvas: [{ type: 'line', x1: 0, y1: 5, x2: 515, y2: 5, lineWidth: 1.5, color: '#10b981' }] },
      { text: '', margin: [0, 10] },

      // AI Summary (if present)
      ...(report.aiSummary ? [
        { text: 'AI Executive Summary', style: 'sectionHeader' },
        { text: report.aiSummary.replace(/[\uE000-\uF8FF\uD83C\uD83D]/g, ''), style: 'bodyText' },
        { text: '', margin: [0, 10] }
      ] : []),

      // KPIs
      { text: 'KPI Summary', style: 'sectionHeader' },
      {
        table: {
          widths: ['*', '*'],
          body: [
            ...Object.entries(report.kpis).map(([k, v]) => [
              { text: k.replace(/_/g, ' ').toUpperCase(), style: 'tableHeader' },
              { text: String(v).replace(/[\uE000-\uF8FF\uD83C\uD83D]/g, ''), style: 'kpiVal', alignment: 'right' }
            ])
          ]
        },
        layout: 'lightHorizontalLines',
        margin: [0, 0, 0, 20]
      },

      // Details Table
      { text: 'Report Details', style: 'sectionHeader' },
      {
        table: {
          headerRows: 1,
          widths: report.tableHeaders.map(() => '*'),
          body: [
            report.tableHeaders.map(h => ({ text: h.label, style: 'tableHeader' })),
            ...report.tableData.map(row => 
              report.tableHeaders.map(h => {
                const val = (row as Record<string, unknown>)[h.key];
                return {
                  text: typeof val === 'number' 
                    ? String(val) 
                    : String(val ?? '').replace(/[\uE000-\uF8FF\uD83C\uD83D]/g, ''),
                  style: typeof val === 'number' ? 'numCell' : 'cellText'
                };
              })
            )
          ]
        },
        layout: 'lightHorizontalLines'
      }
    ],
    styles: {
      brandHeader: { fontSize: 10, color: '#10b981', bold: true, margin: [0, 0, 0, 2] },
      reportTitle: { fontSize: 22, bold: true, color: '#1e293b', margin: [0, 0, 0, 4] },
      subheader: { fontSize: 12, color: '#64748b', margin: [0, 0, 0, 4] },
      filters: { fontSize: 9, color: '#94a3b8', italic: true, margin: [0, 0, 0, 8] },
      sectionHeader: { fontSize: 14, bold: true, color: '#1e293b', margin: [0, 10, 0, 6] },
      bodyText: { fontSize: 10, color: '#334155', lineHeight: 1.3 },
      tableHeader: { bold: true, fontSize: 10, color: '#475569', fillColor: '#f8fafc' },
      kpiVal: { fontSize: 12, bold: true, color: '#0f172a' },
      cellText: { fontSize: 9, color: '#334155' },
      numCell: { fontSize: 9, color: '#334155', alignment: 'right' }
    },
    defaultStyle: { font: 'Roboto' }
  };

  const safeTitle = report.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const filename = `esg-${safeTitle}-${report.period.replace(/\s+/g, '')}.pdf`;
  
  pdfMake.createPdf(docDefinition).download(filename);
}
