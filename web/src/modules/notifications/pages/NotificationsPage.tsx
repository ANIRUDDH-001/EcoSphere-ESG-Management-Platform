import { Bell, Check, Clock, AlertCircle, FileText } from 'lucide-react';

import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

import { useAuth } from '@/lib/hooks/useAuth';
import { useNotifications, useMarkRead, useMarkAllRead } from '../hooks';

function NotificationIcon({ type }: { type: string }) {
  switch (type) {
    case 'approval_decision':
      return <Check size={20} className="text-green-600" />;
    case 'badge_unlock':
      return <Bell size={20} className="text-yellow-600" />;
    case 'issue_raised':
      return <AlertCircle size={20} className="text-red-600" />;
    default:
      return <FileText size={20} className="text-muted-foreground" />;
  }
}

function NotificationContent({ notif }: { notif: any }) {
  const payload = notif.payload as any;
  if (notif.type === 'approval_decision') {
    return (
      <div>
        <p className="text-sm font-medium">Participation {payload?.decision}</p>
        <p className="text-xs text-muted-foreground mt-1">
          Your participation was {payload?.decision}. {payload?.xp_awarded ? `You earned ${payload.xp_awarded} XP.` : ''}
        </p>
      </div>
    );
  }
  if (notif.type === 'badge_unlock') {
    return (
      <div>
        <p className="text-sm font-medium">New Badge Unlocked!</p>
        <p className="text-xs text-muted-foreground mt-1">
          Congratulations! You unlocked the "{payload?.badge_name}" badge.
        </p>
      </div>
    );
  }
  if (notif.type === 'issue_raised') {
    return (
      <div>
        <p className="text-sm font-medium">Compliance Issue Raised</p>
        <p className="text-xs text-muted-foreground mt-1">
          A new issue "{payload?.issue_title}" requires your attention.
        </p>
      </div>
    );
  }
  return (
    <div>
      <p className="text-sm font-medium">Notification</p>
      <p className="text-xs text-muted-foreground mt-1">You have a new update.</p>
    </div>
  );
}

function groupNotifications(notifs: any[]) {
  const groups: Record<string, any[]> = {};
  for (const n of notifs) {
    const d = new Date(n.created_at);
    // Simple grouping by date string
    const dateKey = d.toLocaleDateString();
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(n);
  }
  return groups;
}

export function NotificationsPage() {
  const { user } = useAuth();
  const { data: notifications, isLoading, error } = useNotifications(user?.id);
  const markReadMutation = useMarkRead();
  const markAllReadMutation = useMarkAllRead();

  const handleMarkAll = () => {
    if (user?.id) {
      markAllReadMutation.mutate(user.id);
    }
  };

  const handleMarkRead = (id: string) => {
    markReadMutation.mutate(id);
  };

  const unreadCount = notifications?.filter(n => !n.read_at).length ?? 0;
  const grouped = notifications ? groupNotifications(notifications) : {};

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      <PageHeader
        title="Notifications"
        description="Stay updated on your CSR participation, challenges, and unlocked badges."
        action={
          unreadCount > 0 ? (
            <Button variant="outline" size="sm" onClick={handleMarkAll} disabled={markAllReadMutation.isPending}>
              <Check size={14} className="mr-2" /> Mark All as Read
            </Button>
          ) : undefined
        }
      />

      {error ? (
        <Card>
          <CardContent className="flex items-center gap-2 py-8 text-destructive">
            <AlertCircle size={16} />
            <span>Failed to load notifications. Please try again later.</span>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : !notifications || notifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
            <Bell size={40} strokeWidth={1.5} />
            <p className="text-sm">You have no notifications yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([dateKey, notifs]) => (
            <div key={dateKey} className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{dateKey}</h3>
              <div className="space-y-3">
                {notifs.map((notif) => (
                  <Card 
                    key={notif.id} 
                    className={`transition-colors ${!notif.read_at ? 'border-primary/50 bg-primary/5' : ''}`}
                  >
                    <CardContent className="flex items-start gap-4 p-4">
                      <div className="mt-1">
                        <NotificationIcon type={notif.type} />
                      </div>
                      <div className="flex-1">
                        <NotificationContent notif={notif} />
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-3">
                          <Clock size={10} />
                          {new Date(notif.created_at!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      {!notif.read_at && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 px-2 text-xs" 
                          onClick={() => handleMarkRead(notif.id)}
                          disabled={markReadMutation.isPending}
                        >
                          Mark Read
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
