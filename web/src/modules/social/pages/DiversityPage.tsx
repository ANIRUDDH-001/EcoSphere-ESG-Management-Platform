import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus, Pencil, Trash2, Users, AlertCircle } from 'lucide-react';

import { DataTable } from '@/components/shared/DataTable';
import { PageHeader } from '@/components/shared/PageHeader';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

import { useAuth } from '@/lib/hooks/useAuth';
import {
  useDiversityMetrics, useDepartments,
  useUpsertDiversityMetric, useDeleteDiversityMetric,
} from '../hooks';
import { diversityMetricSchema, type DiversityMetricFormValues } from '../schemas';
import type { DiversityMetric } from '../api';

type DiversityRow = DiversityMetric & {
  department?: { name: string } | null;
};

// ─── Columns Builder ─────────────────────────────────────────────────────────
function buildColumns(
  canEdit: boolean,
  onEdit: (d: DiversityMetric) => void,
  onDelete: (d: DiversityMetric) => void,
): ColumnDef<DiversityRow>[] {
  return [
    {
      id: 'department',
      header: 'Department',
      cell: ({ row }) => (
        <span className="font-medium">{row.original.department?.name ?? '–'}</span>
      ),
    },
    {
      accessorKey: 'period',
      header: 'Period',
      cell: ({ row }) => (
        <span className="text-sm font-medium tabular-nums">{row.original.period}</span>
      ),
    },
    {
      accessorKey: 'gender_ratio',
      header: 'Gender Ratio (F:M)',
      cell: ({ row }) => (
        <span className="text-sm tabular-nums">{row.original.gender_ratio}</span>
      ),
    },
    {
      accessorKey: 'avg_tenure',
      header: 'Avg Tenure (years)',
      cell: ({ row }) => (
        <span className="text-sm tabular-nums">{row.original.avg_tenure}</span>
      ),
    },
    {
      accessorKey: 'training_hours',
      header: 'Training Hours',
      cell: ({ row }) => (
        <span className="text-sm tabular-nums">{row.original.training_hours}</span>
      ),
    },
    {
      accessorKey: 'headcount',
      header: 'Headcount',
      cell: ({ row }) => (
        <span className="text-sm tabular-nums">{row.original.headcount}</span>
      ),
    },
    ...(canEdit
      ? [
          {
            id: 'actions',
            header: '',
            cell: ({ row }: { row: { original: DiversityRow } }) => (
              <div className="flex items-center gap-2 justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label="Edit metric"
                  onClick={() => onEdit(row.original)}
                >
                  <Pencil size={14} />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  aria-label="Delete metric"
                  onClick={() => onDelete(row.original)}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            ),
          } as ColumnDef<DiversityRow>,
        ]
      : []),
  ];
}

