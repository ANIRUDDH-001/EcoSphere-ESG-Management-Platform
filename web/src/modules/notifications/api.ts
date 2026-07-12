import { supabaseClient } from '@/lib/supabaseClient';
import type { Database } from '@/types/database';

export type Notification = Database['public']['Tables']['notifications']['Row'];

export async function fetchNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await supabaseClient
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

export async function markNotificationRead(id: string): Promise<Notification> {
  const { data, error } = await supabaseClient
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const { error } = await supabaseClient
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null);
    
  if (error) throw error;
}
