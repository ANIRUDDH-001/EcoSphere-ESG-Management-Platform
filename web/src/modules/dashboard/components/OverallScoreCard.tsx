import { Gauge } from '../../../components/shared/Gauge';
import { ArrowUpIcon, ArrowDownIcon, MinusIcon } from 'lucide-react';
import type { OrgScoreSnapshot } from '../../../lib/hooks/scores';

interface OverallScoreCardProps {
  score: number;
  trendData: OrgScoreSnapshot[];
  isLoading?: boolean;
}

export function OverallScoreCard({ score, trendData, isLoading }: OverallScoreCardProps) {
  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center animate-pulse h-full min-h-[280px]">
        <div className="w-40 h-20 bg-slate-200 rounded-t-full mb-6"></div>
        <div className="w-32 h-6 bg-slate-200 rounded-full"></div>
      </div>
    );
  }

  let delta: number | null = null;
  
  if (trendData && trendData.length >= 2) {
    const latest = trendData[trendData.length - 1].overall_esg;
    const prior = trendData[trendData.length - 2].overall_esg;
    delta = Number(latest) - Number(prior);
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center h-full min-h-[280px]">
      <h2 className="text-xl font-semibold mb-6 text-slate-800 self-start w-full">Overall ESG Score</h2>
      
      <div className="relative w-full max-w-[260px] aspect-[2/1] flex-1">
        <Gauge value={score} />
      </div>
      
      <div className="mt-6 flex items-center justify-center h-8">
        {delta !== null ? (
          <div key={delta} className={`flex items-center gap-1.5 font-medium px-3 py-1 rounded-full text-sm animate-value-update ${
            delta > 0 ? 'bg-green-50 text-green-700' : 
            delta < 0 ? 'bg-red-50 text-red-700' : 
            'bg-slate-100 text-slate-700'
          }`}>
            {delta > 0 ? <ArrowUpIcon className="w-4 h-4" /> : 
             delta < 0 ? <ArrowDownIcon className="w-4 h-4" /> : 
             <MinusIcon className="w-4 h-4" />}
            <span>{Math.abs(delta).toFixed(1)} pts</span>
          </div>
        ) : (
          <div className="text-slate-500 text-sm italic">No prior snapshot</div>
        )}
      </div>
    </div>
  );
}
