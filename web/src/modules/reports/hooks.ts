import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  fetchEnvironmentalReport, 
  fetchSocialReport, 
  fetchGovernanceReport, 
  fetchEsgSummaryReport, 
  postReportSummary,
  fetchDepartments,
} from './api';
import type { ReportFilters, ReportSummaryPayload } from './api';

export const reportKeys = {
  all: ['reports'] as const,
  type: (type: string, filters: ReportFilters) => ['reports', type, filters] as const,
  departments: ['reports', 'departments'] as const,
};

export function useDepartments() {
  return useQuery({
    queryKey: reportKeys.departments,
    queryFn: () => fetchDepartments()
  });
}

export function useReportData(type: 'environmental' | 'social' | 'governance' | 'esg_summary', filters: ReportFilters) {
  return useQuery({
    queryKey: reportKeys.type(type, filters),
    queryFn: () => {
      switch (type) {
        case 'environmental':
          return fetchEnvironmentalReport(filters);
        case 'social':
          return fetchSocialReport(filters);
        case 'governance':
          return fetchGovernanceReport(filters);
        case 'esg_summary':
          return fetchEsgSummaryReport(filters);
      }
    },
    staleTime: 60 * 1000
  });
}

export function useReportSummary() {
  return useMutation({
    mutationFn: (payload: ReportSummaryPayload) => postReportSummary(payload),
  });
}
