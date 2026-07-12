import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import {
  Plus, Pencil, Trash2, ClipboardList, AlertCircle,
} from 'lucide-react';

import { DataTable } from '@/components/shared/DataTable';
import { PageHeader } from '@/components/shared/PageHeader';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';

import { useAuth } from '@/lib/hooks/useAuth';
import {
  useCsrActivities, useCsrCategories, useDepartments,
  useCreateCsrActivity, useUpdateCsrActivity, useDeleteCsrActivity,
} from '../hooks';
import { csrActivitySchema, type CsrActivityFormValues } from '../schemas';
import type { CsrActivity } from '../api';

// ─── Column definitions ───────────────────────────────────────────────────────
function buildColumns(
  canEdit: boolean,
  onEdit: (a: CsrActivity) => void,
  onDelete: (a: CsrActivity) => void,
): ColumnDef<CsrActivity>[] {
  return [
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => (
        <span className="font-medium">{row.original.title}</span>
      ),
    },
    {
      id: 'category',
      header: 'Category',
      cell: ({ row }) => {
        const cat = (row.original as unknown as { category?: { name: string } }).category;
        return <span className="text-sm text-muted-foreground">{cat?.name ?? '–'}</span>;
      },
    },
    {
      id: 'department',
      header: 'Department',
      cell: ({ row }) => {
        const dept = (row.original as unknown as { department?: { name: string } }).department;
        return <span className="text-sm text-muted-foreground">{dept?.name ?? '–'}</span>;
      },
    },
    {
      accessorKey: 'activity_date',
      header: 'Date',
      cell: ({ row }) => (
        <span className="text-sm tabular-nums">{row.original.activity_date ?? '–'}</span>
      ),
    },
    {
      accessorKey: 'points',
      header: 'Points',
      cell: ({ row }) => (
        <span className="text-sm tabular-nums font-semibold">{row.original.points}</span>
      ),
    },
    {
      accessorKey: 'capacity',
      header: 'Capacity',
      cell: ({ row }) => (
        <span className="text-sm tabular-nums">{row.original.capacity ?? '–'}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.status === 'active' ? 'default' : 'secondary'}>
          {row.original.status}
        </Badge>
      ),
    },
    ...(canEdit
      ? [
          {
            id: 'actions',
            header: '',
            cell: ({ row }: { row: { original: CsrActivity } }) => (
              <div className="flex items-center gap-2 justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label="Edit activity"
                  onClick={() => onEdit(row.original)}
                >
                  <Pencil size={14} />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  aria-label="Delete activity"
                  onClick={() => onDelete(row.original)}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            ),
          } as ColumnDef<CsrActivity>,
        ]
      : []),
  ];
}

