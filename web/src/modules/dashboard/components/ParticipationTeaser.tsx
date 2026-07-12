import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export function ParticipationTeaser() {
  const [useParticipationSummary, setUseParticipationSummary] = useState<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const path = '../../social/hooks';
    // @ts-ignore
    import(/* @vite-ignore */ path)
      .then(mod => {
        setUseParticipationSummary(() => mod.useParticipationSummary);
        setIsLoaded(true);
      })
      .catch(() => {
        setIsLoaded(true);
      });
  }, []);

  if (!isLoaded) {
    return <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 animate-pulse h-48"></div>;
  }

  if (!useParticipationSummary) {
    // Empty state (Track B not merged)
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center h-full min-h-[192px]">
        <p className="text-slate-500 mb-2 text-center text-sm">Participation metrics unavailable.</p>
        <Link to="/social" className="text-indigo-600 hover:underline text-sm font-medium">Explore Social</Link>
      </div>
    );
  }

  return <ParticipationTeaserContent useParticipationSummary={useParticipationSummary} />;
}

function ParticipationTeaserContent({ useParticipationSummary }: { useParticipationSummary: any }) {
  const { data, isLoading, isError } = useParticipationSummary();

  if (isLoading) return <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 animate-pulse h-48"></div>;
  if (isError || !data) return <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-48 flex items-center justify-center text-red-500">Error loading participation.</div>;

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-full flex flex-col justify-between min-h-[192px]">
      <div>
         <h2 className="text-lg font-semibold text-slate-800">CSR Participation</h2>
         <div className="mt-4 flex items-end gap-3">
           <span className="text-4xl font-bold tabular-nums text-slate-900">{data.participationRate.toFixed(1)}%</span>
           <span className="text-sm text-slate-500 mb-1">of workforce</span>
         </div>
         <p className="text-sm text-slate-500 mt-2">{data.approvedCount} / {data.totalEmployees} employees active</p>
      </div>
      <Link to="/social" className="mt-4 inline-block text-indigo-600 hover:text-indigo-700 font-medium text-sm">
        View Social Module &rarr;
      </Link>
    </div>
  );
}
