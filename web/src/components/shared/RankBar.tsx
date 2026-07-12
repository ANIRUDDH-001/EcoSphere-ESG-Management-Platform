import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";

export function RankBar({ data, dataKey, xAxisKey }: { data: any[], dataKey: string, xAxisKey: string }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
        <XAxis type="number" hide />
        <YAxis dataKey={xAxisKey} type="category" className="text-xs fill-muted-foreground" tickLine={false} axisLine={false} />
        <Tooltip 
          contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)' }}
          cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
        />
        <Bar dataKey={dataKey} radius={[0, 4, 4, 0]}>
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={`hsl(var(--chart-${(index % 6) + 1}))`}/>
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
