import { ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { scoreBandColor } from "@/lib/scoreBand";

export function Gauge({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  
  const color = scoreBandColor(clamped);

  const data = [
    { name: "Score", value: clamped, color },
    { name: "Remaining", value: 100 - clamped, color: "hsl(var(--muted))" }
  ];

  return (
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
        <text x="50%" y="70%" textAnchor="middle" dominantBaseline="middle" className="text-3xl font-bold fill-foreground tabular-nums">
          {clamped}
        </text>
      </PieChart>
    </ResponsiveContainer>
  );
}
