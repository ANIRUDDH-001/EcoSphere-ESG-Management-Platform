import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { type ColumnDef } from '@tanstack/react-table';
import { Plus, Trash2 } from 'lucide-react';

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
import { useCarbon, useCreateCarbon, useDeleteCarbon, type CarbonFilter } from '../hooks';
import { useFactors } from '../hooks';
import { carbonTxnSchema, type CarbonTxnFormValues } from '../schemas';
import { computeCo2e } from '../../../lib/emissions';

const SOURCE_TYPES = ['purchase', 'manufacturing', 'expense', 'fleet', 'energy', 'manual'] as const;

export const CarbonTransactions = () => {
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const isManager = role === 'manager' || isAdmin;

  const [filter, setFilter] = useState<CarbonFilter>({});
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [preview, setPreview] = useState<number | null>(null);

  const { data: transactions = [] } = useCarbon(filter);
  const { data: factors = [] } = useFactors('active');
  const createMutation = useCreateCarbon();
  const deleteMutation = useDeleteCarbon();

  const form = useForm<CarbonTxnFormValues>({
    resolver: zodResolver(carbonTxnSchema),
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
      department_id: '',
      source_type: 'manual',
      quantity: 0,
      emission_factor_id: '',
      note: ''
    }
  });

  const watchedQuantity = form.watch('quantity');
  const watchedFactorId = form.watch('emission_factor_id');
  const watchedSourceType = form.watch('source_type');

  // Compute live preview whenever quantity or factor changes
  useEffect(() => {
    if (watchedFactorId && watchedQuantity > 0) {
      const factor = factors.find((f: any) => f.id === watchedFactorId);
      if (factor) {
        setPreview(computeCo2e(watchedQuantity, factor.factor_kgco2e ?? 0));
      }
    } else {
      setPreview(null);
    }
  }, [watchedQuantity, watchedFactorId, factors]);

  // Filter factors by source_type when source_type is not 'manual'
  const filteredFactors = watchedSourceType === 'manual'
    ? factors
    : factors.filter((f: any) => f.source_type === watchedSourceType);

  const onSubmit = async (values: CarbonTxnFormValues) => {
    try {
      await createMutation.mutateAsync({
        ...values,
        department_id: values.department_id || null
      });
      setIsDialogOpen(false);
      form.reset({ date: new Date().toISOString().slice(0, 10), source_type: 'manual', quantity: 0, emission_factor_id: '', department_id: '', note: '' });
      setPreview(null);
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async () => {
    if (deletingId) {
      await deleteMutation.mutateAsync(deletingId);
      setDeletingId(null);
    }
  };

  const columns: ColumnDef<any>[] = [
    { accessorKey: 'date', header: 'Date' },
    {
      id: 'department',
      header: 'Department',
      cell: ({ row }) => row.original.departments?.name || 'Org-wide'
    },
    { accessorKey: 'source_type', header: 'Source Type' },
    {
      id: 'quantity',
      header: 'Quantity',
      cell: ({ row }) => `${row.original.quantity} ${row.original.emission_factors?.unit || ''}`
    },
    {
      accessorKey: 'co2e',
      header: 'CO₂e (kg)',
      cell: ({ row }) => row.original.co2e?.toFixed(2) ?? '—'
    },
    {
      id: 'is_auto',
      header: 'Type',
      cell: ({ row }) => (
        <Badge variant={row.original.is_auto ? 'secondary' : 'outline'}>
          {row.original.is_auto ? 'auto' : 'manual'}
        </Badge>
      )
    },
    { accessorKey: 'note', header: 'Note' }
  ];

  if (isManager) {
    columns.push({
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button variant="ghost" size="icon" onClick={() => setDeletingId(row.original.id)}>
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      )
    });
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Carbon Transactions" description="Manual and auto-calculated carbon emission records." />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Source Type</label>
          <Select value={filter.source_type || 'all'} onValueChange={(v: string) => setFilter(f => ({ ...f, source_type: v === 'all' ? undefined : v as any }))}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {SOURCE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">From</label>
          <Input type="date" className="w-36" value={filter.date_from || ''} onChange={e => setFilter(f => ({ ...f, date_from: e.target.value || undefined }))} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">To</label>
          <Input type="date" className="w-36" value={filter.date_to || ''} onChange={e => setFilter(f => ({ ...f, date_to: e.target.value || undefined }))} />
        </div>
        <Button variant="ghost" onClick={() => setFilter({})}>Clear</Button>

        {isManager && (
          <div className="ml-auto">
            <Dialog open={isDialogOpen} onOpenChange={(open: boolean) => {
              if (!open) { form.reset({ date: new Date().toISOString().slice(0, 10), source_type: 'manual', quantity: 0, emission_factor_id: '', department_id: '', note: '' }); setPreview(null); }
              setIsDialogOpen(open);
            }}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-2" /> Log Transaction</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Log Carbon Transaction</DialogTitle>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField label="Date" id="date" error={form.formState.errors.date?.message}>
                    <Input type="date" id="date" {...form.register('date')} />
                  </FormField>
                  <FormField label="Department ID (optional)" id="department_id" error={form.formState.errors.department_id?.message}>
                    <Input id="department_id" {...form.register('department_id')} />
                  </FormField>
                  <FormField label="Source Type" id="source_type" error={form.formState.errors.source_type?.message}>
                    <Select value={form.watch('source_type')} onValueChange={(v: string) => form.setValue('source_type', v as any)}>
                      <SelectTrigger id="source_type"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SOURCE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormField>
                  <FormField label="Emission Factor" id="emission_factor_id" error={form.formState.errors.emission_factor_id?.message}>
                    <Select value={form.watch('emission_factor_id')} onValueChange={(v: string) => form.setValue('emission_factor_id', v)}>
                      <SelectTrigger id="emission_factor_id"><SelectValue placeholder="Select factor…" /></SelectTrigger>
                      <SelectContent>
                        {filteredFactors.map((f: any) => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.name} — {f.factor_kgco2e} kg CO₂e/{f.unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                  <FormField label="Quantity" id="quantity" error={form.formState.errors.quantity?.message}>
                    <Input type="number" step="any" id="quantity" {...form.register('quantity', { valueAsNumber: true })} />
                  </FormField>

                  {/* Live CO2e preview */}
                  {preview !== null && (
                    <div className="rounded-md bg-muted px-4 py-3 text-sm">
                      Estimated CO₂e: <span className="font-semibold">{preview.toFixed(3)} kg</span>
                    </div>
                  )}

                  <FormField label="Note (optional)" id="note" error={form.formState.errors.note?.message}>
                    <Input id="note" {...form.register('note')} />
                  </FormField>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={form.formState.isSubmitting}>Log</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      <DataTable columns={columns} data={transactions} />

      <ConfirmDialog
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
        title="Delete Transaction?"
        description="This action cannot be undone. The carbon record will be permanently removed."
        onConfirm={handleDelete}
      />
    </div>
  );
};
