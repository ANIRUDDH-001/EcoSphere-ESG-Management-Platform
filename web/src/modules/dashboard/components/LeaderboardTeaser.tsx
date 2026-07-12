import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export function LeaderboardTeaser() {
  const [useLeaderboard, setUseLeaderboard] = useState<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const path = '../../gamification/hooks';
    // @ts-ignore
    import(/* @vite-ignore */ path)
      .then(mod => {
        setUseLeaderboard(() => mod.useLeaderboard);
        setIsLoaded(true);
      })
      .catch(() => {
        setIsLoaded(true);
      });
  }, []);

  if (!isLoaded) {
    return <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 animate-pulse h-64"></div>;
  }

  if (!useLeaderboard) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center h-full min-h-[256px]">
        <p className="text-slate-500 mb-2 text-center text-sm">Leaderboard unavailable.</p>
        <Link to="/gamification/leaderboard" className="text-indigo-600 hover:underline text-sm font-medium">Explore Gamification</Link>
      </div>
    );
  }

  return <LeaderboardTeaserContent useLeaderboard={useLeaderboard} />;
}

function LeaderboardTeaserContent({ useLeaderboard }: { useLeaderboard: any }) {
  const { data, isLoading, isError } = useLeaderboard(5);

  if (isLoading) return <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 animate-pulse h-64"></div>;
  if (isError || !data) return <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-64 flex items-center justify-center text-red-500">Error loading leaderboard.</div>;

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-full flex flex-col min-h-[256px]">
      <h2 className="text-lg font-semibold text-slate-800 mb-4">Top Contributors (XP)</h2>
      <div className="flex-1 overflow-y-auto space-y-2">
        {data.map((entry: any, index: number) => (
          <div key={entry.id} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
            <div className="flex items-center gap-3">
              <span className={`w-5 text-center font-bold text-sm ${index < 3 ? 'text-indigo-600' : 'text-slate-400'}`}>
                {index + 1}
              </span>
              <span className="text-sm font-medium text-slate-700">{entry.full_name}</span>
            </div>
            <span className="text-sm font-bold text-slate-900 tabular-nums">{entry.xp} XP</span>
          </div>
        ))}
        {data.length === 0 && <div className="text-sm text-slate-500 py-2 text-center">No contributors yet.</div>}
      </div>
      <Link to="/gamification/leaderboard" className="mt-4 block text-indigo-600 hover:text-indigo-700 font-medium text-sm">
        View Leaderboard &rarr;
      </Link>
    </div>
  );
}
