import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useDepartments } from '../hooks';
import type { ReportFilters as FiltersType } from '../api';

interface ReportFiltersProps {
  filters: FiltersType;
  onChange: (filters: FiltersType) => void;
}

export function ReportFilters({ filters, onChange }: ReportFiltersProps) {
  const { data: departments = [] } = useDepartments();

  const handleDeptChange = (val: string) => {
    onChange({
      ...filters,
      departmentId: val === 'all' ? undefined : val
    });
  };

  const handleFromDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...filters,
      fromDate: e.target.value || undefined
    });
  };

  const handleToDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...filters,
      toDate: e.target.value || undefined
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/40 p-4 rounded-lg border">
      <div className="space-y-1">
        <Label htmlFor="filter-dept">Department</Label>
        <Select 
          value={filters.departmentId || 'all'} 
          onValueChange={handleDeptChange}
        >
          <SelectTrigger id="filter-dept">
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((d: any) => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="filter-from">From Date</Label>
        <Input 
          id="filter-from"
          type="date"
          value={filters.fromDate || ''}
          onChange={handleFromDateChange}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="filter-to">To Date</Label>
        <Input 
          id="filter-to"
          type="date"
          value={filters.toDate || ''}
          onChange={handleToDateChange}
        />
      </div>
    </div>
  );
}
