import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { type ColumnDef } from '@tanstack/react-table';
import { Plus, Pencil, Trash2 } from 'lucide-react';

import { useAuth } from '../../../lib/hooks/useAuth';
import { DataTable } from '../../../components/shared/DataTable';
import { FormField } from '../../../components/shared/FormField';
import { ConfirmDialog } from '../../../components/shared/ConfirmDialog';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../../components/ui/dialog';
import { Badge } from '../../../components/ui/badge';
import { PageHeader } from '../../../components/shared/PageHeader';
import { useGoals, useCreateGoal, useUpdateGoal, useDeleteGoal } from '../hooks';
import { goalSchema, type GoalFormValues } from '../schemas';
import { goalProgressPct } from '../utils';

export const Goals = () => {
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const [filterType, setFilterType] = useState<'all' | 'org' | 'dept'>('all');
  
  const { data: goals = [] } = useGoals();
  const createMutation = useCreateGoal();
  const updateMutation = useUpdateGoal();
  const deleteMutation = useDeleteGoal();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredGoals = useMemo(() => {
    if (filterType === 'org') return goals.filter((g: any) => !g.department_id);
    if (filterType === 'dept') return goals.filter((g: any) => !!g.department_id);
    return goals;
  }, [goals, filterType]);

  const form = useForm<GoalFormValues>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      name: '',
      department_id: '',
      metric: '',
      baseline: 0,
      target: 0,
      target_date: '',
      current_value: 0
    }
  });

  const onSubmit = async (values: GoalFormValues) => {
    try {
      const apiValues = {
        ...values,
        department_id: values.department_id === '' ? null : values.department_id
      };
      
      if (editingGoal) {
        await updateMutation.mutateAsync({ id: editingGoal.id, input: apiValues });
      } else {
        await createMutation.mutateAsync(apiValues);
      }
      setIsDialogOpen(false);
      form.reset();
      setEditingGoal(null);
    } catch (error) {
      console.error(error);
    }
  };

  const openEdit = (goal: any) => {
    setEditingGoal(goal);
    form.reset({
      name: goal.name || '',
      department_id: goal.department_id || '',
      metric: goal.metric || '',
      baseline: goal.baseline || 0,
      target: goal.target || 0,
      target_date: goal.target_date || '',
      current_value: goal.current_value || 0
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    if (deletingId) {
      await deleteMutation.mutateAsync(deletingId);
      setDeletingId(null);
    }
  };

  const columns: ColumnDef<any>[] = [
    { accessorKey: 'name', header: 'Goal Name' },
    { 
      id: 'scope',
      header: 'Scope',
      cell: ({ row }) => row.original.departments?.name || 'Org-wide'
    },
    { accessorKey: 'metric', header: 'Metric' },
    { 
      id: 'progress',
      header: 'Progress',
      cell: ({ row }) => {
        const pct = goalProgressPct(row.original);
        return (
          <div className="w-32 flex items-center gap-2">
            <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
              <div 
                className={`h-full ${pct === 100 ? 'bg-green-500' : 'bg-primary'}`} 
                style={{ width: `${pct}%` }} 
              />
            </div>
            <span className="text-xs text-muted-foreground">{Math.round(pct)}%</span>
          </div>
        );
      }
    },
    { accessorKey: 'target_date', header: 'Target Date' },
    { 
      accessorKey: 'status', 
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.status || 'active';
        return (
          <Badge variant={status === 'achieved' ? 'default' : status === 'missed' ? 'destructive' : 'secondary'}>
            {status}
          </Badge>
        );
      }
    }
  ];

  if (isAdmin) {
    columns.push({
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="icon" onClick={() => openEdit(row.original)}>
            <Pencil className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setDeletingId(row.original.id)}>
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      )
    });
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Environmental Goals" description="Track sustainability targets across the organization." />
      
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Button variant={filterType === 'all' ? 'default' : 'outline'} onClick={() => setFilterType('all')}>All</Button>
          <Button variant={filterType === 'org' ? 'default' : 'outline'} onClick={() => setFilterType('org')}>Org-wide</Button>
          <Button variant={filterType === 'dept' ? 'default' : 'outline'} onClick={() => setFilterType('dept')}>Department</Button>
        </div>

        {isAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            if (!open) {
              setEditingGoal(null);
              form.reset();
            }
            setIsDialogOpen(open);
          }}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" /> New Goal</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingGoal ? 'Edit Goal' : 'New Environmental Goal'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField label="Goal Name" id="name" error={form.formState.errors.name?.message}>
                  <Input id="name" {...form.register('name')} />
                </FormField>
                <FormField label="Department ID (optional, leave empty for org-wide)" id="department_id" error={form.formState.errors.department_id?.message}>
                  <Input id="department_id" {...form.register('department_id')} />
                </FormField>
                <FormField label="Metric" id="metric" error={form.formState.errors.metric?.message}>
                  <Input id="metric" {...form.register('metric')} />
                </FormField>
                <FormField label="Baseline Value" id="baseline" error={form.formState.errors.baseline?.message}>
                  <Input type="number" step="any" id="baseline" {...form.register('baseline', { valueAsNumber: true })} />
                </FormField>
                <FormField label="Target Value" id="target" error={form.formState.errors.target?.message}>
                  <Input type="number" step="any" id="target" {...form.register('target', { valueAsNumber: true })} />
                </FormField>
                <FormField label="Current Value" id="current_value" error={form.formState.errors.current_value?.message}>
                  <Input type="number" step="any" id="current_value" {...form.register('current_value', { valueAsNumber: true })} />
                </FormField>
                <FormField label="Target Date" id="target_date" error={form.formState.errors.target_date?.message}>
                  <Input type="date" id="target_date" {...form.register('target_date')} />
                </FormField>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {editingGoal ? 'Save Changes' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <DataTable columns={columns} data={filteredGoals} />

      <ConfirmDialog
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
        title="Delete Goal?"
        description="Are you sure you want to permanently delete this goal?"
        onConfirm={handleDelete}
      />
    </div>
  );
};
