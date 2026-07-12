import { createPortal } from 'react-dom';
import { Mail, BellRing } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseClient } from '@/lib/supabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface EsgSettings {
  id: number;
  notify_in_app: boolean;
  notify_email: boolean;
  env_weight?: number;
  social_weight?: number;
  gov_weight?: number;
  auto_emission_enabled?: boolean;
  evidence_required_enabled?: boolean;
  badge_auto_award_enabled?: boolean;
}

async function fetchSettings(): Promise<EsgSettings> {
  const { data, error } = await supabaseClient
    .from('esg_settings')
    .select('*')
    .single();

  if (error) throw error;
  return data as EsgSettings;
}

async function updateSettings(payload: { notify_in_app?: boolean; notify_email?: boolean }): Promise<void> {
  const { error } = await supabaseClient
    .from('esg_settings')
    .update(payload)
    .eq('id', 1);

  if (error) throw error;
}

export function NotificationSettings() {
  const { role } = useAuth();
  const qc = useQueryClient();
  const isAdmin = role === 'admin';

  const { data: settings, isLoading } = useQuery<EsgSettings, Error>({
    queryKey: ['esg_settings'],
    queryFn: fetchSettings,
  });

  const mutation = useMutation<void, Error, { notify_in_app?: boolean; notify_email?: boolean }>({
    mutationFn: updateSettings,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['esg_settings'] });
    }
  });

  const slotEl = document.getElementById('settings-notifications-slot');
  if (!slotEl) return null;

  if (isLoading || !settings) return null;

  const content = (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BellRing size={20} className="text-primary" />
          Notification Preferences
        </CardTitle>
        <CardDescription>
          Configure how and when notifications are delivered to the organization.
          {!isAdmin && ' (Admin only)'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="text-base">In-App Notifications</Label>
            <div className="text-sm text-muted-foreground">
              Enable delivery to the platform notification bell.
            </div>
          </div>
          <Switch 
            checked={settings.notify_in_app ?? true}
            disabled={!isAdmin || mutation.isPending}
            onCheckedChange={(v) => mutation.mutate({ notify_in_app: v })}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="text-base flex items-center gap-2">
              <Mail size={16} /> Email Notifications
            </Label>
            <div className="text-sm text-muted-foreground">
              Bonus channel: send email digests to users. Off by default.
            </div>
          </div>
          <Switch 
            checked={settings.notify_email ?? false}
            disabled={!isAdmin || mutation.isPending}
            onCheckedChange={(v) => mutation.mutate({ notify_email: v })}
          />
        </div>
      </CardContent>
    </Card>
  );

  return createPortal(content, slotEl);
}
