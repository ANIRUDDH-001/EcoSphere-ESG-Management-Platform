import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import * as Icons from 'lucide-react';
import {
  Award, Lock, Unlock, Plus, Pencil, Trash2, AlertCircle,
} from 'lucide-react';

import { DataTable } from '@/components/shared/DataTable';
import { PageHeader } from '@/components/shared/PageHeader';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge as UIBadge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

import { useAuth } from '@/lib/hooks/useAuth';
import { supabaseClient } from '@/lib/supabaseClient';
import { useBadges, useMyBadgeAwards } from '../hooks';
import type { Badge } from '../api';

// Icon Allow-list
const ICON_ALLOW_LIST = [
  'Award', 'Shield', 'Zap', 'Heart', 'Sparkles', 'Globe', 'Leaf', 'Flame',
  'CheckCircle', 'TrendingUp', 'UserCheck', 'Smile'
];

function BadgeIcon({ name, size = 20, className }: { name: string; size?: number; className?: string }) {
  const IconComponent = (Icons as any)[name];
  if (!IconComponent) return <Award size={size} className={className} />;
  return <IconComponent size={size} className={className} />;
}

// Zod Schema for Badge Editor
const badgeFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().min(1, 'Description is required').max(300),
  icon: z.string().min(1, 'Icon selection is required'),
  rule_type: z.enum(['xp', 'challenges_completed', 'participations_approved']),
  rule_value: z.preprocess(
    v => (v === '' || v === null || v === undefined ? undefined : Number(v)),
    z.number().min(1, 'Threshold must be at least 1')
  ),
});

type BadgeFormValues = z.infer<typeof badgeFormSchema>;

// Helper to format unlock rules
function formatUnlockRule(rule: any) {
  if (!rule || !rule.type) return 'Custom unlock criteria';
  const val = rule.gte ?? 0;
  if (rule.type === 'xp') return `Reach ${val} total XP`;
  if (rule.type === 'challenges_completed') return `Complete ${val} sustainability challenge(s)`;
  if (rule.type === 'participations_approved') return `Complete ${val} CSR activity/activities`;
  return `Threshold of ${val} on ${rule.type}`;
}

