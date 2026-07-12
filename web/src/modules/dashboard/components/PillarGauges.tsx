import { ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { scoreBand } from '../../../lib/scoreBand';

function MiniGauge({ value, colorVar, title }: { value: number, colorVar: string, title: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  const band = scoreBand(clamped);
  
  const data = [
    { name: "Score", value: clamped, color: `hsl(var(${colorVar}))` },
    { name: "Remaining", value: 100 - clamped, color: "hsl(var(--muted))" }
  ];

  return (
    <div className="flex flex-col items-center">
      <h3 className="text-slate-600 font-medium mb-4">{title}</h3>
      <div className="relative w-full max-w-[160px] aspect-[2/1]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="75%"
              startAngle={180}
              endAngle={0}
              innerRadius="60%"
              outerRadius="80%"
              dataKey="value"
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <text key={clamped} x="50%" y="70%" textAnchor="middle" dominantBaseline="middle" className="text-2xl font-bold fill-foreground tabular-nums animate-value-update">
              {clamped}
            </text>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 text-sm font-medium text-slate-500 capitalize">
        {band}
      </div>
    </div>
  );
}

export function PillarGauges({ orgScore, isLoading }: { orgScore: any, isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-full min-h-[280px]">
        <h2 className="text-xl font-semibold mb-6 text-slate-800">Pillars</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="animate-pulse bg-slate-200 h-24 rounded-t-full mt-8 mx-auto w-3/4"></div>
          <div className="animate-pulse bg-slate-200 h-24 rounded-t-full mt-8 mx-auto w-3/4"></div>
          <div className="animate-pulse bg-slate-200 h-24 rounded-t-full mt-8 mx-auto w-3/4"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-full min-h-[280px]">
      <h2 className="text-xl font-semibold mb-6 text-slate-800">Pillars</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 divide-y md:divide-y-0 md:divide-x divide-slate-100">
        <div className="pt-4 md:pt-0">
          <MiniGauge value={orgScore?.environmental || 0} colorVar="--pillar-environmental" title="Environmental" />
        </div>
        <div className="pt-4 md:pt-0">
          <MiniGauge value={orgScore?.social || 0} colorVar="--pillar-social" title="Social" />
        </div>
        <div className="pt-4 md:pt-0">
          <MiniGauge value={orgScore?.governance || 0} colorVar="--pillar-governance" title="Governance" />
        </div>
      </div>
    </div>
  );
}
