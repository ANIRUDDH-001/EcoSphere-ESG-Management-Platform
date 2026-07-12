import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus, Pencil, Trash2, Award, AlertCircle } from 'lucide-react';

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
  useTrainingCompletions, useProfiles, useCreateTrainingCompletion,
  useUpdateTrainingCompletion, useDeleteTrainingCompletion,
} from '../hooks';
import { trainingCompletionSchema, type TrainingCompletionFormValues } from '../schemas';
import type { TrainingCompletion } from '../api';

type TrainingRow = TrainingCompletion & {
  employee?: { full_name: string | null; department_id: string | null } | null;
};

// ─── Columns Builder ─────────────────────────────────────────────────────────
function buildColumns(
  canEdit: boolean,
  onEdit: (t: TrainingCompletion) => void,
  onDelete: (t: TrainingCompletion) => void,
): ColumnDef<TrainingRow>[] {
  return [
    {
      id: 'employee',
      header: 'Employee',
      cell: ({ row }) => (
        <span className="font-medium">{row.original.employee?.full_name ?? '–'}</span>
      ),
    },
    {
      accessorKey: 'course_name',
      header: 'Course Name',
      cell: ({ row }) => (
        <span className="text-sm font-medium">{row.original.course_name}</span>
      ),
    },
    {
      accessorKey: 'completion_pct',
      header: 'Completion %',
      cell: ({ row }) => (
        <span className="text-sm font-semibold tabular-nums">{row.original.completion_pct}%</span>
      ),
    },
    {
      accessorKey: 'completed_at',
      header: 'Completed At',
      cell: ({ row }) => (
        <span className="text-sm tabular-nums text-muted-foreground">{row.original.completed_at ?? '–'}</span>
      ),
    },
    ...(canEdit
      ? [
          {
            id: 'actions',
            header: '',
            cell: ({ row }: { row: { original: TrainingRow } }) => (
              <div className="flex items-center gap-2 justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label="Edit training"
                  onClick={() => onEdit(row.original)}
                >
                  <Pencil size={14} />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  aria-label="Delete training"
                  onClick={() => onDelete(row.original)}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            ),
          } as ColumnDef<TrainingRow>,
        ]
      : []),
  ];
}

// ─── Dialog Component ────────────────────────────────────────────────────────
function TrainingDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: TrainingCompletion | null;
}) {
  const { data: profiles = [] } = useProfiles();
  const createMutation = useCreateTrainingCompletion();
  const updateMutation = useUpdateTrainingCompletion();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<TrainingCompletionFormValues, any, TrainingCompletionFormValues>({
    resolver: zodResolver(trainingCompletionSchema) as any,
    defaultValues: editing
      ? {
          employee_id: editing.employee_id ?? '',
          course_name: editing.course_name ?? '',
          completion_pct: editing.completion_pct ?? 100,
          completed_at: editing.completed_at ?? '',
        }
      : { completion_pct: 100 },
  });

  const onSubmit = async (values: TrainingCompletionFormValues) => {
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, payload: values });
        toast.success('Training record updated');
      } else {
        await createMutation.mutateAsync(values);
        toast.success('Training record created');
      }
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
          <DialogTitle>{editing ? 'Edit Training Record' : 'Record Training Completion'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Employee */}
          <div className="space-y-1">
            <Label>Employee</Label>
            {editing ? (
              <Input
                disabled
                value={profiles.find(p => p.id === editing.employee_id)?.full_name ?? ''}
              />
            ) : (
              <Select
                value={watch('employee_id')}
                onValueChange={v => setValue('employee_id', v, { shouldValidate: true })}
              >
                <SelectTrigger id="train-employee">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.full_name || p.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {errors.employee_id && <p className="text-xs text-destructive">{errors.employee_id.message}</p>}
          </div>

          {/* Course Name */}
          <div className="space-y-1">
            <Label htmlFor="train-course">Course Name</Label>
            <Input
              id="train-course"
              placeholder="e.g. ESG Compliance Basics"
              {...register('course_name')}
            />
            {errors.course_name && <p className="text-xs text-destructive">{errors.course_name.message}</p>}
          </div>

          {/* Completion % + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="train-completion">Completion %</Label>
              <Input id="train-completion" type="number" min={0} max={100} {...register('completion_pct')} />
              {errors.completion_pct && <p className="text-xs text-destructive">{errors.completion_pct.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="train-date">Completed At</Label>
              <Input id="train-date" type="date" {...register('completed_at')} />
              {errors.completed_at && <p className="text-xs text-destructive">{errors.completed_at.message}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : editing ? 'Save Changes' : 'Record Completion'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export function TrainingPage() {
  const { role, profile } = useAuth();
  const canEdit = role === 'admin' || role === 'manager';
  const deptId = role === 'manager' ? (profile?.department_id ?? undefined) : undefined;

  const { data: completions, isLoading, error } = useTrainingCompletions(deptId);
  const deleteMutation = useDeleteTrainingCompletion();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TrainingCompletion | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TrainingCompletion | null>(null);

  const handleEdit = (t: TrainingCompletion) => { setEditing(t); setDialogOpen(true); };
  const handleDelete = (t: TrainingCompletion) => setDeleteTarget(t);
  const handleCreate = () => { setEditing(null); setDialogOpen(true); };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success('Training record deleted');
    } catch {
      toast.error('Failed to delete training record');
    }
    setDeleteTarget(null);
  };

  const columns = buildColumns(canEdit, handleEdit, handleDelete);

  if (error) {
    return (
      <div className="p-6">
        <PageHeader title="Training Completions" />
        <Card>
          <CardContent className="flex items-center gap-2 py-8 text-destructive">
            <AlertCircle size={16} />
            <span>Failed to load training completions. Please refresh.</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Training Completions"
        description="Record and track employee professional development and ESG training completion"
        action={
          canEdit ? (
            <Button onClick={handleCreate} id="btn-record-training">
              <Plus size={16} className="mr-2" />
              Record Completion
            </Button>
          ) : undefined
        }
      />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded" />)}
        </div>
      ) : !completions || completions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
            <Award size={40} strokeWidth={1.5} />
            <p className="text-sm">No training completions recorded yet.</p>
            {canEdit && (
              <Button variant="outline" size="sm" onClick={handleCreate}>
                <Plus size={14} className="mr-1" /> Record a completion now
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <DataTable columns={columns} data={completions as TrainingRow[]} />
      )}

      <TrainingDialog
        open={dialogOpen}
        onOpenChange={open => { setDialogOpen(open); if (!open) setEditing(null); }}
        editing={editing}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={open => !open && setDeleteTarget(null)}
        title="Delete Training Record"
        description={`Are you sure you want to delete the training record for "${deleteTarget?.course_name}"?`}
        confirmText="Delete"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
