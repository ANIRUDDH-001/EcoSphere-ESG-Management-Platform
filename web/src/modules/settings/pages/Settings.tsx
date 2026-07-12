import { PageHeader } from '@/components/shared/PageHeader';
import { useSettings } from '@/lib/hooks/useSettings';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { RequireRole } from '@/app/guards';

export function SettingsPage() {
  const { settings, isLoading, updateSettings, isUpdating } = useSettings();

  const [weights, setWeights] = useState({ env: 40, soc: 30, gov: 30 });
  const [toggles, setToggles] = useState({
    auto_emission: false,
    evidence_required: false,
    badge_auto_award: false,
    notify_in_app: false,
    notify_email: false,
  });

  useEffect(() => {
    if (settings) {
      setWeights({
        env: Math.round((settings.env_weight ?? 0.4) * 100),
        soc: Math.round((settings.social_weight ?? 0.3) * 100),
        gov: Math.round((settings.gov_weight ?? 0.3) * 100),
      });
      setToggles({
        auto_emission: settings.auto_emission_enabled ?? false,
        evidence_required: settings.evidence_required_enabled ?? false,
        badge_auto_award: settings.badge_auto_award_enabled ?? false,
        notify_in_app: settings.notify_in_app ?? false,
        notify_email: settings.notify_email ?? false,
      });
    }
  }, [settings]);

  if (isLoading) return <div className="p-8">Loading settings...</div>;

  const totalWeight = weights.env + weights.soc + weights.gov;
  const isValid = Math.abs(totalWeight - 100) < 0.1;

  const handleSaveWeights = async () => {
    if (!isValid) {
      toast.error("Weights must sum to 100%");
      return;
    }
    
    try {
      await updateSettings({
        env_weight: weights.env / 100,
        social_weight: weights.soc / 100,
        gov_weight: weights.gov / 100
      });
      toast.success("Weights updated successfully.");
    } catch (err: any) {
      toast.error(err.message || "Failed to update weights");
    }
  };

  const handleToggle = async (key: keyof typeof toggles, value: boolean) => {
    setToggles(prev => ({ ...prev, [key]: value }));
    const dbKey = key === 'auto_emission' ? 'auto_emission_enabled' 
                : key === 'evidence_required' ? 'evidence_required_enabled' 
                : key === 'badge_auto_award' ? 'badge_auto_award_enabled' 
                : key;
    
    try {
      await updateSettings({ [dbKey]: value });
      toast.success("Setting updated.");
    } catch (err: any) {
      toast.error(err.message || "Failed to update setting");
      // Revert on error
      setToggles(prev => ({ ...prev, [key]: !value }));
    }
  };

  return (
    <RequireRole roles={['admin']}>
      <div className="p-8 space-y-8 max-w-4xl mx-auto">
        <PageHeader title="Platform Settings" description="Configure global platform behaviour and weights." />

        <Card>
          <CardHeader>
            <CardTitle>ESG Weights</CardTitle>
            <CardDescription>
              Configure the overall contribution of Environmental, Social, and Governance scores. Must sum to 100%.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Environmental Weight ({weights.env}%)</Label>
                </div>
                <Slider 
                  value={[weights.env]} 
                  onValueChange={([val]) => setWeights(p => ({ ...p, env: val }))} 
                  max={100} step={1} 
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Social Weight ({weights.soc}%)</Label>
                </div>
                <Slider 
                  value={[weights.soc]} 
                  onValueChange={([val]) => setWeights(p => ({ ...p, soc: val }))} 
                  max={100} step={1} 
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Governance Weight ({weights.gov}%)</Label>
                </div>
                <Slider 
                  value={[weights.gov]} 
                  onValueChange={([val]) => setWeights(p => ({ ...p, gov: val }))} 
                  max={100} step={1} 
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm font-medium">
                Total: <span className={isValid ? "text-primary" : "text-destructive"}>{totalWeight}%</span>
              </div>
              <Button onClick={handleSaveWeights} disabled={!isValid || isUpdating}>
                Save Weights
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Feature Toggles</CardTitle>
            <CardDescription>
              Enable or disable platform-wide functionality.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto Emission Calculation</Label>
                <div className="text-sm text-muted-foreground">Automatically compute emissions when source data is synced.</div>
              </div>
              <Switch checked={toggles.auto_emission} onCheckedChange={(val) => handleToggle('auto_emission', val)} />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Evidence Required</Label>
                <div className="text-sm text-muted-foreground">Require proof attachments for employee manual activities.</div>
              </div>
              <Switch checked={toggles.evidence_required} onCheckedChange={(val) => handleToggle('evidence_required', val)} />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Badge Auto Award</Label>
                <div className="text-sm text-muted-foreground">Automatically award badges when score thresholds are met.</div>
              </div>
              <Switch checked={toggles.badge_auto_award} onCheckedChange={(val) => handleToggle('badge_auto_award', val)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>
              Global notification delivery preferences.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>In-App Notifications</Label>
                <div className="text-sm text-muted-foreground">Enable delivery to the platform notification bell.</div>
              </div>
              <Switch checked={toggles.notify_in_app} onCheckedChange={(val) => handleToggle('notify_in_app', val)} />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email Notifications</Label>
                <div className="text-sm text-muted-foreground">Enable email delivery for urgent alerts.</div>
              </div>
              <Switch checked={toggles.notify_email} onCheckedChange={(val) => handleToggle('notify_email', val)} />
            </div>
            
            <div className="pt-4 border-t">
              <div id="settings-notifications-slot" className="p-4 border border-dashed rounded text-center text-sm text-muted-foreground">
                Reserved for per-type notification preferences (Track B3).
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </RequireRole>
  );
}
