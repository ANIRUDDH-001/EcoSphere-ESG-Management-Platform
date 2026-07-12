import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../../../lib/hooks/useAuth';
import { useAudits, useCreateAudit, useCompleteAudit } from '../hooks';
import { auditSchema, type AuditFormValues, auditCompleteSchema, type AuditCompleteFormValues } from '../schemas';
import { Button } from '../../../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../../components/ui/dialog';
import { Link } from 'react-router-dom';

export function AuditsPage() {
  const { role } = useAuth();
  const isAdminOrManager = role === 'admin' || role === 'manager';
  
  const { data: audits, isLoading } = useAudits();
  const createMutation = useCreateAudit();
  const completeMutation = useCompleteAudit();

  const [createOpen, setCreateOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [selectedAuditId, setSelectedAuditId] = useState<string | null>(null);

  const createForm = useForm<AuditFormValues>({
    resolver: zodResolver(auditSchema),
    defaultValues: { title: '', department_id: '', auditor_id: '', scheduled_date: '' }
  });

  const completeForm = useForm<AuditCompleteFormValues>({
    resolver: zodResolver(auditCompleteSchema),
    defaultValues: { result: 'pass', completed_date: new Date().toISOString().slice(0,10), findings: '' }
  });

  const onSubmitCreate = (data: AuditFormValues) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        setCreateOpen(false);
        createForm.reset();
      }
    });
  };

  const onSubmitComplete = (data: AuditCompleteFormValues) => {
    if (selectedAuditId) {
      completeMutation.mutate({ id: selectedAuditId, data }, {
        onSuccess: () => {
          setCompleteOpen(false);
          completeForm.reset();
        }
      });
    }
  };

  const handleCompleteClick = (id: string) => {
    setSelectedAuditId(id);
    setCompleteOpen(true);
  };

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Audits</h1>
        {isAdminOrManager && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>Schedule Audit</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Schedule New Audit</DialogTitle></DialogHeader>
              <form onSubmit={createForm.handleSubmit(onSubmitCreate)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium">Title</label>
                  <input {...createForm.register('title')} className="w-full p-2 border rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium">Department ID</label>
                  <input {...createForm.register('department_id')} className="w-full p-2 border rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium">Auditor ID</label>
                  <input {...createForm.register('auditor_id')} className="w-full p-2 border rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium">Scheduled Date</label>
                  <input type="date" {...createForm.register('scheduled_date')} className="w-full p-2 border rounded-md" />
                </div>
                <Button type="submit" disabled={createMutation.isPending}>Schedule</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Auditor</TableHead>
              <TableHead>Scheduled</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Result</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center">Loading...</TableCell></TableRow>
            ) : audits?.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No audits found.</TableCell></TableRow>
            ) : audits?.map(audit => (
              <TableRow key={audit.id}>
                <TableCell>{audit.title}</TableCell>
                <TableCell>{(audit.departments as any)?.name}</TableCell>
                <TableCell>{(audit.profiles as any)?.full_name}</TableCell>
                <TableCell>{audit.scheduled_date}</TableCell>
                <TableCell>{audit.status}</TableCell>
                <TableCell>{audit.result || '-'}</TableCell>
                <TableCell className="text-right space-x-2">
                  {isAdminOrManager && audit.status === 'open' && (
                    <Button size="sm" variant="outline" onClick={() => handleCompleteClick(audit.id)}>Complete</Button>
                  )}
                  {isAdminOrManager && audit.status === 'completed' && audit.result !== 'pass' && (
                    <Button size="sm" variant="link" asChild>
                      <Link to={`/governance/issues?audit=${audit.id}`}>Raise Issue</Link>
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Complete Audit</DialogTitle></DialogHeader>
          <form onSubmit={completeForm.handleSubmit(onSubmitComplete)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium">Result</label>
              <select {...completeForm.register('result')} className="w-full p-2 border rounded-md">
                <option value="pass">Pass</option>
                <option value="partial">Partial</option>
                <option value="fail">Fail</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium">Completed Date</label>
              <input type="date" {...completeForm.register('completed_date')} className="w-full p-2 border rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium">Findings</label>
              <textarea {...completeForm.register('findings')} className="w-full p-2 border rounded-md" />
            </div>
            <Button type="submit" disabled={completeMutation.isPending}>Submit</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
