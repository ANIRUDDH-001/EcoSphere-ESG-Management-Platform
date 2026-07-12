import { useState } from 'react';
import { TrendLine } from '../../../components/shared/TrendLine';
import { useScoreTrend } from '../../../lib/hooks/scores';

export function EsgTrendCard() {
  const [days, setDays] = useState<number>(30);
  const { data: trend } = useScoreTrend(days);
  const isLoading = trend === undefined;
  const isError = false;

  return (
    <div className="bg-card text-card-foreground p-6 rounded-xl shadow-sm border h-full flex flex-col min-h-[320px]">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-slate-800">Score Trend</h2>
        <div className="flex bg-slate-100 rounded-full p-1">
          {[30, 90, 180].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1 text-sm rounded-full font-medium transition-colors ${
                days === d ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-[220px]">
        {isLoading ? (
          <div className="w-full h-full bg-slate-50 animate-pulse rounded-lg border border-slate-100"></div>
        ) : isError ? (
          <div className="flex items-center justify-center h-full text-red-500">Failed to load trend data.</div>
        ) : trend && trend.length > 0 ? (
          <TrendLine data={trend} dataKey="overall_esg" xAxisKey="snapshot_date" />
        ) : (
          <div className="flex items-center justify-center h-full text-slate-500 bg-slate-50 rounded-lg border border-slate-100">
            No trend data available.
          </div>
        )}
      </div>
    </div>
  );
}
