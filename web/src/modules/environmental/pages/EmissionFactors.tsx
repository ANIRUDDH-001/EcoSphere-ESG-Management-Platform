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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../../components/ui/dialog';
import { Badge } from '../../../components/ui/badge';
import { PageHeader } from '../../../components/shared/PageHeader';
import { useFactors, useCreateFactor, useUpdateFactor, useArchiveFactor } from '../hooks';
import { emissionFactorSchema, type EmissionFactorFormValues } from '../schemas';
import type { Database } from '../../../types/database';

type EmissionFactorRow = Database['public']['Tables']['emission_factors']['Row'];

export const EmissionFactors = () => {
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [sourceTypeFilter, setSourceTypeFilter] = useState<string>('all');
  
  const { data: factors = [] } = useFactors(statusFilter === 'all' ? undefined : statusFilter);
  const createMutation = useCreateFactor();
  const updateMutation = useUpdateFactor();
  const archiveMutation = useArchiveFactor();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFactor, setEditingFactor] = useState<EmissionFactorRow | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);

  const filteredFactors = useMemo(() => {
    if (sourceTypeFilter === 'all') return factors;
    return factors.filter(f => f.source_type === sourceTypeFilter);
  }, [factors, sourceTypeFilter]);

  const form = useForm<EmissionFactorFormValues>({
    resolver: zodResolver(emissionFactorSchema),
    defaultValues: {
      name: '',
      source_type: 'purchase',
      unit: '',
      factor_kgco2e: 0,
      reference: '',
      valid_from: new Date().toISOString().split('T')[0],
      valid_to: '',
      status: 'active'
    }
  });

  const onSubmit = async (values: EmissionFactorFormValues) => {
    // Uniqueness guard
    const isDuplicate = factors.some(f => 
      f.id !== editingFactor?.id &&
      f.status === 'active' && 
      f.source_type === values.source_type &&
      f.unit === values.unit &&
      ((!f.valid_to && !values.valid_to) || (f.valid_to === values.valid_to))
    );
    
    if (isDuplicate) {
      if (!window.confirm('Warning: An active factor with the same source type and unit already exists. Auto-calculation might resolve ambiguously. Proceed anyway?')) {
        return;
      }
    }

    try {
      if (editingFactor) {
        await updateMutation.mutateAsync({ id: editingFactor.id, input: values });
      } else {
        await createMutation.mutateAsync(values);
      }
      setIsDialogOpen(false);
      form.reset();
      setEditingFactor(null);
    } catch (error) {
      console.error(error);
    }
  };

  const openEdit = (factor: EmissionFactorRow) => {
    setEditingFactor(factor);
    form.reset({
      name: factor.name || '',
      source_type: factor.source_type || 'purchase',
      unit: factor.unit || '',
      factor_kgco2e: factor.factor_kgco2e || 0,
      reference: factor.reference || '',
      valid_from: factor.valid_from || '',
      valid_to: factor.valid_to || '',
      status: factor.status || 'active'
    });
    setIsDialogOpen(true);
  };

  const handleArchive = async () => {
    if (archivingId) {
      await archiveMutation.mutateAsync(archivingId);
      setArchivingId(null);
    }
  };

  const columns: ColumnDef<EmissionFactorRow>[] = [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'source_type', header: 'Source Type' },
    { accessorKey: 'unit', header: 'Unit' },
    { accessorKey: 'factor_kgco2e', header: 'Factor (kg CO₂e)' },
    { 
      id: 'validity',
      header: 'Validity',
      cell: ({ row }) => `${row.original.valid_from} - ${row.original.valid_to || 'ongoing'}`
    },
    { 
      accessorKey: 'status', 
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.status === 'active' ? 'default' : 'secondary'}>
          {row.original.status}
        </Badge>
      )
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
          {row.original.status === 'active' && (
            <Button variant="ghost" size="icon" onClick={() => setArchivingId(row.original.id)}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          )}
        </div>
      )
    });
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Emission Factors" description="Manage factors used for carbon calculations." />
      
      <div className="flex justify-between items-center">
        <div className="flex gap-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sourceTypeFilter} onValueChange={setSourceTypeFilter}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Source Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="purchase">Purchase</SelectItem>
              <SelectItem value="manufacturing">Manufacturing</SelectItem>
              <SelectItem value="expense">Expense</SelectItem>
              <SelectItem value="fleet">Fleet</SelectItem>
              <SelectItem value="energy">Energy</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            if (!open) {
              setEditingFactor(null);
              form.reset();
            }
            setIsDialogOpen(open);
          }}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" /> New Factor</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingFactor ? 'Edit Factor' : 'New Emission Factor'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField label="Name" id="name" error={form.formState.errors.name?.message}>
                  <Input id="name" {...form.register('name')} />
                </FormField>
                <FormField label="Source Type" id="source_type" error={form.formState.errors.source_type?.message}>
                  <Select onValueChange={(v) => form.setValue('source_type', v as any)} defaultValue={form.getValues('source_type')}>
                    <SelectTrigger id="source_type"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="purchase">Purchase</SelectItem>
                      <SelectItem value="manufacturing">Manufacturing</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                      <SelectItem value="fleet">Fleet</SelectItem>
                      <SelectItem value="energy">Energy</SelectItem>
                      <SelectItem value="manual">Manual</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Unit" id="unit" error={form.formState.errors.unit?.message}>
                  <Input id="unit" {...form.register('unit')} />
                </FormField>
                <FormField label="Factor (kg CO₂e per unit)" id="factor_kgco2e" error={form.formState.errors.factor_kgco2e?.message}>
                  <Input type="number" step="any" id="factor_kgco2e" {...form.register('factor_kgco2e', { valueAsNumber: true })} />
                </FormField>
                <FormField label="Valid From" id="valid_from" error={form.formState.errors.valid_from?.message}>
                  <Input type="date" id="valid_from" {...form.register('valid_from')} />
                </FormField>
                <FormField label="Valid To (optional)" id="valid_to" error={form.formState.errors.valid_to?.message}>
                  <Input type="date" id="valid_to" {...form.register('valid_to')} />
                </FormField>
                <FormField label="Reference" id="reference" error={form.formState.errors.reference?.message}>
                  <Input id="reference" {...form.register('reference')} />
                </FormField>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {editingFactor ? 'Save Changes' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <DataTable columns={columns} data={filteredFactors} />

      <ConfirmDialog
        open={!!archivingId}
        onOpenChange={(open) => !open && setArchivingId(null)}
        title="Archive Emission Factor?"
        description="Archiving this factor will hide it from new carbon transactions. Existing transactions will retain their computed CO₂e."
        onConfirm={handleArchive}
      />
    </div>
  );
};
