import { Trophy, Award, Star, Shield } from 'lucide-react';
import * as Icons from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatTile } from '@/components/shared/StatTile';
import { useAuth } from '@/lib/hooks/useAuth';
import { useMyChallengeParticipations, useMyBadgeAwards, useLeaderboard } from '../hooks';
import { Skeleton } from '@/components/ui/skeleton';

export function GamificationDashboard() {
  const { user, profile } = useAuth();

  const { data: participations, isLoading: partLoading } = useMyChallengeParticipations(user?.id);
  const { data: badgeAwards, isLoading: badgesLoading } = useMyBadgeAwards(user?.id);
  const { data: leaderboard, isLoading: leadLoading } = useLeaderboard();

  const activeChallengesCount = (participations ?? []).filter(
    p => p.approval_status === 'pending' && (p.progress ?? 0) < 100
  ).length;

  const completedChallengesCount = (participations ?? []).filter(
    p => p.approval_status === 'approved'
  ).length;

  // Rank position in leaderboard
  const rankPosition = leaderboard
    ? leaderboard.findIndex(p => p.id === user?.id) + 1
    : 0;

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Gamification Dashboard"
        description="Track your sustainability challenges, badges, and ranking on the organisation leaderboard."
      />

      {/* KPI Tiles */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {partLoading || leadLoading || badgesLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-lg" />)
        ) : (
          <>
            <StatTile
              title="My Points Balance"
              value={`${profile?.points_balance ?? 0} pts`}
              icon={<Star size={18} className="text-yellow-500" />}
              description="Redeemable for organisation rewards"
            />
            <StatTile
              title="Total XP"
              value={`${profile?.xp ?? 0} XP`}
              icon={<Trophy size={18} className="text-amber-500" />}
              description="Increases your leaderboard rank"
            />
            <StatTile
              title="Leaderboard Rank"
              value={rankPosition > 0 ? `#${rankPosition}` : 'Unranked'}
              icon={<Shield size={18} className="text-primary" />}
              description={`Out of ${leaderboard?.length ?? 0} employees`}
            />
            <StatTile
              title="Completed Challenges"
              value={String(completedChallengesCount)}
              icon={<Award size={18} className="text-green-500" />}
              description={`${activeChallengesCount} active challenge(s)`}
            />
          </>
        )}
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Quick Actions / Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Sustainability Badges</CardTitle>
          </CardHeader>
          <CardContent className="h-[250px] flex flex-col justify-center items-center text-muted-foreground">
            {badgesLoading ? (
              <Skeleton className="h-full w-full" />
            ) : !badgeAwards || badgeAwards.length === 0 ? (
              <div className="text-center space-y-2">
                <Award size={40} className="mx-auto" strokeWidth={1.5} />
                <p className="text-sm">No badges unlocked yet.</p>
                <p className="text-xs">Complete challenges and acknowledge policies to earn badges.</p>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-4 w-full">
                {badgeAwards.slice(0, 8).map((ba: any) => {
                  const b = (ba as any).badge;
                  return (
                    <div key={ba.id} className="text-center space-y-1">
                      <div className="h-12 w-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        {(() => {
                          const BadgeIconComp = (b?.icon && (Icons as any)[b.icon]) || Award;
                          return <BadgeIconComp size={22} strokeWidth={1.75} />;
                        })()}
                      </div>
                      <p className="text-xs font-medium truncate">{b?.name ?? 'Badge'}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Performers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Top Performers</CardTitle>
          </CardHeader>
          <CardContent className="h-[250px] overflow-auto">
            {leadLoading ? (
              <Skeleton className="h-full w-full" />
            ) : !leaderboard || leaderboard.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                No leaderboard data yet.
              </div>
            ) : (
              <div className="space-y-3">
                {leaderboard.slice(0, 5).map((p, idx) => (
                  <div key={p.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-muted-foreground w-4">#{idx + 1}</span>
                      <div>
                        <p className="text-sm font-medium">{p.full_name || p.email}</p>
                        <p className="text-xs text-muted-foreground">{(p as any).department?.name || 'Department'}</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold tabular-nums text-primary">{p.xp ?? 0} XP</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
