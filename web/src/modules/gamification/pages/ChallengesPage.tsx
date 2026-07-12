import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import {
  ClipboardList, Plus, Pencil, Trash2, AlertCircle, ArrowRight, CheckCircle2,
  Archive, Play, RefreshCw, Calendar, FileText, CheckSquare, Upload, X,
  ThumbsUp, ThumbsDown, ExternalLink, Zap, Loader2,
} from 'lucide-react';

import { DataTable } from '@/components/shared/DataTable';
import { PageHeader } from '@/components/shared/PageHeader';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

import { useAuth } from '@/lib/hooks/useAuth';
import { supabaseClient } from '@/lib/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  useJoinChallenge,
  useSubmitChallengeProof,
  useApproveChallengeParticipation,
  useRejectChallengeParticipation,
  useMyChallengeParticipations,
  useAllChallengeParticipations,
} from '../hooks';

// ─── Types ───────────────────────────────────────────────────────────────────

const challengeFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  description: z.string().min(1, 'Description is required').max(500),
  category_id: z.string().min(1, 'Category is required'),
  xp: z.preprocess(
    v => (v === '' || v === null || v === undefined ? undefined : Number(v)),
    z.number().min(1, 'XP must be at least 1')
  ),
  deadline: z.string().min(1, 'Deadline date is required'),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  status: z.enum(['draft', 'active', 'under_review', 'completed', 'archived']),
  evidence_required: z.boolean(),
});
type ChallengeFormValues = z.infer<typeof challengeFormSchema>;

interface Challenge {
  id: string;
  title: string;
  description: string;
  category_id: string;
  xp: number;
  deadline: string;
  difficulty: 'easy' | 'medium' | 'hard';
  status: 'draft' | 'active' | 'under_review' | 'completed' | 'archived';
  evidence_required: boolean;
  created_at: string;
  category?: { id: string; name: string } | null;
}

interface Category {
  id: string;
  name: string;
  type: string;
}

interface Participation {
  id: string;
  challenge_id: string;
  employee_id: string;
  progress: number;
  proof_url: string | null;
  approval_status: 'pending' | 'approved' | 'rejected';
  xp_awarded: number | null;
  reviewed_by: string | null;
  created_at: string;
  challenge?: Challenge | null;
  employee?: { id: string; full_name: string; email: string } | null;
}

// ─── State Machine ────────────────────────────────────────────────────────────
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  draft: ['active', 'archived'],
  active: ['under_review', 'completed', 'archived'],
  under_review: ['completed', 'active', 'archived'],
  completed: ['archived'],
  archived: [],
};