// ─── Dialog Component ────────────────────────────────────────────────────────
function DiversityDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: DiversityMetric | null;
}) {
  const { data: departments = [] } = useDepartments();
  const upsertMutation = useUpsertDiversityMetric();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<DiversityMetricFormValues, any, DiversityMetricFormValues>({
    resolver: zodResolver(diversityMetricSchema) as any,
    defaultValues: editing
      ? {
          department_id: editing.department_id ?? '',
          period: editing.period ?? '',
          gender_ratio: editing.gender_ratio ?? 0.5,
          avg_tenure: editing.avg_tenure ?? 0,
          training_hours: editing.training_hours ?? 0,
          headcount: editing.headcount ?? 1,
        }
      : { gender_ratio: 0.5, avg_tenure: 0, training_hours: 0, headcount: 1 },
  });

  const onSubmit = async (values: DiversityMetricFormValues) => {
    try {
      await upsertMutation.mutateAsync(values);
      toast.success(editing ? 'Diversity metrics updated' : 'Diversity metrics recorded');
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit Diversity Metrics' : 'Record Diversity Metrics'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Department */}
          <div className="space-y-1">
            <Label>Department</Label>
            {editing ? (
              <Input
                disabled
                value={departments.find(d => d.id === editing.department_id)?.name ?? ''}
              />
            ) : (
              <Select
                value={watch('department_id')}
                onValueChange={v => setValue('department_id', v, { shouldValidate: true })}
              >
                <SelectTrigger id="div-department">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {errors.department_id && <p className="text-xs text-destructive">{errors.department_id.message}</p>}
          </div>

          {/* Period */}
          <div className="space-y-1">
            <Label htmlFor="div-period">Period</Label>
            <Input
              id="div-period"
              disabled={!!editing}
              placeholder="e.g. 2026-Q1"
              {...register('period')}
            />
            {errors.period && <p className="text-xs text-destructive">{errors.period.message}</p>}
          </div>

          {/* Gender Ratio + Avg Tenure */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="div-gender">Gender Ratio (F:M)</Label>
              <Input id="div-gender" type="number" step="0.01" min={0} max={1} {...register('gender_ratio')} />
              {errors.gender_ratio && <p className="text-xs text-destructive">{errors.gender_ratio.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="div-tenure">Avg Tenure (yrs)</Label>
              <Input id="div-tenure" type="number" step="0.1" min={0} {...register('avg_tenure')} />
              {errors.avg_tenure && <p className="text-xs text-destructive">{errors.avg_tenure.message}</p>}
            </div>
          </div>

          {/* Training Hours + Headcount */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="div-training">Training Hours</Label>
              <Input id="div-training" type="number" min={0} {...register('training_hours')} />
              {errors.training_hours && <p className="text-xs text-destructive">{errors.training_hours.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="div-headcount">Headcount</Label>
              <Input id="div-headcount" type="number" min={1} {...register('headcount')} />
              {errors.headcount && <p className="text-xs text-destructive">{errors.headcount.message}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : editing ? 'Save Changes' : 'Record Metrics'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export function DiversityPage() {
  const { role, profile } = useAuth();
  const canEdit = role === 'admin' || role === 'manager';
  const deptId = role === 'manager' ? (profile?.department_id ?? undefined) : undefined;

  const { data: metrics, isLoading, error } = useDiversityMetrics(deptId);
  const deleteMutation = useDeleteDiversityMetric();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DiversityMetric | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DiversityMetric | null>(null);

  const handleEdit = (d: DiversityMetric) => { setEditing(d); setDialogOpen(true); };
  const handleDelete = (d: DiversityMetric) => setDeleteTarget(d);
  const handleCreate = () => { setEditing(null); setDialogOpen(true); };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success('Metrics deleted');
    } catch {
      toast.error('Failed to delete metrics');
    }
    setDeleteTarget(null);
  };

  const columns = buildColumns(canEdit, handleEdit, handleDelete);

  if (error) {
    return (
      <div className="p-6">
        <PageHeader title="Diversity Metrics" />
        <Card>
          <CardContent className="flex items-center gap-2 py-8 text-destructive">
            <AlertCircle size={16} />
            <span>Failed to load diversity metrics. Please refresh.</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Diversity Metrics"
        description="Record and track gender distribution, tenure, training hours, and headcount per department"
        action={
          canEdit ? (
            <Button onClick={handleCreate} id="btn-record-diversity">
              <Plus size={16} className="mr-2" />
              Record Metrics
            </Button>
          ) : undefined
        }
      />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded" />)}
        </div>
      ) : !metrics || metrics.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
            <Users size={40} strokeWidth={1.5} />
            <p className="text-sm">No diversity metrics recorded yet.</p>
            {canEdit && (
              <Button variant="outline" size="sm" onClick={handleCreate}>
                <Plus size={14} className="mr-1" /> Record metrics now
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <DataTable columns={columns} data={metrics as DiversityRow[]} />
      )}

      <DiversityDialog
        open={dialogOpen}
        onOpenChange={open => { setDialogOpen(open); if (!open) setEditing(null); }}
        editing={editing}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={open => !open && setDeleteTarget(null)}
        title="Delete Diversity Metrics"
        description={`Are you sure you want to delete diversity metrics for period "${deleteTarget?.period}"?`}
        confirmText="Delete"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