// ─── Activity form dialog ─────────────────────────────────────────────────────
function ActivityDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: CsrActivity | null;
}) {
  const { data: categories = [] } = useCsrCategories();
  const { data: departments = [] } = useDepartments();
  const createMutation = useCreateCsrActivity();
  const updateMutation = useUpdateCsrActivity();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<CsrActivityFormValues, any, CsrActivityFormValues>({
    resolver: zodResolver(csrActivitySchema) as any,
    defaultValues: editing
      ? {
          title: editing.title ?? '',
          category_id: editing.category_id ?? '',
          department_id: editing.department_id ?? '',
          description: editing.description ?? '',
          activity_date: editing.activity_date ?? '',
          location: editing.location ?? '',
          points: editing.points ?? 0,
          capacity: editing.capacity ?? 10,
          status: (editing.status as 'active' | 'inactive') ?? 'active',
        }
      : { status: 'active', points: 0, capacity: 10 },
  });

  const onSubmit = async (values: CsrActivityFormValues) => {
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, payload: values });
        toast.success('Activity updated');
      } else {
        await createMutation.mutateAsync(values);
        toast.success('Activity created');
      }
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit CSR Activity' : 'New CSR Activity'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Title */}
          <div className="space-y-1">
            <Label htmlFor="act-title">Title</Label>
            <Input id="act-title" {...register('title')} placeholder="Tree planting drive" />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          {/* Category (csr_activity only) */}
          <div className="space-y-1">
            <Label>Category</Label>
            <Select
              value={watch('category_id')}
              onValueChange={v => setValue('category_id', v, { shouldValidate: true })}
            >
              <SelectTrigger id="act-category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category_id && <p className="text-xs text-destructive">{errors.category_id.message}</p>}
          </div>

          {/* Department */}
          <div className="space-y-1">
            <Label>Department</Label>
            <Select
              value={watch('department_id')}
              onValueChange={v => setValue('department_id', v, { shouldValidate: true })}
            >
              <SelectTrigger id="act-department">
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.department_id && <p className="text-xs text-destructive">{errors.department_id.message}</p>}
          </div>

          {/* Date + Location */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="act-date">Date</Label>
              <Input id="act-date" type="date" {...register('activity_date')} />
              {errors.activity_date && <p className="text-xs text-destructive">{errors.activity_date.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="act-location">Location</Label>
              <Input id="act-location" {...register('location')} placeholder="Optional" />
            </div>
          </div>

          {/* Points + Capacity */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="act-points">Points</Label>
              <Input id="act-points" type="number" min={0} {...register('points')} />
              {errors.points && <p className="text-xs text-destructive">{errors.points.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="act-capacity">Capacity</Label>
              <Input id="act-capacity" type="number" min={1} {...register('capacity')} />
              {errors.capacity && <p className="text-xs text-destructive">{errors.capacity.message}</p>}
            </div>
          </div>

          {/* Status */}
          <div className="space-y-1">
            <Label>Status</Label>
            <Select
              value={watch('status')}
              onValueChange={v => setValue('status', v as 'active' | 'inactive', { shouldValidate: true })}
            >
              <SelectTrigger id="act-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : editing ? 'Save Changes' : 'Create Activity'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function CsrActivitiesPage() {
  const { role } = useAuth();
  const canEdit = role === 'admin' || role === 'manager';

  const { data: activities, isLoading, error } = useCsrActivities();
  const deleteMutation = useDeleteCsrActivity();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CsrActivity | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CsrActivity | null>(null);

  const handleEdit = (a: CsrActivity) => { setEditing(a); setDialogOpen(true); };
  const handleDelete = (a: CsrActivity) => setDeleteTarget(a);
  const handleCreate = () => { setEditing(null); setDialogOpen(true); };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success('Activity deleted');
    } catch {
      toast.error('Failed to delete activity');
    }
    setDeleteTarget(null);
  };

  const columns = buildColumns(canEdit, handleEdit, handleDelete);

  if (error) {
    return (
      <div className="p-6">
        <PageHeader title="CSR Activities" />
        <Card>
          <CardContent className="flex items-center gap-2 py-8 text-destructive">
            <AlertCircle size={16} />
            <span>Failed to load activities. Please refresh.</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="CSR Activities"
        description="Corporate social responsibility activities available for employee participation"
        action={
          canEdit ? (
            <Button onClick={handleCreate} id="btn-create-csr-activity">
              <Plus size={16} className="mr-2" />
              New Activity
            </Button>
          ) : undefined
        }
      />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded" />)}
        </div>
      ) : !activities || activities.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
            <ClipboardList size={40} strokeWidth={1.5} />
            <p className="text-sm">No CSR activities yet.</p>
            {canEdit && (
              <Button variant="outline" size="sm" onClick={handleCreate}>
                <Plus size={14} className="mr-1" /> Create the first activity
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <DataTable columns={columns} data={activities as CsrActivity[]} />
      )}

      <ActivityDialog
        open={dialogOpen}
        onOpenChange={open => { setDialogOpen(open); if (!open) setEditing(null); }}
        editing={editing}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={open => !open && setDeleteTarget(null)}
        title="Delete Activity"
        description={`Are you sure you want to delete "${deleteTarget?.title}"? This cannot be undone.`}
        confirmText="Delete"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
