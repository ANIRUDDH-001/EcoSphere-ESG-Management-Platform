import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus, Pencil, Trash2, Tag, AlertCircle } from 'lucide-react';

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
import { supabaseClient } from '@/lib/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Zod validation schema
const categoryFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  type: z.enum(['csr_activity', 'challenge']),
  status: z.enum(['active', 'inactive']),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

interface Category {
  id: string;
  name: string;
  type: 'csr_activity' | 'challenge';
  status: string;
  created_at: string;
}

// ─── Columns Builder ─────────────────────────────────────────────────────────
function buildColumns(
  canEdit: boolean,
  onEdit: (c: Category) => void,
  onDelete: (c: Category) => void,
): ColumnDef<Category>[] {
  return [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => (
        <span className="capitalize text-xs font-semibold px-2 py-1 rounded bg-secondary">
          {row.original.type.replace('_', ' ')}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <span className={`text-xs font-semibold capitalize ${row.original.status === 'active' ? 'text-green-600' : 'text-muted-foreground'}`}>
          {row.original.status}
        </span>
      ),
    },
    ...(canEdit
      ? [
          {
            id: 'actions',
            header: '',
            cell: ({ row }: { row: { original: Category } }) => (
              <div className="flex items-center gap-2 justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label="Edit category"
                  onClick={() => onEdit(row.original)}
                >
                  <Pencil size={14} />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  aria-label="Delete category"
                  onClick={() => onDelete(row.original)}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            ),
          } as ColumnDef<Category>,
        ]
      : []),
  ];
}

// ─── Dialog Component ────────────────────────────────────────────────────────
function CategoryDialog({
  open,
  onOpenChange,
  editing,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Category | null;
  onSuccess: () => void;
}) {


  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<CategoryFormValues, any, CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema) as any,
    defaultValues: editing
      ? {
          name: editing.name ?? '',
          type: editing.type ?? 'csr_activity',
          status: (editing.status as any) ?? 'active',
        }
      : { type: 'csr_activity', status: 'active' },
  });

  const onSubmit = async (values: CategoryFormValues) => {
    try {
      if (editing) {
        const { error } = await supabaseClient
          .from('categories')
          .update(values)
          .eq('id', editing.id);
        if (error) throw error;
        toast.success('Category updated successfully');
      } else {
        const { error } = await supabaseClient
          .from('categories')
          .insert(values);
        if (error) throw error;
        toast.success('Category created successfully');
      }
      onSuccess();
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save category');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit Category' : 'Create Category'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="cat-name">Name</Label>
            <Input id="cat-name" placeholder="e.g. Energy Efficiency" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-1">
            <Label>Type</Label>
            <Select
              value={watch('type')}
              onValueChange={v => setValue('type', v as any, { shouldValidate: true })}
            >
              <SelectTrigger id="cat-type">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csr_activity">CSR Activity</SelectItem>
                <SelectItem value="challenge">Challenge</SelectItem>
              </SelectContent>
            </Select>
            {errors.type && <p className="text-xs text-destructive">{errors.type.message}</p>}
          </div>

          <div className="space-y-1">
            <Label>Status</Label>
            <Select
              value={watch('status')}
              onValueChange={v => setValue('status', v as any, { shouldValidate: true })}
            >
              <SelectTrigger id="cat-status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            {errors.status && <p className="text-xs text-destructive">{errors.status.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : editing ? 'Save Changes' : 'Create Category'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export function CategoriesPage() {
  const { role } = useAuth();
  const canEdit = role === 'admin';
  const qc = useQueryClient();

  const { data: categories, isLoading, error } = useQuery<Category[]>({
    queryKey: ['categories_all'],
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from('categories')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Category[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabaseClient.from('categories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories_all'] });
      toast.success('Category deleted');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    },
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  const handleEdit = (c: Category) => { setEditing(c); setDialogOpen(true); };
  const handleDelete = (c: Category) => setDeleteTarget(c);
  const handleCreate = () => { setEditing(null); setDialogOpen(true); };

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  const columns = buildColumns(canEdit, handleEdit, handleDelete);

  if (error) {
    return (
      <div className="p-6">
        <PageHeader title="Categories Manager" />
        <Card>
          <CardContent className="flex items-center gap-2 py-8 text-destructive">
            <AlertCircle size={16} />
            <span>Failed to load categories. Please refresh.</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Categories Manager"
        description="Configure ESG categories for CSR activities and Sustainability challenges"
        action={
          canEdit ? (
            <Button onClick={handleCreate} id="btn-create-category">
              <Plus size={16} className="mr-2" />
              Add Category
            </Button>
          ) : undefined
        }
      />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded" />)}
        </div>
      ) : !categories || categories.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
            <Tag size={40} strokeWidth={1.5} />
            <p className="text-sm">No categories configured yet.</p>
          </CardContent>
        </Card>
      ) : (
        <DataTable columns={columns} data={categories} />
      )}

      <CategoryDialog
        open={dialogOpen}
        onOpenChange={open => { setDialogOpen(open); if (!open) setEditing(null); }}
        editing={editing}
        onSuccess={() => qc.invalidateQueries({ queryKey: ['categories_all'] })}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={open => !open && setDeleteTarget(null)}
        title="Delete Category"
        description={`Are you sure you want to delete category "${deleteTarget?.name}"?`}
        confirmText="Delete"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
