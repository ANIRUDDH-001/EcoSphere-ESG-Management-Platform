import { ClipboardList, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';

export function CsrActivitiesPage() {
  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="CSR Activities"
        description="Manage corporate social responsibility activities for your organisation"
      />
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
          <ClipboardList size={40} strokeWidth={1.5} />
          <p className="text-sm">CSR Activities management is coming up next.</p>
          <span className="flex items-center gap-1 text-xs"><Loader2 size={12} className="animate-spin" /> Building…</span>
        </CardContent>
      </Card>
    </div>
  );
}
