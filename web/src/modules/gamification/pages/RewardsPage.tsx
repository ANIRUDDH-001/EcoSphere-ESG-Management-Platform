import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import * as Icons from 'lucide-react';
import {
  Gift, Star, Clock, AlertCircle, Plus, Pencil, Trash2, Box,
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

import { useAuth } from '@/lib/hooks/useAuth';
import {
  useRewards, useMyRedemptions, useRedeemReward,
  useCreateReward, useUpdateReward, useDeleteReward,
} from '../hooks';
import { rewardSchema, type RewardFormValues } from '../schemas';
import type { Reward, RewardRedemption } from '../api';

function RewardIcon({ name, size = 20, className }: { name: string; size?: number; className?: string }) {
  const IconComponent = (Icons as any)[name];
  if (!IconComponent) return <Gift size={size} className={className} />;
  return <IconComponent size={size} className={className} />;
}

// ─── Columns Builder (Admin table) ──────────────────────────────────────────
function buildColumns(
  onEdit: (r: Reward) => void,
  onDelete: (r: Reward) => void,
): ColumnDef<Reward>[] {
  return [
    {
      id: 'icon',
      header: 'Icon',
      cell: ({ row }) => <RewardIcon name={row.original.status === 'active' ? 'Gift' : 'Lock'} className="text-primary" />,
    },
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => <span className="font-semibold">{row.original.name}</span>,
    },
    {
      accessorKey: 'points_required',
      header: 'Points Required',
      cell: ({ row }) => <span className="font-semibold tabular-nums text-primary">{row.original.points_required} pts</span>,
    },
    {
      accessorKey: 'stock',
      header: 'Stock',
      cell: ({ row }) => <span className="tabular-nums">{row.original.stock}</span>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <span className={`text-xs font-semibold capitalize ${row.original.status === 'active' ? 'text-green-600' : 'text-muted-foreground'}`}>
          {row.original.status}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }: { row: { original: Reward } }) => (
        <div className="flex items-center gap-2 justify-end">
          <Button
            size="sm"
            variant="ghost"
            aria-label="Edit reward"
            onClick={() => onEdit(row.original)}
          >
            <Pencil size={14} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            aria-label="Delete reward"
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
function RewardEditDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Reward | null;
}) {
  const createMutation = useCreateReward();
  const updateMutation = useUpdateReward();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useForm<RewardFormValues, any, RewardFormValues>({
    resolver: zodResolver(rewardSchema) as any,
    defaultValues: editing
      ? {
          name: editing.name ?? '',
          description: editing.description ?? '',
          points_required: editing.points_required ?? 100,
          stock: editing.stock ?? 10,
          status: (editing.status as any) ?? 'active',
        }
      : { points_required: 100, stock: 10, status: 'active' },
  });

  const onSubmit = async (values: RewardFormValues) => {
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, payload: values });
        toast.success('Reward updated successfully');
      } else {
        await createMutation.mutateAsync(values);
        toast.success('Reward created successfully');
      }
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save reward');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit Reward' : 'Create Reward'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="rwd-name">Name</Label>
            <Input id="rwd-name" placeholder="e.g. Tree Planting Sponsorship" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="rwd-desc">Description</Label>
            <Input id="rwd-desc" placeholder="Get a tree planted in your name…" {...register('description')} />
            {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="rwd-points">Points Required</Label>
              <Input id="rwd-points" type="number" min={1} {...register('points_required')} />
              {errors.points_required && <p className="text-xs text-destructive">{errors.points_required.message}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="rwd-stock">Stock Available</Label>
              <Input id="rwd-stock" type="number" min={0} {...register('stock')} />
              {errors.stock && <p className="text-xs text-destructive">{errors.stock.message}</p>}
            </div>
          </div>

          <div className="space-y-1">
            <Label>Status</Label>
            <Select
              value={watch('status')}
              onValueChange={v => setValue('status', v as any, { shouldValidate: true })}
            >
              <SelectTrigger id="rwd-status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            {errors.status && <p className="text-xs text-destructive">{errors.status.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : editing ? 'Save Changes' : 'Create Reward'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export function RewardsPage() {
  const { role, user, profile, refetchProfile } = useAuth();
  const isAdmin = role === 'admin';

  const { data: rewards, isLoading: rewardsLoading, error: rewardsError } = useRewards();
  const { data: redemptions, isLoading: redempLoading } = useMyRedemptions(user?.id);

  const redeemMutation = useRedeemReward();
  const deleteMutation = useDeleteReward();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Reward | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Reward | null>(null);

  const handleEdit = (r: Reward) => { setEditing(r); setDialogOpen(true); };
  const handleDelete = (r: Reward) => setDeleteTarget(r);
  const handleCreate = () => { setEditing(null); setDialogOpen(true); };

  const handleRedeem = async (r: Reward) => {
    if (!user) return;
    try {
      await redeemMutation.mutateAsync({ rewardId: r.id, employeeId: user.id });
      toast.success(`Successfully redeemed "${r.name}"!`);
      refetchProfile();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Redemption failed');
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success('Reward deleted');
    } catch {
      toast.error('Failed to delete reward');
    }
    setDeleteTarget(null);
  };

  const columns = buildColumns(handleEdit, handleDelete);

  type RedemptionRow = RewardRedemption & {
    reward?: Reward | null;
  };

  const redempColumns: ColumnDef<RedemptionRow>[] = [
    {
      id: 'reward',
      header: 'Reward',
      cell: ({ row }) => <span className="font-semibold">{row.original.reward?.name ?? '–'}</span>,
    },
    {
      accessorKey: 'points_spent',
      header: 'Points Spent',
      cell: ({ row }) => <span className="tabular-nums">{row.original.points_spent} pts</span>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.status === 'fulfilled' ? 'default' : 'secondary'} className="capitalize h-5">
          {row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: 'redeemed_at',
      header: 'Redeemed At',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground tabular-nums">
          {row.original.redeemed_at ? new Date(row.original.redeemed_at).toLocaleDateString() : '–'}
        </span>
      ),
    },
  ];

  if (rewardsError) {
    return (
      <div className="p-6">
        <PageHeader title="Rewards" />
        <Card>
          <CardContent className="flex items-center gap-2 py-8 text-destructive">
            <AlertCircle size={16} />
            <span>Failed to load rewards. Please refresh.</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  const availableRewards = (rewards ?? []).filter(r => r.status === 'active');

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Redeemable Rewards"
        description="Redeem your sustainability points for eco-friendly corporate perks, vouchers, or charity sponsorships."
        action={
          isAdmin ? (
            <Button onClick={handleCreate} id="btn-create-reward">
              <Plus size={16} className="mr-2" />
              Add Reward
            </Button>
          ) : undefined
        }
      />

      {isAdmin ? (
        <Tabs defaultValue="employee">
          <TabsList>
            <TabsTrigger value="employee" id="tab-rewards-employee">Employee Store</TabsTrigger>
            <TabsTrigger value="admin" id="tab-rewards-admin">Admin Catalog</TabsTrigger>
          </TabsList>
          <TabsContent value="employee" className="mt-4 space-y-8">
            <div className="flex items-center justify-between bg-primary/5 border rounded-lg p-4">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase">My Points Balance</span>
                <div className="text-2xl font-bold text-primary tabular-nums">{profile?.points_balance ?? 0} pts</div>
              </div>
              <Star size={36} className="text-yellow-500" />
            </div>

            {rewardsLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {availableRewards.map(r => {
                  const points = profile?.points_balance ?? 0;
                  const affordable = points >= (r.points_required ?? 0);
                  const inStock = (r.stock ?? 0) > 0;
                  return (
                    <Card key={r.id} className="flex flex-col">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary" className="font-semibold tabular-nums text-primary bg-primary/5">
                            {r.points_required} pts
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Box size={12} /> {r.stock} in stock
                          </span>
                        </div>
                        <CardTitle className="text-base font-semibold mt-2">{r.name}</CardTitle>
                        <CardDescription className="text-xs mt-1">{r.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="flex flex-1 flex-col justify-end pt-0">
                        <Button
                          size="sm"
                          className="w-full mt-4"
                          disabled={!affordable || !inStock || redeemMutation.isPending}
                          onClick={() => handleRedeem(r)}
                        >
                          {!inStock ? 'Out of Stock' : !affordable ? 'Insufficient Points' : 'Redeem Reward'}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            <div>
              <h2 className="text-base font-semibold mb-3">My Redemptions</h2>
              {redempLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : !redemptions || redemptions.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                    <Clock size={28} strokeWidth={1.5} />
                    <p className="text-sm">You have not redeemed any rewards yet.</p>
                  </CardContent>
                </Card>
              ) : (
                <DataTable columns={redempColumns} data={redemptions as RedemptionRow[]} />
              )}
            </div>
          </TabsContent>
          <TabsContent value="admin" className="mt-4">
            {rewardsLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <DataTable columns={columns} data={rewards ?? []} />
            )}
          </TabsContent>
        </Tabs>
      ) : (
        <div className="space-y-8">
          <div className="flex items-center justify-between bg-primary/5 border rounded-lg p-4">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase">My Points Balance</span>
              <div className="text-2xl font-bold text-primary tabular-nums">{profile?.points_balance ?? 0} pts</div>
            </div>
            <Star size={36} className="text-yellow-500" />
          </div>

          {rewardsLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {availableRewards.map(r => {
                const points = profile?.points_balance ?? 0;
                const affordable = points >= (r.points_required ?? 0);
                const inStock = (r.stock ?? 0) > 0;
                return (
                  <Card key={r.id} className="flex flex-col">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="font-semibold tabular-nums text-primary bg-primary/5">
                          {r.points_required} pts
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Box size={12} /> {r.stock} in stock
                        </span>
                      </div>
                      <CardTitle className="text-base font-semibold mt-2">{r.name}</CardTitle>
                      <CardDescription className="text-xs mt-1">{r.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-1 flex-col justify-end pt-0">
                      <Button
                        size="sm"
                        className="w-full mt-4"
                        disabled={!affordable || !inStock || redeemMutation.isPending}
                        onClick={() => handleRedeem(r)}
                      >
                        {!inStock ? 'Out of Stock' : !affordable ? 'Insufficient Points' : 'Redeem Reward'}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          <div>
            <h2 className="text-base font-semibold mb-3">My Redemptions</h2>
            {redempLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : !redemptions || redemptions.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                  <Clock size={28} strokeWidth={1.5} />
                  <p className="text-sm">You have not redeemed any rewards yet.</p>
                </CardContent>
              </Card>
            ) : (
              <DataTable columns={redempColumns} data={redemptions as RedemptionRow[]} />
            )}
          </div>
        </div>
      )}

      <RewardEditDialog
        open={dialogOpen}
        onOpenChange={open => { setDialogOpen(open); if (!open) setEditing(null); }}
        editing={editing}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={open => !open && setDeleteTarget(null)}
        title="Delete Reward"
        description={`Are you sure you want to delete reward "${deleteTarget?.name}"?`}
        confirmText="Delete"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
