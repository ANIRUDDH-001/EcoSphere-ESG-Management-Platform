import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import {
  ClipboardList, Plus, Pencil, Trash2, AlertCircle, ArrowRight, CheckCircle2, Archive, Play, RefreshCw, Calendar, FileText, CheckSquare,
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

// Zod schema for challenge form
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
  category?: {
    id: string;
    name: string;
  } | null;
}

interface Category {
  id: string;
  name: string;
  type: string;
}

// ─── Challenge Transition Map ────────────────────────────────────────────────
// draft -> active, archived
// active -> under_review, completed, archived
// under_review -> completed, active, archived
// completed -> archived
// archived -> none
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  draft: ['active', 'archived'],
  active: ['under_review', 'completed', 'archived'],
  under_review: ['completed', 'active', 'archived'],
  completed: ['archived'],
  archived: [],
};

// Helper for status styling
function getStatusBadge(status: string) {
  switch (status) {
    case 'draft':
      return <Badge variant="outline" className="capitalize">Draft</Badge>;
    case 'active':
      return <Badge className="capitalize bg-green-600 hover:bg-green-600">Active</Badge>;
    case 'under_review':
      return <Badge variant="secondary" className="capitalize bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/15">Under Review</Badge>;
    case 'completed':
      return <Badge className="capitalize bg-blue-600 hover:bg-blue-600">Completed</Badge>;
    case 'archived':
      return <Badge variant="outline" className="capitalize text-muted-foreground bg-muted">Archived</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

// Helper for difficulty styling
function getDifficultyBadge(diff: string) {
  switch (diff) {
    case 'easy':
      return <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50/10 capitalize">Easy</Badge>;
    case 'medium':
      return <Badge variant="outline" className="text-yellow-600 border-yellow-200 bg-yellow-50/10 capitalize">Medium</Badge>;
    case 'hard':
      return <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50/10 capitalize">Hard</Badge>;
    default:
      return null;
  }
}

// ─── Columns Builder (Admin table) ──────────────────────────────────────────
function buildColumns(
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
      header: 'Actions',
      cell: ({ row }) => {
        const nextStates = ALLOWED_TRANSITIONS[row.original.status] ?? [];
        if (nextStates.length === 0) return <span className="text-xs text-muted-foreground">None</span>;
        return (
          <div className="flex items-center gap-1">
            {nextStates.map(next => {
              let label = next;
              let icon = <ArrowRight size={12} />;
              if (next === 'active') { icon = <Play size={12} />; label = 'Activate'; }
              if (next === 'under_review') { icon = <RefreshCw size={12} />; label = 'Review'; }
              if (next === 'completed') { icon = <CheckCircle2 size={12} />; label = 'Complete'; }
              if (next === 'archived') { icon = <Archive size={12} />; label = 'Archive'; }

              return (
                <Button
                  key={next}
                  size="sm"
                  variant="outline"
                  className="h-7 text-[10px] px-2"
                  onClick={() => onAdvance(row.original, next)}
                >
                  {icon}
                  <span className="ml-1 capitalize">{label}</span>
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
          <Button
            size="sm"
            variant="ghost"
            aria-label="Edit challenge"
            onClick={() => onEdit(row.original)}
          >
            <Pencil size={14} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            aria-label="Delete challenge"
            onClick={() => onDelete(row.original)}
          >
            <Trash2 size={14} />
          </Button>
        </div>
      ),
    },
  ];
}

// ─── Dialog Component ────────────────────────────────────────────────────────
function ChallengeEditDialog({
  open,
  onOpenChange,
  editing,
  categories,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Challenge | null;
  categories: Category[];
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
  } = useForm<ChallengeFormValues, any, ChallengeFormValues>({
    resolver: zodResolver(challengeFormSchema) as any,
    defaultValues: editing
      ? {
          title: editing.title ?? '',
          description: editing.description ?? '',
          category_id: editing.category_id ?? '',
          xp: editing.xp ?? 100,
          deadline: editing.deadline ? new Date(editing.deadline).toISOString().split('T')[0] : '',
          difficulty: editing.difficulty ?? 'easy',
          status: editing.status ?? 'draft',
          evidence_required: editing.evidence_required ?? false,
        }
      : { xp: 100, difficulty: 'easy', status: 'draft', evidence_required: false },
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
        const { error } = await supabaseClient
          .from('challenges')
          .update(payload)
          .eq('id', editing.id);
        if (error) throw error;
        toast.success('Challenge updated successfully');
      } else {
        const { error } = await supabaseClient
          .from('challenges')
          .insert(payload);
        if (error) throw error;
        toast.success('Challenge created successfully');
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
              <Select
                value={watch('category_id')}
                onValueChange={v => setValue('category_id', v, { shouldValidate: true })}
              >
                <SelectTrigger id="ch-cat">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
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
              <Select
                value={watch('difficulty')}
                onValueChange={v => setValue('difficulty', v as any, { shouldValidate: true })}
              >
                <SelectTrigger id="ch-diff">
                  <SelectValue placeholder="Select difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
              {errors.difficulty && <p className="text-xs text-destructive">{errors.difficulty.message}</p>}
            </div>

            <div className="space-y-1">
              <Label>Status</Label>
              <Select
                value={watch('status')}
                onValueChange={v => setValue('status', v as any, { shouldValidate: true })}
              >
                <SelectTrigger id="ch-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
              {errors.status && <p className="text-xs text-destructive">{errors.status.message}</p>}
            </div>
          </div>

          <div className="flex items-center justify-between border rounded p-3">
            <div className="space-y-0.5">
              <Label>Require Submission Proof</Label>
              <p className="text-[11px] text-muted-foreground">Employees must upload a photo or doc evidence to complete this challenge</p>
            </div>
            <Switch
              checked={watch('evidence_required')}
              onCheckedChange={checked => setValue('evidence_required', checked)}
              id="ch-evidence"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : editing ? 'Save Changes' : 'Create Challenge'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export function ChallengesPage() {
  const { role } = useAuth();
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
        .from('categories')
        .select('*')
        .eq('type', 'challenge')
        .eq('status', 'active');
      if (error) throw error;
      return data as Category[];
    },
  });

  const advanceMutation = useMutation({
    mutationFn: async ({ id, nextStatus }: { id: string; nextStatus: string }) => {
      const { error } = await supabaseClient
        .from('challenges')
        .update({ status: nextStatus as any })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['challenges_all'] });
      toast.success('Challenge status updated successfully');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Status transition rejected by server');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabaseClient.from('challenges').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['challenges_all'] });
      toast.success('Challenge deleted successfully');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    },
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Challenge | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Challenge | null>(null);

  const handleEdit = (c: Challenge) => { setEditing(c); setDialogOpen(true); };
  const handleDelete = (c: Challenge) => setDeleteTarget(c);
  const handleCreate = () => { setEditing(null); setDialogOpen(true); };
  const handleAdvance = (c: Challenge, next: string) => {
    advanceMutation.mutate({ id: c.id, nextStatus: next });
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  const columns = buildColumns(handleEdit, handleDelete, handleAdvance);

  if (chError) {
    return (
      <div className="p-6">
        <PageHeader title="Challenges" />
        <Card>
          <CardContent className="flex items-center gap-2 py-8 text-destructive">
            <AlertCircle size={16} />
            <span>Failed to load challenges. Please refresh.</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeChallenges = (challenges ?? []).filter(c => c.status === 'active');

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Sustainability Challenges"
        description="Browse and complete sustainability challenges to earn XP and badges."
        action={
          isAdminOrManager ? (
            <Button onClick={handleCreate} id="btn-create-challenge">
              <Plus size={16} className="mr-2" />
              Add Challenge
            </Button>
          ) : undefined
        }
      />

      {isAdminOrManager ? (
        <Tabs defaultValue="employee">
          <TabsList>
            <TabsTrigger value="employee" id="tab-challenges-employee">Employee View</TabsTrigger>
            <TabsTrigger value="admin" id="tab-challenges-admin">Admin Lifecycle Manager</TabsTrigger>
          </TabsList>
          <TabsContent value="employee" className="mt-4 space-y-6">
            {chLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : activeChallenges.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
                  <ClipboardList size={40} strokeWidth={1.5} />
                  <p className="text-sm">No active challenges available right now.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {activeChallenges.map(c => (
                  <Card key={c.id} className="flex flex-col hover:border-primary/30 transition-all duration-300">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        {getDifficultyBadge(c.difficulty)}
                        <Badge variant="secondary" className="font-semibold text-primary">
                          {c.xp} XP
                        </Badge>
                      </div>
                      <CardTitle className="text-base font-semibold mt-2">{c.title}</CardTitle>
                      <CardDescription className="text-xs">{c.category?.name ?? 'General'}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col justify-between pt-0 space-y-4">
                      <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                        {c.description}
                      </p>
                      <div className="space-y-2 pt-2 border-t text-[11px] text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={12} />
                          <span>Deadline: {c.deadline ? new Date(c.deadline).toLocaleDateString() : 'No limit'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {c.evidence_required ? (
                            <>
                              <FileText size={12} className="text-yellow-600" />
                              <span>Submission proof required</span>
                            </>
                          ) : (
                            <>
                              <CheckSquare size={12} className="text-green-600" />
                              <span>Instant self-reporting</span>
                            </>
                          )}
                        </div>
                      </div>
                      <Button size="sm" className="w-full mt-2">
                        View & Join Challenge
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          <TabsContent value="admin" className="mt-4">
            {chLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <DataTable columns={columns} data={challenges ?? []} />
            )}
          </TabsContent>
        </Tabs>
      ) : (
        <div className="space-y-6">
          {chLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : activeChallenges.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
                <ClipboardList size={40} strokeWidth={1.5} />
                <p className="text-sm">No active challenges available right now.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {activeChallenges.map(c => (
                <Card key={c.id} className="flex flex-col hover:border-primary/30 transition-all duration-300">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      {getDifficultyBadge(c.difficulty)}
                      <Badge variant="secondary" className="font-semibold text-primary">
                        {c.xp} XP
                      </Badge>
                    </div>
                    <CardTitle className="text-base font-semibold mt-2">{c.title}</CardTitle>
                    <CardDescription className="text-xs">{c.category?.name ?? 'General'}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col justify-between pt-0 space-y-4">
                    <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                      {c.description}
                    </p>
                    <div className="space-y-2 pt-2 border-t text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={12} />
                        <span>Deadline: {c.deadline ? new Date(c.deadline).toLocaleDateString() : 'No limit'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {c.evidence_required ? (
                          <>
                            <FileText size={12} className="text-yellow-600" />
                            <span>Submission proof required</span>
                          </>
                        ) : (
                          <>
                            <CheckSquare size={12} className="text-green-600" />
                            <span>Instant self-reporting</span>
                          </>
                        )}
                      </div>
                    </div>
                    <Button size="sm" className="w-full mt-2">
                      View & Join Challenge
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      <ChallengeEditDialog
        open={dialogOpen}
        onOpenChange={open => { setDialogOpen(open); if (!open) setEditing(null); }}
        editing={editing}
        categories={categories ?? []}
        onSuccess={() => qc.invalidateQueries({ queryKey: ['challenges_all'] })}
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
