import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Bell, Check, AlertCircle, FileText, X } from 'lucide-react';
import { useQueryClient, useMutation } from '@tanstack/react-query';

import { useAuth } from '@/lib/hooks/useAuth';
import { markNotificationRead } from '../api';
import { useNotifications, useUnreadCount } from '../hooks';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

function BellIcon({ type }: { type: string }) {
  switch (type) {
    case 'approval_decision': return <Check size={14} className="text-green-600" />;
    case 'badge_unlock': return <Bell size={14} className="text-yellow-600" />;
    case 'issue_raised': return <AlertCircle size={14} className="text-red-600" />;
    default: return <FileText size={14} className="text-muted-foreground" />;
  }
}

function BellContent({ notif }: { notif: any }) {
  const payload = notif.payload as any;
  if (notif.type === 'approval_decision') return <span className="text-xs">Participation {payload?.decision}</span>;
  if (notif.type === 'badge_unlock') return <span className="text-xs">Unlocked: {payload?.badge_name}</span>;
  if (notif.type === 'issue_raised') return <span className="text-xs">Issue: {payload?.issue_title}</span>;
  return <span className="text-xs">New notification</span>;
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    }
  });
}

export function NotificationBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const { data: notifications } = useNotifications(user?.id);
  const unreadCount = useUnreadCount(user?.id);
  const markReadMutation = useMarkRead();

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // We are mounting this component dynamically into the #reserved-bell-slot
  const slotEl = document.getElementById('reserved-bell-slot');
  if (!slotEl) return null;

  const latestUnread = (notifications ?? []).filter(n => !n.read_at).slice(0, 5);

  const bellContent = (
    <div className="relative" ref={dropdownRef}>
      <Button 
        variant="ghost" 
        size="icon" 
        className="relative" 
        onClick={() => setOpen(!open)}
        aria-label="Notifications"
      >
        <Bell size={20} className="text-foreground" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] rounded-full transition-all duration-300 ease-in-out"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 bg-popover border rounded-md shadow-lg z-50 overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b bg-muted/50">
            <h3 className="text-sm font-semibold">Notifications</h3>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setOpen(false)}>
              <X size={14} />
            </Button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {latestUnread.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                No new notifications.
              </div>
            ) : (
              <div className="divide-y">
                {latestUnread.map(notif => (
                  <div key={notif.id || ''} className="p-3 hover:bg-muted/50 transition-colors flex items-start gap-3">
                    <div className="mt-0.5"><BellIcon type={notif.type || ''} /></div>
                    <div className="flex-1">
                      <BellContent notif={notif} />
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-5 w-5 text-muted-foreground hover:text-foreground"
                      title="Mark read"
                      onClick={(e) => {
                        e.stopPropagation();
                        markReadMutation.mutate(notif.id!);
                      }}
                    >
                      <Check size={12} />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="p-2 border-t bg-muted/20">
            <Button 
              variant="ghost" 
              className="w-full text-xs h-8" 
              onClick={() => {
                setOpen(false);
                window.location.href = '/notifications';
              }}
            >
              View All
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  return createPortal(bellContent, slotEl);
}
