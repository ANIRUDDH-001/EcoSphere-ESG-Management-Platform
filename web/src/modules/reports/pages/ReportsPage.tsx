import { useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { ReportFilters } from '../components/ReportFilters';
import { EnvironmentalReport } from '../components/EnvironmentalReport';
import { SocialReport } from '../components/SocialReport';
import { GovernanceReport } from '../components/GovernanceReport';
import { EsgSummaryReport } from '../components/EsgSummaryReport';
import { CustomReport } from '../components/CustomReport';
import type { ReportFilters as FiltersType } from '../api';

export function ReportsPage() {
  const [filters, setFilters] = useState<FiltersType>({
    departmentId: undefined,
    fromDate: undefined,
    toDate: undefined
  });

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <PageHeader
        title="ESG Reports"
        description="Generate, customize, and export standard and custom ESG performance reports."
      />

      <Tabs defaultValue="esg_summary" className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
          <TabsList>
            <TabsTrigger value="esg_summary">ESG Summary</TabsTrigger>
            <TabsTrigger value="environmental">Environmental</TabsTrigger>
            <TabsTrigger value="social">Social</TabsTrigger>
            <TabsTrigger value="governance">Governance</TabsTrigger>
            <TabsTrigger value="custom">Custom Builder</TabsTrigger>
          </TabsList>
        </div>

        {/* Filters shown for all standard reports, not custom builder (which has its own config panel) */}
        <TabsContent value="esg_summary" className="space-y-6">
          <ReportFilters filters={filters} onChange={setFilters} />
          <EsgSummaryReport filters={filters} />
        </TabsContent>

        <TabsContent value="environmental" className="space-y-6">
          <ReportFilters filters={filters} onChange={setFilters} />
          <EnvironmentalReport filters={filters} />
        </TabsContent>

        <TabsContent value="social" className="space-y-6">
          <ReportFilters filters={filters} onChange={setFilters} />
          <SocialReport filters={filters} />
        </TabsContent>

        <TabsContent value="governance" className="space-y-6">
          <ReportFilters filters={filters} onChange={setFilters} />
          <GovernanceReport filters={filters} />
        </TabsContent>

        <TabsContent value="custom" className="space-y-6">
          <CustomReport />
        </TabsContent>
      </Tabs>
    </div>
  );
}
