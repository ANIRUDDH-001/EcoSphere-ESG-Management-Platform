import { useState, useRef } from 'react';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import {
  UserCheck, Upload, Clock, CheckCircle, XCircle,
  AlertCircle, Users, FileText,
} from 'lucide-react';

import { DataTable } from '@/components/shared/DataTable';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';

import { useAuth } from '@/lib/hooks/useAuth';
import {
  useCsrActivities,
  useMyParticipations,
  useAllParticipations,
  useJoinActivity,
  useUploadProof,
  useApproveParticipation,
  useRejectParticipation,
  useEsgSettings,
} from '../hooks';
import type { CsrActivity, EmployeeParticipation } from '../api';

// ─── Status badge helper ──────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string | null }) {
  if (status === 'approved') return <Badge className="bg-green-600 text-white">Approved</Badge>;
  if (status === 'rejected') return <Badge variant="destructive">Rejected</Badge>;
  return <Badge variant="secondary">Pending</Badge>;
}

// ─── Proof upload dialog ──────────────────────────────────────────────────────
function ProofUploadDialog({
  participation,
  open,
  onOpenChange,
}: {
  participation: EmployeeParticipation | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { user } = useAuth();
  const uploadMutation = useUploadProof();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);

  const handleUpload = async () => {
    if (!participation || !file || !user) return;
    try {
      await uploadMutation.mutateAsync({
        participationId: participation.id,
        employeeId: user.id,
        file,
      });
      toast.success('Proof uploaded successfully');
      setFile(null);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Upload Proof</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload a photo or document as evidence of your participation.
          </p>
          <div
            className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <Upload size={24} className="mx-auto mb-2 text-muted-foreground" />
            {file ? (
              <p className="text-sm font-medium">{file.name}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Click to select file (max 10 MB)</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">JPEG, PNG, PDF, WEBP</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
            className="hidden"
            onChange={e => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleUpload} disabled={!file || uploadMutation.isPending}>
            {uploadMutation.isPending ? 'Uploading…' : 'Upload Proof'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Employee: joinable activities ────────────────────────────────────────────
function JoinableActivities({ myParticipationIds }: { myParticipationIds: Set<string> }) {
  const { user } = useAuth();
  const { data: activities, isLoading } = useCsrActivities();
  const joinMutation = useJoinActivity();

  const handleJoin = async (activity: CsrActivity) => {
    if (!user) return;
    try {
      await joinMutation.mutateAsync({ activityId: activity.id, employeeId: user.id });
      toast.success(`Joined "${activity.title}"`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not join activity');
    }
  };

  const available = (activities ?? []).filter(
    a => a.status === 'active' && !myParticipationIds.has(a.id),
  );

  if (isLoading) return <Skeleton className="h-40 w-full" />;

  if (available.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
          <Users size={36} strokeWidth={1.5} />
          <p className="text-sm">No new activities to join right now.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {available.map(a => (
        <Card key={a.id} className="flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">{a.title}</CardTitle>
            <p className="text-xs text-muted-foreground">{a.activity_date ?? ''}</p>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{a.points} pts</span>
              <span>Capacity: {a.capacity ?? '–'}</span>
            </div>
            <Button
              size="sm"
              className="w-full mt-auto"
              onClick={() => handleJoin(a)}
              disabled={joinMutation.isPending}
            >
              Join Activity
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Employee: my participations ──────────────────────────────────────────────
function MyParticipations() {
  const { user } = useAuth();
  const { data: participations, isLoading } = useMyParticipations(user?.id);
  const { data: settings } = useEsgSettings();
  const evidenceRequired = settings?.evidence_required_enabled ?? true;

  const [uploadTarget, setUploadTarget] = useState<EmployeeParticipation | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  type ParticipationRow = EmployeeParticipation & {
    activity?: { title: string; points: number } | null;
  };

  const columns: ColumnDef<ParticipationRow>[] = [
    {
      id: 'activity',
      header: 'Activity',
      cell: ({ row }) => (
        <span className="font-medium">{row.original.activity?.title ?? '–'}</span>
      ),
    },
    {
      accessorKey: 'approval_status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.approval_status} />,
    },
    {
      id: 'proof',
      header: 'Proof',
      cell: ({ row }) => {
        const p = row.original;
        if (p.proof_url) {
          return (
            <a
              href={p.proof_url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <FileText size={12} /> View
            </a>
          );
        }
        if (p.approval_status === 'pending') {
          return (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => { setUploadTarget(p); setUploadOpen(true); }}
            >
              <Upload size={12} className="mr-1" />
              {evidenceRequired ? 'Upload (required)' : 'Upload'}
            </Button>
          );
        }
        return <span className="text-xs text-muted-foreground">–</span>;
      },
    },
    {
      accessorKey: 'points_earned',
      header: 'Points',
      cell: ({ row }) => (
        <span className="tabular-nums text-sm">{row.original.points_earned ?? 0}</span>
      ),
    },
    {
      accessorKey: 'completion_date',
      header: 'Completed',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">{row.original.completion_date ?? '–'}</span>
      ),
    },
  ];

  if (isLoading) return <Skeleton className="h-40 w-full" />;

  return (
    <>
      {!participations || participations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
            <Clock size={36} strokeWidth={1.5} />
            <p className="text-sm">You have not joined any activities yet.</p>
          </CardContent>
        </Card>
      ) : (
        <DataTable
          columns={columns}
          data={participations as ParticipationRow[]}
        />
      )}
      <ProofUploadDialog
        participation={uploadTarget}
        open={uploadOpen}
        onOpenChange={open => { setUploadOpen(open); if (!open) setUploadTarget(null); }}
      />
    </>
  );
}

// ─── Manager/Admin: approval queue ───────────────────────────────────────────
function ApprovalQueue() {
  const { user } = useAuth();
  const { data: allParticipations, isLoading } = useAllParticipations();
  const { data: settings } = useEsgSettings();
  const approveMutation = useApproveParticipation();
  const rejectMutation = useRejectParticipation();
  const evidenceRequired = settings?.evidence_required_enabled ?? true;

  const pending = (allParticipations ?? []).filter(p => p.approval_status === 'pending');

  type PendingRow = typeof pending[number] & {
    employee?: { full_name: string | null } | null;
    activity?: { title: string | null; points: number | null } | null;
  };

  const handleApprove = async (id: string, proofUrl: string | null) => {
    if (evidenceRequired && !proofUrl) {
      toast.error('Proof is required before approval. Ask the employee to upload evidence.');
      return;
    }
    try {
      await approveMutation.mutateAsync({ id, reviewerId: user!.id });
      toast.success('Participation approved — points awarded');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Approval failed');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await rejectMutation.mutateAsync({ id, reviewerId: user!.id });
      toast.success('Participation rejected');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Rejection failed');
    }
  };

  const columns: ColumnDef<PendingRow>[] = [
    {
      id: 'employee',
      header: 'Employee',
      cell: ({ row }) => (
        <span className="font-medium">{(row.original as PendingRow).employee?.full_name ?? '–'}</span>
      ),
    },
    {
      id: 'activity',
      header: 'Activity',
      cell: ({ row }) => (
        <span className="text-sm">{(row.original as PendingRow).activity?.title ?? '–'}</span>
      ),
    },
    {
      id: 'proof',
      header: 'Proof',
      cell: ({ row }) => {
        const url = row.original.proof_url;
        if (url) {
          return (
            <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
              <FileText size={12} /> View proof
            </a>
          );
        }
        return (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <AlertCircle size={12} /> No proof
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const p = row.original;
        const noProof = evidenceRequired && !p.proof_url;
        return (
          <div className="flex items-center gap-2 justify-end">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs text-green-700 border-green-300 hover:bg-green-50"
              onClick={() => handleApprove(p.id, p.proof_url ?? null)}
              disabled={approveMutation.isPending || noProof}
              title={noProof ? 'Proof required — ask employee to upload' : 'Approve'}
              aria-label="Approve participation"
            >
              <CheckCircle size={12} className="mr-1" />
              {noProof ? 'Needs proof' : 'Approve'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => handleReject(p.id)}
              disabled={rejectMutation.isPending}
              aria-label="Reject participation"
            >
              <XCircle size={12} className="mr-1" /> Reject
            </Button>
          </div>
        );
      },
    },
  ];

  if (isLoading) return <Skeleton className="h-40 w-full" />;

  if (pending.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
          <CheckCircle size={36} strokeWidth={1.5} />
          <p className="text-sm">No pending participations to review.</p>
        </CardContent>
      </Card>
    );
  }

  return <DataTable columns={columns} data={pending as PendingRow[]} />;
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function ParticipationPage() {
  const { role, user } = useAuth();
  const isManager = role === 'admin' || role === 'manager';

  const { data: myParticipations } = useMyParticipations(user?.id);
  const myActivityIds = new Set(
    (myParticipations ?? []).map(p => p.activity_id).filter(Boolean) as string[],
  );

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="CSR Participation"
        description={isManager
          ? 'Review employee participation requests and manage approvals'
          : 'Join CSR activities, upload your proof and track your participation'}
      />

      {isManager ? (
        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending" id="tab-pending">
              <Clock size={14} className="mr-1" /> Pending Approvals
            </TabsTrigger>
            <TabsTrigger value="join" id="tab-join">
              <UserCheck size={14} className="mr-1" /> My Participation
            </TabsTrigger>
          </TabsList>
          <TabsContent value="pending" className="mt-4">
            <ApprovalQueue />
          </TabsContent>
          <TabsContent value="join" className="mt-4 space-y-6">
            <div>
              <h2 className="text-base font-semibold mb-3">Available Activities</h2>
              <JoinableActivities myParticipationIds={myActivityIds} />
            </div>
            <div>
              <h2 className="text-base font-semibold mb-3">My Participations</h2>
              <MyParticipations />
            </div>
          </TabsContent>
        </Tabs>
      ) : (
        <div className="space-y-8">
          <div>
            <h2 className="text-base font-semibold mb-3">Available Activities</h2>
            <JoinableActivities myParticipationIds={myActivityIds} />
          </div>
          <div>
            <h2 className="text-base font-semibold mb-3">My Participations</h2>
            <MyParticipations />
          </div>
        </div>
      )}
    </div>
  );
}
