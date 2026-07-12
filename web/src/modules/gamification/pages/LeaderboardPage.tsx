import { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { Trophy, Medal, Award, Star, Users } from 'lucide-react';

import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { useAuth } from '@/lib/hooks/useAuth';
import { useLeaderboard, useMyBadgeAwards } from '../hooks';
import { BadgeUnlockAnimation } from '@/components/shared/BadgeUnlockAnimation';

function BadgeIcon({ name, className }: { name: string; className?: string }) {
  const IconComponent = (Icons as any)[name] || Award;
  return <IconComponent className={className} />;
}

export function LeaderboardPage() {
  const { user } = useAuth();
  
  const { data: leaderboard, isLoading: lbLoading } = useLeaderboard(100);
  const { data: myBadges, isLoading: badgesLoading } = useMyBadgeAwards(user?.id);

  // Trigger animation for the newest badge if we want to simulate or check
  // For the scope of b2_06, we demonstrate the animation if a URL param is present
  // or if a new badge was just awarded.
  const [celebratingBadge, setCelebratingBadge] = useState<string | null>(null);
  
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const badgeToCelebrate = urlParams.get('unlock');
    if (badgeToCelebrate) {
      setCelebratingBadge(badgeToCelebrate);
      // clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const myRankIndex = leaderboard?.findIndex(l => l.id === user?.id) ?? -1;
  const myRank = myRankIndex >= 0 ? myRankIndex + 1 : null;
  const me = myRankIndex >= 0 ? leaderboard![myRankIndex] : null;

  // Compute department engagement
  const deptScores = new Map<string, { name: string; score: number }>();
  if (leaderboard) {
    for (const p of leaderboard) {
      if (p.department) {
        const id = p.department_id;
        const current = deptScores.get(id!) || { name: (p.department as any).name, score: 0 };
        current.score += (p.xp || 0); // department score is sum of XP
        deptScores.set(id!, current);
      }
    }
  }
  const topDepartments = Array.from(deptScores.values()).sort((a, b) => b.score - a.score);

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Leaderboards"
        description="See how you and your department stack up in sustainability efforts."
      />

      {/* My Badges Strip */}
      <Card className="bg-primary/5 border-primary/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Medal size={16} className="text-primary" />
            My Earned Badges
          </CardTitle>
        </CardHeader>
        <CardContent>
          {badgesLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : !myBadges || myBadges.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4 flex items-center gap-2">
              <Star size={16} /> You haven't earned any badges yet. Complete challenges to unlock them!
            </div>
          ) : (
            <div className="flex flex-wrap gap-4">
              {myBadges.map((ba: any) => {
                const badge = (ba as any).badge;
                return (
                  <div key={ba.id} className="flex flex-col items-center gap-1 w-20 group">
                    <div className="w-12 h-12 rounded-full bg-background border shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                      <BadgeIcon name={badge.icon_name} className="text-primary w-6 h-6" />
                    </div>
                    <span className="text-[10px] text-center font-medium leading-tight">{badge.name}</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="employees">
        <TabsList>
          <TabsTrigger value="employees" className="w-32">Employees</TabsTrigger>
          <TabsTrigger value="departments" className="w-32">Departments</TabsTrigger>
        </TabsList>

        <TabsContent value="employees" className="mt-4 space-y-4">
          {/* My Rank Highlight */}
          {me && myRank && (
            <div className="flex items-center justify-between p-4 bg-card border rounded-lg shadow-sm border-l-4 border-l-primary">
              <div className="flex items-center gap-4">
                <div className="font-bold text-2xl text-muted-foreground w-8 text-center">
                  #{myRank}
                </div>
                <div>
                  <div className="font-semibold text-lg">{me.full_name} <Badge variant="secondary" className="ml-2 text-[10px]">You</Badge></div>
                  <div className="text-xs text-muted-foreground">{(me.department as any)?.name ?? 'No Department'}</div>
                </div>
              </div>
              <div className="text-xl font-bold tabular-nums text-primary">{me.xp} XP</div>
            </div>
          )}

          {/* Full List */}
          <Card>
            <CardContent className="p-0">
              {lbLoading ? (
                <div className="p-4 space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : !leaderboard || leaderboard.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No data available.</div>
              ) : (
                <div className="divide-y">
                  {leaderboard.map((p, i) => (
                    <div key={p.id} className={`flex items-center justify-between p-4 hover:bg-muted/30 transition-colors ${p.id === user?.id ? 'bg-primary/5' : ''}`}>
                      <div className="flex items-center gap-4">
                        <div className={`font-bold text-xl w-8 text-center ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                          {i < 3 ? <Trophy size={20} className="mx-auto" /> : `#${i + 1}`}
                        </div>
                        <div>
                          <div className="font-medium text-sm">{p.full_name}</div>
                          <div className="text-xs text-muted-foreground">{(p.department as any)?.name ?? 'No Department'}</div>
                        </div>
                      </div>
                      <div className="font-semibold tabular-nums">{p.xp} <span className="text-xs text-muted-foreground font-normal">XP</span></div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="departments" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {lbLoading ? (
                <div className="p-4 space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : topDepartments.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No departmental data available.</div>
              ) : (
                <div className="divide-y">
                  {topDepartments.map((d, i) => (
                    <div key={d.name} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="font-bold text-xl w-8 text-center text-muted-foreground">
                          {i < 3 ? <Users size={20} className="mx-auto text-primary" /> : `#${i + 1}`}
                        </div>
                        <div className="font-medium text-sm">{d.name}</div>
                      </div>
                      <div className="font-semibold tabular-nums">{d.score} <span className="text-xs text-muted-foreground font-normal">Total XP</span></div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {celebratingBadge && (
        <BadgeUnlockAnimation 
          badgeName={celebratingBadge} 
          onComplete={() => setCelebratingBadge(null)} 
        />
      )}
    </div>
  );
}
