import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { usePolicies, useCreatePolicy, useUpdatePolicy, useArchivePolicy } from '../hooks';
import { policySchema, type PolicyFormValues } from '../schemas';
import { useAuth } from '../../../lib/hooks/useAuth';
import { Button } from '../../../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Switch } from '../../../components/ui/switch';
import { Badge } from '../../../components/ui/badge';

export function PoliciesPage() {
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const { data: policies, isLoading } = usePolicies('active');
  const createMutation = useCreatePolicy();
  const updateMutation = useUpdatePolicy();
  const archiveMutation = useArchivePolicy();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<any>(null);

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<PolicyFormValues>({
    resolver: zodResolver(policySchema),
    defaultValues: {
      name: '',
      pillar: 'governance',
      version: '1.0',
      effective_date: new Date().toISOString().split('T')[0],
      requires_ack: true,
      status: 'active'
    }
  });

  const openCreate = () => {
    setEditingPolicy(null);
    reset({
      name: '',
      pillar: 'governance',
      version: '1.0',
      effective_date: new Date().toISOString().split('T')[0],
      requires_ack: true,
      status: 'active'
    });
    setDialogOpen(true);
  };

  const openEdit = (policy: any) => {
    setEditingPolicy(policy);
    reset({
      name: policy.name || '',
      pillar: policy.pillar || 'governance',
      body: policy.body || '',
      version: policy.version || '1.0',
      effective_date: policy.effective_date || new Date().toISOString().split('T')[0],
      requires_ack: policy.requires_ack ?? true,
      status: policy.status || 'active'
    });
    setDialogOpen(true);
  };

  const onSubmit = (data: PolicyFormValues) => {
    if (editingPolicy) {
      updateMutation.mutate(
        { id: editingPolicy.id, input: data },
        { onSuccess: () => setDialogOpen(false) }
      );
    } else {
      createMutation.mutate(data, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const onArchive = (id: string) => {
    if (confirm('Are you sure you want to archive this policy?')) {
      archiveMutation.mutate(id);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">ESG Policies</h1>
        {isAdmin && (
          <Button onClick={openCreate}>Create Policy</Button>
        )}
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Pillar</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Effective Date</TableHead>
              <TableHead>Requires Ack</TableHead>
              {isAdmin && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">Loading...</TableCell>
              </TableRow>
            ) : policies?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">No active policies found.</TableCell>
              </TableRow>
            ) : (
              policies?.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="capitalize">{p.pillar}</TableCell>
                  <TableCell>{p.version}</TableCell>
                  <TableCell>{p.effective_date}</TableCell>
                  <TableCell>
                    {p.requires_ack ? <Badge variant="default">Yes</Badge> : <Badge variant="secondary">No</Badge>}
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(p)}>Edit</Button>
                      <Button variant="destructive" size="sm" onClick={() => onArchive(p.id)}>Archive</Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPolicy ? 'Edit Policy' : 'Create Policy'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input {...register('name')} placeholder="e.g. Code of Conduct" />
              {errors.name && <span className="text-red-500 text-sm">{errors.name.message}</span>}
            </div>

            <div className="space-y-2">
              <Label>Pillar</Label>
              <Controller
                control={control}
                name="pillar"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select pillar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="environmental">Environmental</SelectItem>
                      <SelectItem value="social">Social</SelectItem>
                      <SelectItem value="governance">Governance</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Version</Label>
                <Input {...register('version')} placeholder="1.0" />
                {errors.version && <span className="text-red-500 text-sm">{errors.version.message}</span>}
              </div>
              <div className="space-y-2">
                <Label>Effective Date</Label>
                <Input type="date" {...register('effective_date')} />
                {errors.effective_date && <span className="text-red-500 text-sm">{errors.effective_date.message}</span>}
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Controller
                control={control}
                name="requires_ack"
                render={({ field }) => (
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <Label>Requires Acknowledgement</Label>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