// ─── Badge Helpers ────────────────────────────────────────────────────────────
function getStatusBadge(status: string) {
  switch (status) {
    case 'draft': return <Badge variant="outline" className="capitalize">Draft</Badge>;
    case 'active': return <Badge className="capitalize bg-green-600 hover:bg-green-600">Active</Badge>;
    case 'under_review': return <Badge variant="secondary" className="capitalize bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/15">Under Review</Badge>;
    case 'completed': return <Badge className="capitalize bg-blue-600 hover:bg-blue-600">Completed</Badge>;
    case 'archived': return <Badge variant="outline" className="capitalize text-muted-foreground bg-muted">Archived</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
}

function getDifficultyBadge(diff: string) {
  switch (diff) {
    case 'easy': return <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50/10 capitalize">Easy</Badge>;
    case 'medium': return <Badge variant="outline" className="text-yellow-600 border-yellow-200 bg-yellow-50/10 capitalize">Medium</Badge>;
    case 'hard': return <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50/10 capitalize">Hard</Badge>;
    default: return null;
  }
}

function getApprovalBadge(status: string) {
  switch (status) {
    case 'approved': return <Badge className="bg-green-600 hover:bg-green-600 capitalize">Approved</Badge>;
    case 'rejected': return <Badge variant="destructive" className="capitalize">Rejected</Badge>;
    default: return <Badge variant="secondary" className="capitalize">Pending</Badge>;
  }
}

// ─── Admin Columns ────────────────────────────────────────────────────────────
function buildChallengeColumns(
  onEdit: (c: Challenge) => void,
  onDelete: (c: Challenge) => void,
  onAdvance: (c: Challenge, next: string) => void,
): ColumnDef<Challenge>[] {
  return [
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => <span className="font-semibold">{row.original.title}</span>,
    },
    {
      id: 'category',
      header: 'Category',
      cell: ({ row }) => <span>{row.original.category?.name ?? '–'}</span>,
    },
    {
      accessorKey: 'xp',
      header: 'XP',
      cell: ({ row }) => <span className="font-semibold tabular-nums text-primary">{row.original.xp} XP</span>,
    },
    {
      accessorKey: 'difficulty',
      header: 'Difficulty',
      cell: ({ row }) => getDifficultyBadge(row.original.difficulty),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => getStatusBadge(row.original.status),
    },
    {
      id: 'transitions',
      header: 'Advance Status',
      cell: ({ row }) => {
        const nextStates = ALLOWED_TRANSITIONS[row.original.status] ?? [];
        if (nextStates.length === 0) return <span className="text-xs text-muted-foreground">Archived</span>;
        return (
          <div className="flex items-center gap-1 flex-wrap">
            {nextStates.map(next => {
              let icon = <ArrowRight size={11} />;
              let label = next;
              if (next === 'active') { icon = <Play size={11} />; label = 'Activate'; }
              if (next === 'under_review') { icon = <RefreshCw size={11} />; label = 'Review'; }
              if (next === 'completed') { icon = <CheckCircle2 size={11} />; label = 'Complete'; }
              if (next === 'archived') { icon = <Archive size={11} />; label = 'Archive'; }
              return (
                <Button key={next} size="sm" variant="outline" className="h-7 text-[10px] px-2 gap-1"
                  onClick={() => onAdvance(row.original, next)}>
                  {icon}<span>{label}</span>
                </Button>
              );
            })}
          </div>
        );
      },
    },
    {
      id: 'edit_actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-2 justify-end">
          <Button size="sm" variant="ghost" aria-label="Edit challenge" onClick={() => onEdit(row.original)}>
            <Pencil size={14} />
          </Button>
          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive"
            aria-label="Delete challenge" onClick={() => onDelete(row.original)}>
            <Trash2 size={14} />
          </Button>
        </div>
      ),
    },
  ];
}

// Approval queue columns (manager view)
function buildParticipationColumns(
  onApprove: (p: Participation) => void,
  onReject: (p: Participation) => void,
): ColumnDef<Participation>[] {
  return [
    {
      id: 'employee',
      header: 'Employee',
      cell: ({ row }) => (
        <div>
          <p className="font-semibold text-sm">{row.original.employee?.full_name ?? '–'}</p>
          <p className="text-xs text-muted-foreground">{row.original.employee?.email ?? ''}</p>
        </div>
      ),
    },
    {
      id: 'challenge',
      header: 'Challenge',
      cell: ({ row }) => <span className="font-medium">{row.original.challenge?.title ?? '–'}</span>,
    },
    {
      id: 'progress',
      header: 'Progress',
      cell: ({ row }) => (
        <div className="w-24 space-y-1">
          <Progress value={row.original.progress ?? 0} className="h-1.5" />
          <span className="text-[10px] text-muted-foreground tabular-nums">{row.original.progress ?? 0}%</span>
        </div>
      ),
    },
    {
      id: 'proof',
      header: 'Evidence',
      cell: ({ row }) => row.original.proof_url ? (
        <a href={row.original.proof_url} target="_blank" rel="noreferrer"
          className="flex items-center gap-1 text-xs text-primary hover:underline">
          <ExternalLink size={12} /> View
        </a>
      ) : (
        <span className="text-xs text-muted-foreground">No proof</span>
      ),
    },
    {
      accessorKey: 'approval_status',
      header: 'Status',
      cell: ({ row }) => getApprovalBadge(row.original.approval_status),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        if (row.original.approval_status !== 'pending') return null;
        return (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-7 gap-1 text-green-600 border-green-200 hover:bg-green-50"
              onClick={() => onApprove(row.original)}>
              <ThumbsUp size={12} /> Approve
            </Button>
            <Button size="sm" variant="outline" className="h-7 gap-1 text-destructive border-destructive/30 hover:bg-destructive/5"
              onClick={() => onReject(row.original)}>
              <ThumbsDown size={12} /> Reject
            </Button>
          </div>
        );
      },
    },
  ];
}

