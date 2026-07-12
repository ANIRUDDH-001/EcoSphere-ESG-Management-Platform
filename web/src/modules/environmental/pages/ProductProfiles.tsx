import { useState } from 'react';
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
import { PageHeader } from '../../../components/shared/PageHeader';
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct, useFactors } from '../hooks';
import { productProfileSchema, type ProductProfileFormValues } from '../schemas';

export const ProductProfiles = () => {
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  
  const { data: products = [] } = useProducts();
  const { data: factors = [] } = useFactors('active');
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const deleteMutation = useDeleteProduct();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const form = useForm<ProductProfileFormValues>({
    resolver: zodResolver(productProfileSchema),
    defaultValues: {
      product_name: '',
      sku: '',
      carbon_per_unit: 0,
      recyclable_pct: 0,
      emission_factor_id: 'none',
      certifications: '',
      notes: ''
    }
  });

  const onSubmit = async (values: ProductProfileFormValues) => {
    try {
      const apiValues = {
        ...values,
        emission_factor_id: values.emission_factor_id === 'none' || values.emission_factor_id === '' ? null : values.emission_factor_id
      };
      
      if (editingProduct) {
        await updateMutation.mutateAsync({ id: editingProduct.id, input: apiValues });
      } else {
        await createMutation.mutateAsync(apiValues);
      }
      setIsDialogOpen(false);
      form.reset();
      setEditingProduct(null);
    } catch (error) {
      console.error(error);
    }
  };

  const openEdit = (product: any) => {
    setEditingProduct(product);
    form.reset({
      product_name: product.product_name || '',
      sku: product.sku || '',
      carbon_per_unit: product.carbon_per_unit || 0,
      recyclable_pct: product.recyclable_pct || 0,
      emission_factor_id: product.emission_factor_id || 'none',
      certifications: product.certifications || '',
      notes: product.notes || ''
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
    { accessorKey: 'product_name', header: 'Product' },
    { accessorKey: 'sku', header: 'SKU' },
    { accessorKey: 'carbon_per_unit', header: 'Carbon/Unit' },
    { accessorKey: 'recyclable_pct', header: 'Recyclable %' },
    { 
      id: 'linked_factor',
      header: 'Linked Factor',
      cell: ({ row }) => row.original.emission_factors?.name || '-'
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
      <PageHeader title="Product ESG Profiles" description="Manage product ESG data." />
      
      <div className="flex justify-between items-center">
        <div />

        {isAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={(open: boolean) => {
            if (!open) {
              setEditingProduct(null);
              form.reset();
            }
            setIsDialogOpen(open);
          }}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" /> New Profile</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingProduct ? 'Edit Profile' : 'New ESG Profile'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField label="Product Name" id="product_name" error={form.formState.errors.product_name?.message}>
                  <Input id="product_name" {...form.register('product_name')} />
                </FormField>
                <FormField label="SKU" id="sku" error={form.formState.errors.sku?.message}>
                  <Input id="sku" {...form.register('sku')} />
                </FormField>
                <FormField label="Carbon per unit" id="carbon_per_unit" error={form.formState.errors.carbon_per_unit?.message}>
                  <Input type="number" step="any" id="carbon_per_unit" {...form.register('carbon_per_unit', { valueAsNumber: true })} />
                </FormField>
                <FormField label="Recyclable %" id="recyclable_pct" error={form.formState.errors.recyclable_pct?.message}>
                  <Input type="number" id="recyclable_pct" {...form.register('recyclable_pct', { valueAsNumber: true })} />
                </FormField>
                <FormField label="Linked Emission Factor" id="emission_factor_id" error={form.formState.errors.emission_factor_id?.message}>
                  <Select onValueChange={(v: string) => form.setValue('emission_factor_id', v === 'none' ? undefined : v as any)} defaultValue={form.getValues('emission_factor_id') || 'none'}>
                    <SelectTrigger id="emission_factor_id"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {factors.map((f: any) => (
                        <SelectItem key={f.id} value={f.id}>{f.name} ({f.factor_kgco2e} kg CO₂e/{f.unit})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Certifications" id="certifications" error={form.formState.errors.certifications?.message}>
                  <Input id="certifications" {...form.register('certifications')} />
                </FormField>
                <FormField label="Notes" id="notes" error={form.formState.errors.notes?.message}>
                  <Input id="notes" {...form.register('notes')} />
                </FormField>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {editingProduct ? 'Save Changes' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <DataTable columns={columns} data={products} />

      <ConfirmDialog
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
        title="Delete ESG Profile?"
        description="Are you sure you want to permanently delete this product's ESG profile?"
        onConfirm={handleDelete}
      />
    </div>
  );
};
