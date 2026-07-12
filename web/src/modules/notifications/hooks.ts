import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchNotifications, markNotificationRead, markAllNotificationsRead } from './api';
import { useEffect } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';

export const notificationKeys = {
  all: (userId?: string) => ['notifications', userId] as const,
};

export function useNotifications(userId: string | undefined) {
  const qc = useQueryClient();
  
  useEffect(() => {
    if (!userId) return;
    const channel = supabaseClient
      .channel(`notifications:${userId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, () => {
        qc.invalidateQueries({ queryKey: notificationKeys.all(userId) });
      })
      .subscribe();
      
    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [userId, qc]);

  return useQuery({
    queryKey: notificationKeys.all(userId),
    queryFn: () => fetchNotifications(userId!),
    enabled: !!userId,
  });
}

export function useUnreadCount(userId: string | undefined) {
  const { data } = useNotifications(userId);
  return data?.filter(n => !n.read_at).length ?? 0;
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    }
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: (_, userId) => {
      qc.invalidateQueries({ queryKey: notificationKeys.all(userId) });
    }
  });
}
