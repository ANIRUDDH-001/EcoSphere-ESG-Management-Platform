import { useMemo } from 'react';
import { useDepartmentScores } from '../../../lib/hooks/scores';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";
import { scoreBandColor } from '../../../lib/scoreBand';

export function DepartmentRankingCard() {
  const { data: scores } = useDepartmentScores();
  const isLoading = scores === undefined;
  const isError = false;

  const sortedData = useMemo(() => {
    if (!scores) return [];
    return [...scores].sort((a, b) => Number(b.total_score) - Number(a.total_score));
  }, [scores]);

  return (
    <div className="bg-card text-card-foreground p-6 rounded-xl shadow-sm border h-full flex flex-col min-h-[320px]">
      <h2 className="text-xl font-semibold mb-6 text-slate-800">Department Ranking</h2>

      <div className="flex-1 min-h-[220px]">
        {isLoading ? (
          <div className="w-full h-full animate-pulse flex flex-col justify-center space-y-4">
            <div className="h-6 bg-slate-100 rounded w-full"></div>
            <div className="h-6 bg-slate-100 rounded w-5/6"></div>
            <div className="h-6 bg-slate-100 rounded w-4/6"></div>
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center h-full text-red-500">Failed to load ranking data.</div>
        ) : sortedData.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-500 bg-slate-50 rounded-lg border border-slate-100 text-center px-4">
            No departments scored yet.
          </div>
        ) : sortedData.length === 1 ? (
          <div className="flex items-center justify-center h-full text-slate-500 bg-slate-50 rounded-lg border border-slate-100 text-center px-4">
            Only one department has been scored. Add more for a ranking.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sortedData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
              <XAxis type="number" hide />
              <YAxis 
                dataKey="department_id" 
                type="category" 
                className="text-xs fill-slate-600 font-medium" 
                tickLine={false} 
                axisLine={false} 
                width={80} 
              />
              <Tooltip 
                contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)' }}
                cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
              />
              <Bar dataKey="total_score" radius={[0, 4, 4, 0]}>
                {sortedData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={scoreBandColor(Number(entry.total_score))} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