// ─── Challenge Create/Edit Dialog ─────────────────────────────────────────────
function ChallengeEditDialog({
  open, onOpenChange, editing, categories, onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Challenge | null;
  categories: Category[];
  onSuccess: () => void;
}) {
  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useForm<ChallengeFormValues, any, ChallengeFormValues>({
      resolver: zodResolver(challengeFormSchema) as any,
      defaultValues: editing ? {
        title: editing.title ?? '',
        description: editing.description ?? '',
        category_id: editing.category_id ?? '',
        xp: editing.xp ?? 100,
        deadline: editing.deadline ? new Date(editing.deadline).toISOString().split('T')[0] : '',
        difficulty: editing.difficulty ?? 'easy',
        status: editing.status ?? 'draft',
        evidence_required: editing.evidence_required ?? false,
      } : { xp: 100, difficulty: 'easy', status: 'draft', evidence_required: false },
    });

  const onSubmit = async (values: ChallengeFormValues) => {
    try {
      const payload = {
        title: values.title,
        description: values.description,
        category_id: values.category_id,
        xp: values.xp,
        deadline: new Date(values.deadline).toISOString(),
        difficulty: values.difficulty,
        status: values.status,
        evidence_required: values.evidence_required,
      };
      if (editing) {
        const { error } = await supabaseClient.from('challenges').update(payload).eq('id', editing.id);
        if (error) throw error;
        toast.success('Challenge updated');
      } else {
        const { error } = await supabaseClient.from('challenges').insert(payload);
        if (error) throw error;
        toast.success('Challenge created');
      }
      onSuccess();
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save challenge');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit Challenge' : 'Create Challenge'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="ch-title">Title</Label>
            <Input id="ch-title" placeholder="e.g. Plastic-Free Week" {...register('title')} />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="ch-desc">Description</Label>
            <Input id="ch-desc" placeholder="Avoid single-use plastics for 7 days…" {...register('description')} />
            {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Category</Label>
              <Select value={watch('category_id')} onValueChange={v => setValue('category_id', v, { shouldValidate: true })}>
                <SelectTrigger id="ch-cat"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.category_id && <p className="text-xs text-destructive">{errors.category_id.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="ch-deadline">Deadline</Label>
              <Input id="ch-deadline" type="date" {...register('deadline')} />
              {errors.deadline && <p className="text-xs text-destructive">{errors.deadline.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label htmlFor="ch-xp">XP Reward</Label>
              <Input id="ch-xp" type="number" min={1} {...register('xp')} />
              {errors.xp && <p className="text-xs text-destructive">{errors.xp.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Difficulty</Label>
              <Select value={watch('difficulty')} onValueChange={v => setValue('difficulty', v as any, { shouldValidate: true })}>
                <SelectTrigger id="ch-diff"><SelectValue placeholder="Difficulty" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={watch('status')} onValueChange={v => setValue('status', v as any, { shouldValidate: true })}>
                <SelectTrigger id="ch-status"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between border rounded p-3">
            <div className="space-y-0.5">
              <Label>Require Submission Proof</Label>
              <p className="text-[11px] text-muted-foreground">Employees must upload evidence to complete this challenge</p>
            </div>
            <Switch checked={watch('evidence_required')} onCheckedChange={v => setValue('evidence_required', v)} id="ch-evidence" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : editing ? 'Save Changes' : 'Create Challenge'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Join / Proof Dialog ──────────────────────────────────────────────────────
function JoinChallengeDialog({
  open, onOpenChange, challenge, existingParticipation, userId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  challenge: Challenge | null;
  existingParticipation: Participation | null;
  userId: string;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const joinMutation = useJoinChallenge();
  const proofMutation = useSubmitChallengeProof();

  if (!challenge) return null;

  const alreadyJoined = !!existingParticipation;
  const alreadyApproved = existingParticipation?.approval_status === 'approved';
  const alreadyRejected = existingParticipation?.approval_status === 'rejected';
  const needsProof = challenge.evidence_required;
  const hasProof = !!existingParticipation?.proof_url;

  const handleJoin = async () => {
    try {
      await joinMutation.mutateAsync({ challengeId: challenge.id, employeeId: userId });
      toast.success('You joined the challenge!');
      if (!needsProof) {
        onOpenChange(false);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not join challenge');
    }
  };

  const handleUploadProof = async () => {
    if (!file || !existingParticipation) return;
    setUploading(true);
    try {
      await proofMutation.mutateAsync({
        participationId: existingParticipation.id,
        employeeId: userId,
        file,
        progress: 100,
      });
      toast.success('Proof submitted! Awaiting approval.');
      qc.invalidateQueries({ queryKey: ['my_challenge_participations', userId] });
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{challenge.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            {getDifficultyBadge(challenge.difficulty)}
            <Badge variant="secondary" className="font-semibold text-primary">{challenge.xp} XP</Badge>
            {challenge.evidence_required && (
              <Badge variant="outline" className="text-yellow-600 border-yellow-300 text-xs">Proof required</Badge>
            )}
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">{challenge.description}</p>

          {alreadyApproved && (
            <div className="rounded-lg bg-green-50/20 border border-green-500/30 p-3 text-sm font-medium text-green-700 flex items-center gap-2">
              <CheckCircle2 size={16} /> Challenge completed! You earned {existingParticipation?.xp_awarded ?? challenge.xp} XP.
            </div>
          )}

          {alreadyRejected && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-sm font-medium text-destructive flex items-center gap-2">
              <X size={16} /> Submission was rejected. You may re-submit proof.
            </div>
          )}

          {alreadyJoined && !alreadyApproved && existingParticipation?.approval_status === 'pending' && !hasProof && !needsProof && (
            <div className="rounded-lg bg-primary/5 border p-3 text-sm text-muted-foreground">
              Awaiting manager approval.
            </div>
          )}

          {alreadyJoined && !alreadyApproved && needsProof && (
            <div className="space-y-2">
              <Label>Upload Proof of Completion</Label>
              {hasProof ? (
                <div className="flex items-center gap-2 text-xs text-primary">
                  <CheckSquare size={14} /> Proof submitted — awaiting approval
                </div>
              ) : (
                <>
                  <div
                    className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => fileRef.current?.click()}
                  >
                    {file ? (
                      <div className="flex items-center justify-center gap-2 text-sm font-medium">
                        <FileText size={16} /> {file.name}
                        <button onClick={e => { e.stopPropagation(); setFile(null); }} className="ml-1 text-muted-foreground hover:text-destructive">
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <Upload size={24} className="mx-auto text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">Click to upload photo, PDF or document</p>
                      </div>
                    )}
                    <input ref={fileRef} type="file" className="hidden"
                      accept="image/*,.pdf,.doc,.docx"
                      onChange={e => setFile(e.target.files?.[0] ?? null)} />
                  </div>
                  {file && (
                    <Button size="sm" className="w-full" disabled={uploading} onClick={handleUploadProof}>
                      {uploading ? <><Loader2 size={14} className="animate-spin mr-2" />Uploading…</> : <><Upload size={14} className="mr-2" />Submit Proof</>}
                    </Button>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          {!alreadyJoined && (
            <Button onClick={handleJoin} disabled={joinMutation.isPending}>
              {joinMutation.isPending ? <Loader2 size={14} className="animate-spin mr-2" /> : <Zap size={14} className="mr-2" />}
              Join Challenge
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function ChallengesPage() {
  const { role, user } = useAuth();
  const isAdminOrManager = role === 'admin' || role === 'manager';
  const qc = useQueryClient();

  const { data: challenges, isLoading: chLoading, error: chError } = useQuery<Challenge[]>({
    queryKey: ['challenges_all'],
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from('challenges')
        .select('*, category:categories(id, name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as any as Challenge[];
    },
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ['categories_challenge_type'],
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from('categories').select('*').eq('type', 'challenge').eq('status', 'active');
      if (error) throw error;
      return data as Category[];
    },
  });

  // My participations (employee)
  const { data: myParticipations } = useMyChallengeParticipations(user?.id);
  // All participations (admin/manager approval queue)
  const { data: allParticipations } = useAllChallengeParticipations();

  const approveMutation = useApproveChallengeParticipation();
  const rejectMutation = useRejectChallengeParticipation();

  const advanceMutation = useMutation({
    mutationFn: async ({ id, nextStatus }: { id: string; nextStatus: string }) => {
      const { error } = await supabaseClient.from('challenges')
        .update({ status: nextStatus as any }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['challenges_all'] }); toast.success('Status updated'); },
    onError: (err) => { toast.error(err instanceof Error ? err.message : 'Transition rejected'); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabaseClient.from('challenges').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['challenges_all'] }); toast.success('Challenge deleted'); },
    onError: (err) => { toast.error(err instanceof Error ? err.message : 'Delete failed'); },
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Challenge | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Challenge | null>(null);
  const [joinTarget, setJoinTarget] = useState<Challenge | null>(null);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);

  const handleEdit = (c: Challenge) => { setEditing(c); setDialogOpen(true); };
  const handleDelete = (c: Challenge) => setDeleteTarget(c);
  const handleCreate = () => { setEditing(null); setDialogOpen(true); };
  const handleAdvance = (c: Challenge, next: string) => advanceMutation.mutate({ id: c.id, nextStatus: next });
  const handleJoinOpen = (c: Challenge) => { setJoinTarget(c); setJoinDialogOpen(true); };
  const confirmDelete = () => { if (deleteTarget) { deleteMutation.mutate(deleteTarget.id); setDeleteTarget(null); } };

  const handleApprove = (p: Participation) => {
    if (!user) return;
    approveMutation.mutate({ id: p.id, reviewerId: user.id }, {
      onSuccess: () => { toast.success('Participation approved — XP awarded'); qc.invalidateQueries({ queryKey: ['leaderboard'] }); },
      onError: (err) => toast.error(err instanceof Error ? err.message : 'Approval failed'),
    });
  };

  const handleReject = (p: Participation) => {
    if (!user) return;
    rejectMutation.mutate({ id: p.id, reviewerId: user.id }, {
      onSuccess: () => toast.success('Participation rejected'),
      onError: (err) => toast.error(err instanceof Error ? err.message : 'Rejection failed'),
    });
  };

  const challengeColumns = buildChallengeColumns(handleEdit, handleDelete, handleAdvance);
  const participationColumns = buildParticipationColumns(handleApprove, handleReject);

  if (chError) {
    return (
      <div className="p-6">
        <PageHeader title="Challenges" />
        <Card>
          <CardContent className="flex items-center gap-2 py-8 text-destructive">
            <AlertCircle size={16} /><span>Failed to load challenges. Please refresh.</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeChallenges = (challenges ?? []).filter(c => c.status === 'active');
  const myPartMap = new Map((myParticipations ?? []).map((p: any) => [p.challenge_id, p as Participation]));
  const pendingApprovals = (allParticipations ?? []).filter((p: any) => p.approval_status === 'pending');

  const renderChallengeGrid = (list: Challenge[]) => {
    if (list.length === 0) return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
          <ClipboardList size={40} strokeWidth={1.5} />
          <p className="text-sm">No active challenges available right now.</p>
        </CardContent>
      </Card>
    );

    return (
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {list.map(c => {
          const myPart = myPartMap.get(c.id);
          const joined = !!myPart;
          const approved = myPart?.approval_status === 'approved';

          return (
            <Card key={c.id} className={`flex flex-col hover:border-primary/30 transition-all duration-300 ${approved ? 'border-green-500/40 bg-green-50/5' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  {getDifficultyBadge(c.difficulty)}
                  <Badge variant="secondary" className="font-semibold text-primary">{c.xp} XP</Badge>
                </div>
                <CardTitle className="text-base font-semibold mt-2">{c.title}</CardTitle>
                <CardDescription className="text-xs">{c.category?.name ?? 'General'}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between pt-0 space-y-4">
                <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">{c.description}</p>
                <div className="space-y-1.5 pt-2 border-t text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Calendar size={12} />
                    <span>Due: {c.deadline ? new Date(c.deadline).toLocaleDateString() : 'No limit'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {c.evidence_required
                      ? <><FileText size={12} className="text-yellow-600" /><span>Proof required</span></>
                      : <><CheckSquare size={12} className="text-green-600" /><span>Self-report</span></>}
                  </div>
                  {joined && (
                    <div className="flex items-center gap-1.5 mt-1">
                      {getApprovalBadge(myPart!.approval_status)}
                      {approved && <span className="text-green-600 font-medium">+{myPart!.xp_awarded ?? c.xp} XP earned</span>}
                    </div>
                  )}
                </div>
                <Button size="sm" className="w-full mt-2" variant={approved ? 'outline' : 'default'}
                  onClick={() => handleJoinOpen(c)}>
                  {approved
                    ? <span className="inline-flex items-center gap-1"><CheckCircle2 size={14} />Completed</span>
                    : joined ? 'View / Submit Proof' : 'Join Challenge'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Sustainability Challenges"
        description="Browse and complete sustainability challenges to earn XP and badges."
        action={isAdminOrManager ? (
          <Button onClick={handleCreate} id="btn-create-challenge">
            <Plus size={16} className="mr-2" />Add Challenge
          </Button>
        ) : undefined}
      />

      {isAdminOrManager ? (
        <Tabs defaultValue="browse">
          <TabsList>
            <TabsTrigger value="browse" id="tab-challenges-browse">Browse Challenges</TabsTrigger>
            <TabsTrigger value="approvals" id="tab-challenges-approvals">
              Approval Queue
              {pendingApprovals.length > 0 && (
                <Badge className="ml-2 h-5 min-w-5 px-1 text-[10px] bg-destructive hover:bg-destructive">
                  {pendingApprovals.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="admin" id="tab-challenges-admin">Lifecycle Manager</TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="mt-4">
            {chLoading ? <Skeleton className="h-40 w-full" /> : renderChallengeGrid(activeChallenges)}
          </TabsContent>

          <TabsContent value="approvals" className="mt-4 space-y-4">
            <h2 className="text-sm font-semibold text-muted-foreground">Pending Participation Approvals</h2>
            {pendingApprovals.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                  <CheckCircle2 size={32} strokeWidth={1.5} />
                  <p className="text-sm">No pending submissions to review.</p>
                </CardContent>
              </Card>
            ) : (
              <DataTable columns={participationColumns} data={pendingApprovals as unknown as Participation[]} />
            )}
          </TabsContent>

          <TabsContent value="admin" className="mt-4">
            {chLoading ? <Skeleton className="h-40 w-full" /> : (
              <DataTable columns={challengeColumns} data={challenges ?? []} />
            )}
          </TabsContent>
        </Tabs>
      ) : (
        <Tabs defaultValue="browse">
          <TabsList>
            <TabsTrigger value="browse" id="tab-emp-challenges-browse">Browse Challenges</TabsTrigger>
            <TabsTrigger value="mine" id="tab-emp-challenges-mine">My Challenges</TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="mt-4">
            {chLoading ? <Skeleton className="h-40 w-full" /> : renderChallengeGrid(activeChallenges)}
          </TabsContent>

          <TabsContent value="mine" className="mt-4 space-y-4">
            {!myParticipations ? <Skeleton className="h-40 w-full" /> :
              myParticipations.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                    <ClipboardList size={32} strokeWidth={1.5} />
                    <p className="text-sm">You haven't joined any challenges yet.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {(myParticipations as unknown as Participation[]).map(p => (
                    <Card key={p.id} className="space-y-2">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">{(p as any).challenge?.title ?? '–'}</CardTitle>
                          {getApprovalBadge(p.approval_status)}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2 pt-0">
                        <Progress value={p.progress ?? 0} className="h-1.5" />
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{p.progress ?? 0}% progress</span>
                          {p.approval_status === 'approved' && (
                            <span className="font-semibold text-green-600">+{p.xp_awarded} XP earned</span>
                          )}
                        </div>
                        {p.proof_url && (
                          <a href={p.proof_url} target="_blank" rel="noreferrer"
                            className="flex items-center gap-1 text-xs text-primary hover:underline">
                            <ExternalLink size={12} /> View submitted proof
                          </a>
                        )}
                        {p.approval_status !== 'approved' && (
                          <Button size="sm" variant="outline" className="w-full"
                            onClick={() => { setJoinTarget((p as any).challenge); setJoinDialogOpen(true); }}>
                            {p.proof_url ? 'Update Proof' : 'Submit Proof'}
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
          </TabsContent>
        </Tabs>
      )}

      <ChallengeEditDialog
        open={dialogOpen}
        onOpenChange={open => { setDialogOpen(open); if (!open) setEditing(null); }}
        editing={editing}
        categories={categories ?? []}
        onSuccess={() => qc.invalidateQueries({ queryKey: ['challenges_all'] })}
      />

      <JoinChallengeDialog
        open={joinDialogOpen}
        onOpenChange={open => { setJoinDialogOpen(open); if (!open) setJoinTarget(null); }}
        challenge={joinTarget}
        existingParticipation={joinTarget ? (myPartMap.get(joinTarget.id) ?? null) : null}
        userId={user?.id ?? ''}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={open => !open && setDeleteTarget(null)}
        title="Delete Challenge"
        description={`Are you sure you want to delete challenge "${deleteTarget?.title}"?`}
        confirmText="Delete"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