// ─── Columns Builder (Admin table) ──────────────────────────────────────────
function buildColumns(
  onEdit: (b: Badge) => void,
  onDelete: (b: Badge) => void,
): ColumnDef<Badge>[] {
  return [
    {
      id: 'icon',
      header: 'Icon',
      cell: ({ row }) => <BadgeIcon name={row.original.icon || 'Award'} className="text-primary" />,
    },
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => <span className="font-semibold">{row.original.name}</span>,
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.description}</span>,
    },
    {
      id: 'unlock_rule',
      header: 'Unlock Rule',
      cell: ({ row }) => (
        <span className="text-xs font-medium">{formatUnlockRule(row.original.unlock_rule)}</span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }: { row: { original: Badge } }) => (
        <div className="flex items-center gap-2 justify-end">
          <Button
            size="sm"
            variant="ghost"
            aria-label="Edit badge"
            onClick={() => onEdit(row.original)}
          >
            <Pencil size={14} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            aria-label="Delete badge"
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
function BadgeEditDialog({
  open,
  onOpenChange,
  editing,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Badge | null;
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
  } = useForm<BadgeFormValues, any, BadgeFormValues>({
    resolver: zodResolver(badgeFormSchema) as any,
    defaultValues: editing
      ? {
          name: editing.name ?? '',
          description: editing.description ?? '',
          icon: editing.icon ?? 'Award',
          rule_type: (editing.unlock_rule as any)?.type ?? 'xp',
          rule_value: (editing.unlock_rule as any)?.gte ?? 100,
        }
      : { icon: 'Award', rule_type: 'xp', rule_value: 100 },
  });

  const onSubmit = async (values: BadgeFormValues) => {
    try {
      const unlock_rule = {
        type: values.rule_type,
        gte: values.rule_value
      };

      const payload = {
        name: values.name,
        description: values.description,
        icon: values.icon,
        unlock_rule: unlock_rule as any
      };

      if (editing) {
        const { error } = await supabaseClient
          .from('badges')
          .update(payload)
          .eq('id', editing.id);
        if (error) throw error;
        toast.success('Badge updated successfully');
      } else {
        const { error } = await supabaseClient
          .from('badges')
          .insert(payload);
        if (error) throw error;
        toast.success('Badge created successfully');
      }
      onSuccess();
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save badge');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit Badge' : 'Create Badge'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="bdg-name">Name</Label>
            <Input id="bdg-name" placeholder="e.g. CSR Champion" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="bdg-desc">Description</Label>
            <Input id="bdg-desc" placeholder="Awarded for outstanding contribution…" {...register('description')} />
            {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Icon</Label>
              <Select
                value={watch('icon')}
                onValueChange={v => setValue('icon', v, { shouldValidate: true })}
              >
                <SelectTrigger id="bdg-icon">
                  <SelectValue placeholder="Select icon" />
                </SelectTrigger>
                <SelectContent>
                  {ICON_ALLOW_LIST.map(ic => (
                    <SelectItem key={ic} value={ic}>{ic}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.icon && <p className="text-xs text-destructive">{errors.icon.message}</p>}
            </div>

            <div className="space-y-1">
              <Label>Unlock Rule Type</Label>
              <Select
                value={watch('rule_type')}
                onValueChange={v => setValue('rule_type', v as any, { shouldValidate: true })}
              >
                <SelectTrigger id="bdg-rule-type">
                  <SelectValue placeholder="Select rule" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="xp">XP Earned</SelectItem>
                  <SelectItem value="challenges_completed">Challenges Done</SelectItem>
                  <SelectItem value="participations_approved">CSR Joined</SelectItem>
                </SelectContent>
              </Select>
              {errors.rule_type && <p className="text-xs text-destructive">{errors.rule_type.message}</p>}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="bdg-value">Threshold Value</Label>
            <Input id="bdg-value" type="number" min={1} {...register('rule_value')} />
            {errors.rule_value && <p className="text-xs text-destructive">{errors.rule_value.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : editing ? 'Save Changes' : 'Create Badge'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export function BadgesPage() {
  const { role, user } = useAuth();
  const isAdmin = role === 'admin';

  const { data: badges, isLoading: badgesLoading, error: badgesError, refetch } = useBadges();
  const { data: awards } = useMyBadgeAwards(user?.id);

  // Unlocked badge ids set
  const unlockedIds = new Set((awards ?? []).map((aw: any) => aw.badge_id));

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Badge | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Badge | null>(null);

  const handleEdit = (b: Badge) => { setEditing(b); setDialogOpen(true); };
  const handleDelete = (b: Badge) => setDeleteTarget(b);
  const handleCreate = () => { setEditing(null); setDialogOpen(true); };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { error } = await supabaseClient.from('badges').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      toast.success('Badge deleted');
      refetch();
    } catch (err) {
      toast.error('Failed to delete badge');
    }
    setDeleteTarget(null);
  };

  const columns = buildColumns(handleEdit, handleDelete);

  if (badgesError) {
    return (
      <div className="p-6">
        <PageHeader title="Badges" />
        <Card>
          <CardContent className="flex items-center gap-2 py-8 text-destructive">
            <AlertCircle size={16} />
            <span>Failed to load badges. Please refresh.</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  const earnedCount = (badges ?? []).filter(b => unlockedIds.has(b.id)).length;

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Badges & Achievements"
        description="Earn badges by completing sustainability actions, hitting XP milestones, and saving carbon."
        action={
          isAdmin ? (
            <Button onClick={handleCreate} id="btn-create-badge">
              <Plus size={16} className="mr-2" />
              Add Badge
            </Button>
          ) : undefined
        }
      />

      {isAdmin ? (
        <Tabs defaultValue="employee">
          <TabsList>
            <TabsTrigger value="employee" id="tab-badge-employee">Employee View</TabsTrigger>
            <TabsTrigger value="admin" id="tab-badge-admin">Admin Manager</TabsTrigger>
          </TabsList>
          <TabsContent value="employee" className="mt-4 space-y-6">
            <div className="text-sm font-semibold text-muted-foreground">
              You have unlocked {earnedCount} of {badges?.length ?? 0} badge(s)
            </div>
            {badgesLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {(badges ?? []).map(b => {
                  const unlocked = unlockedIds.has(b.id);
                  return (
                    <Card key={b.id} className={`transition-all duration-300 ${unlocked ? 'border-green-500 bg-green-50/10' : 'opacity-70 grayscale'}`}>
                      <CardHeader className="flex flex-row items-center gap-3 pb-2">
                        <div className={`p-2.5 rounded-full ${unlocked ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                          <BadgeIcon name={b.icon || 'Award'} size={24} />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-sm font-semibold flex items-center justify-between">
                            {b.name}
                            {unlocked ? (
                              <UIBadge className="bg-green-600 hover:bg-green-600 text-[10px] h-5 px-1.5">
                                <Unlock size={10} className="mr-1" /> Unlocked
                              </UIBadge>
                            ) : (
                              <UIBadge variant="secondary" className="text-[10px] h-5 px-1.5">
                                <Lock size={10} className="mr-1" /> Locked
                              </UIBadge>
                            )}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground mt-0.5">{formatUnlockRule(b.unlock_rule)}</p>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xs text-muted-foreground leading-normal">{b.description}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
          <TabsContent value="admin" className="mt-4">
            {badgesLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <DataTable columns={columns} data={badges ?? []} />
            )}
          </TabsContent>
        </Tabs>
      ) : (
        <div className="space-y-6">
          <div className="text-sm font-semibold text-muted-foreground">
            You have unlocked {earnedCount} of {badges?.length ?? 0} badge(s)
          </div>
          {badgesLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {(badges ?? []).map(b => {
                const unlocked = unlockedIds.has(b.id);
                return (
                  <Card key={b.id} className={`transition-all duration-300 ${unlocked ? 'border-green-500 bg-green-50/10' : 'opacity-70 grayscale'}`}>
                    <CardHeader className="flex flex-row items-center gap-3 pb-2">
                      <div className={`p-2.5 rounded-full ${unlocked ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                        <BadgeIcon name={b.icon || 'Award'} size={24} />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-sm font-semibold flex items-center justify-between">
                          {b.name}
                          {unlocked ? (
                            <UIBadge className="bg-green-600 hover:bg-green-600 text-[10px] h-5 px-1.5">
                              <Unlock size={10} className="mr-1" /> Unlocked
                            </UIBadge>
                          ) : (
                            <UIBadge variant="secondary" className="text-[10px] h-5 px-1.5">
                              <Lock size={10} className="mr-1" /> Locked
                            </UIBadge>
                          )}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">{formatUnlockRule(b.unlock_rule)}</p>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground leading-normal">{b.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      <BadgeEditDialog
        open={dialogOpen}
        onOpenChange={open => { setDialogOpen(open); if (!open) setEditing(null); }}
        editing={editing}
        onSuccess={refetch}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={open => !open && setDeleteTarget(null)}
        title="Delete Badge"
        description={`Are you sure you want to delete badge "${deleteTarget?.name}"?`}
        confirmText="Delete"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
