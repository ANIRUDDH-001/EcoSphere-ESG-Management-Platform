import { useState, useCallback } from 'react';
import { Lightbulb, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { useInsights } from '../hooks';

export function AiInsightBanner() {
  const { data, isLoading, isError, refetch, isFetching } = useInsights();
  const [expanded, setExpanded] = useState(false);
  const [isDebouncing, setIsDebouncing] = useState(false);

  const handleRefresh = useCallback(() => {
    if (isDebouncing) return;
    setIsDebouncing(true);
    refetch();
    setTimeout(() => setIsDebouncing(false), 2000);
  }, [refetch, isDebouncing]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-start gap-4">
        <div className="p-2.5 bg-indigo-50 rounded-lg text-indigo-600">
          <Lightbulb className="w-5 h-5" />
        </div>
        <div className="flex-1 space-y-3 py-1">
          <div className="h-4 bg-slate-200 rounded w-3/4 animate-pulse"></div>
          <div className="h-4 bg-slate-200 rounded w-1/2 animate-pulse"></div>
        </div>
      </div>
    );
  }

  // Error -> fallback state (network issue or 429)
  const safeData = isError || !data ? {
    summary: 'Executive dashboard loaded.',
    recommendations: ['Monitor your lowest performing pillars to improve overall ESG standing.'],
    fallback: true
  } : data;

  const topRec = safeData.recommendations?.[0];
  const otherRecs = safeData.recommendations?.slice(1) || [];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="p-2.5 bg-indigo-50 rounded-lg text-indigo-600 flex-shrink-0">
          <Lightbulb className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-4">
            <div className="space-y-1.5">
              <p className="text-slate-900 text-sm font-medium leading-relaxed">
                {safeData.summary}
              </p>
              {topRec && (
                <p className="text-slate-600 text-sm leading-relaxed">
                  <span className="font-semibold text-slate-800">Recommendation:</span> {topRec}
                </p>
              )}
            </div>
            <button
              onClick={handleRefresh}
              disabled={isFetching || isDebouncing}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-md hover:bg-slate-50 flex-shrink-0 transition-colors disabled:opacity-50"
              title="Refresh Insights"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          {expanded && otherRecs.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
              {otherRecs.map((rec, i) => (
                <p key={i} className="text-slate-600 text-sm leading-relaxed flex gap-2">
                  <span className="text-slate-400">&bull;</span>
                  <span>{rec}</span>
                </p>
              ))}
            </div>
          )}

          <div className="mt-4 flex items-center justify-between">
            {safeData.fallback ? (
              <span className="text-xs text-slate-400 italic">Based on latest data</span>
            ) : (
              <span className="text-xs text-slate-400">AI-generated insight</span>
            )}

            {otherRecs.length > 0 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-xs text-indigo-600 font-medium hover:text-indigo-700 flex items-center gap-1 px-2 py-1 -mr-2 rounded hover:bg-indigo-50 transition-colors"
              >
                {expanded ? 'View less' : 'View all'}
                {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
