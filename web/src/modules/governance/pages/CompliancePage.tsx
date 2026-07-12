import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus } from 'lucide-react';
import { PageHeader } from '../../../components/shared/PageHeader';
import { DataTable } from '../../../components/shared/DataTable';
import { Button } from '../../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../../components/ui/dialog';
import { FormField } from '../../../components/shared/FormField';
import { Input } from '../../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { useAuth } from '../../../lib/hooks/useAuth';
import { useIssues, useCreateIssue, useUpdateIssueStatus } from '../hooks';
import { issueSchema, type IssueFormValues, ISSUE_TRANSITIONS } from '../schemas';

export function CompliancePage() {
  const { role } = useAuth();
  const isAdminOrManager = role === 'admin' || role === 'manager';
  
  const [searchParams] = useSearchParams();
  const defaultAuditId = searchParams.get('audit');
  
  const [isDialogOpen, setIsDialogOpen] = useState(!!defaultAuditId);
  const [filter, setFilter] = useState<{ status?: string; severity?: string; is_overdue?: boolean }>({});
  
  const { data: issues = [], isLoading } = useIssues(filter);
  const createMutation = useCreateIssue();
  const updateStatusMutation = useUpdateIssueStatus();

  const form = useForm<IssueFormValues>({
    resolver: zodResolver(issueSchema),
    defaultValues: {
      audit_id: defaultAuditId || '',
      severity: 'medium',
      description: '',
      owner_id: '',
      due_date: new Date().toISOString().slice(0, 10),
    }
  });

  // Re-initialize if query param changes and dialog opens
  useEffect(() => {
    if (defaultAuditId) {
      form.setValue('audit_id', defaultAuditId);
      setIsDialogOpen(true);
    }
  }, [defaultAuditId, form]);

  const onSubmitCreate = (data: IssueFormValues) => {
    createMutation.mutate(
      { ...data, audit_id: data.audit_id || null }, 
      { onSuccess: () => { setIsDialogOpen(false); form.reset(); } }
    );
  };

  const handleStatusChange = (id: string, newStatus: string, currentStatus: string) => {
    updateStatusMutation.mutate({ id, status: newStatus, currentStatus });
  };

  const columns = [
    { accessorKey: 'description', header: 'Description' },
    { 
      id: 'severity',
      header: 'Severity', 
      cell: ({ row }: any) => <span className={`capitalize font-semibold text-${row.original.severity === 'critical' || row.original.severity === 'high' ? 'destructive' : 'primary'}`}>{row.original.severity}</span> 
    },
    { 
      id: 'owner',
      header: 'Owner', 
      cell: ({ row }: any) => row.original.profiles?.full_name || row.original.owner_id 
    },
    { 
      id: 'due_date',
      header: 'Due Date', 
      cell: ({ row }: any) => (
        <div className="flex items-center gap-2">
          <span>{new Date(row.original.due_date).toLocaleDateString()}</span>
          {row.original.is_overdue && <span className="text-xs bg-destructive text-destructive-foreground px-2 py-0.5 rounded">Overdue</span>}
        </div>
      )
    },
    { 
      id: 'audit',
      header: 'Audit', 
      cell: ({ row }: any) => row.original.audits?.title || '-' 
    },
    { 
      id: 'status',
      header: 'Status', 
      cell: ({ row }: any) => (
        isAdminOrManager ? (
          <Select 
            value={row.original.status} 
            onValueChange={(v: string) => handleStatusChange(row.original.id, v, row.original.status)}
            disabled={updateStatusMutation.isPending}
          >
            <SelectTrigger className="w-32 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={row.original.status} disabled>{row.original.status}</SelectItem>
              {(ISSUE_TRANSITIONS[row.original.status] || []).map(st => (
                <SelectItem key={st} value={st}>{st.replace('_', ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="capitalize">{row.original.status.replace('_', ' ')}</span>
        )
      ) 
    }
  ];

  if (isLoading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Compliance Issues" description="Manage and track compliance issues." />
        
        {isAdminOrManager && (
          <Dialog open={isDialogOpen} onOpenChange={(open: boolean) => {
            if (!open) form.reset();
            setIsDialogOpen(open);
          }}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" /> New Issue</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Compliance Issue</DialogTitle></DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmitCreate)} className="space-y-4">
                <FormField label="Description" id="description" error={form.formState.errors.description?.message}>
                  <textarea {...form.register('description')} className="w-full p-2 border rounded-md" rows={3} />
                </FormField>
                
                <FormField label="Severity" id="severity" error={form.formState.errors.severity?.message}>
                  <Select value={form.watch('severity')} onValueChange={(v: any) => form.setValue('severity', v)}>
                    <SelectTrigger id="severity"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>

                <FormField label="Owner ID" id="owner_id" error={form.formState.errors.owner_id?.message}>
                  <Input id="owner_id" {...form.register('owner_id')} />
                </FormField>

                <FormField label="Due Date" id="due_date" error={form.formState.errors.due_date?.message}>
                  <Input type="date" id="due_date" {...form.register('due_date')} />
                </FormField>

                <FormField label="Audit ID (optional)" id="audit_id" error={form.formState.errors.audit_id?.message}>
                  <Input id="audit_id" {...form.register('audit_id')} />
                </FormField>
                
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Create Issue'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex gap-4 items-end mb-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Status</label>
          <Select value={filter.status || 'all'} onValueChange={(v: string) => setFilter(f => ({ ...f, status: v }))}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Severity</label>
          <Select value={filter.severity || 'all'} onValueChange={(v: string) => setFilter(f => ({ ...f, severity: v }))}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Overdue</label>
          <Select value={filter.is_overdue === undefined ? 'all' : filter.is_overdue ? 'true' : 'false'} onValueChange={(v: string) => setFilter(f => ({ ...f, is_overdue: v === 'all' ? undefined : v === 'true' }))}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="true">Overdue</SelectItem>
              <SelectItem value="false">On Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="ghost" onClick={() => setFilter({})}>Clear</Button>
      </div>

      <DataTable columns={columns} data={issues} />
    </div>
  );
}
