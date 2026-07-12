import { useState } from 'react';
import { Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useReportSummary } from '../hooks';

interface ExecSummaryProps {
  title: string;
  period: string;
  metrics: Record<string, number | string>;
  onSummaryGenerated?: (summary: string) => void;
}

export function ExecSummary({ title, period, metrics, onSummaryGenerated }: ExecSummaryProps) {
  const summaryMutation = useReportSummary();
  const [summary, setSummary] = useState<string | null>(null);
  const [isCached, setIsCached] = useState(false);
  const [isFallback, setIsFallback] = useState(false);

  const handleGenerate = () => {
    summaryMutation.mutate({
      title,
      period,
      metrics
    }, {
      onSuccess: (data) => {
        setSummary(data.summary);
        setIsCached(data.cached);
        setIsFallback(data.fallback);
        if (onSummaryGenerated) {
          onSummaryGenerated(data.summary);
        }
      }
    });
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Sparkles size={18} className="text-primary animate-pulse" />
            AI Executive Summary
          </CardTitle>
          <CardDescription>
            Grounded summary generated based only on the current report's metrics.
          </CardDescription>
        </div>
        {!summary && (
          <Button 
            size="sm" 
            onClick={handleGenerate} 
            disabled={summaryMutation.isPending}
            className="flex items-center gap-1.5"
          >
            {summaryMutation.isPending ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Generating…
              </>
            ) : (
              <>
                <Sparkles size={14} /> Generate Summary
              </>
            )}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {summaryMutation.isError && (
          <div className="flex items-center gap-2 text-destructive text-sm">
            <AlertCircle size={16} />
            <span>Failed to generate summary. Please try again.</span>
          </div>
        )}
        
        {summary && (
          <div className="space-y-2">
            <p className="text-sm text-foreground/90 leading-relaxed font-normal whitespace-pre-wrap">
              {summary}
            </p>
            <div className="flex gap-2 text-[10px] text-muted-foreground mt-2">
              {isCached && <span className="bg-muted px-2 py-0.5 rounded">Cached</span>}
              {isFallback && <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded">Deterministic Fallback</span>}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
