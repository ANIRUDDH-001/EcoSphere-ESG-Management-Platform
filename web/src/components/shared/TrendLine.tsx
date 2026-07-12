import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export function TrendLine({ data, dataKey, xAxisKey }: { data: any[], dataKey: string | string[], xAxisKey: string }) {
  const keys = Array.isArray(dataKey) ? dataKey : [dataKey];
  
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
        <XAxis dataKey={xAxisKey} className="text-xs fill-muted-foreground" tickLine={false} axisLine={false} />
        <YAxis className="text-xs fill-muted-foreground" tickLine={false} axisLine={false} />
        <Tooltip 
          contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)' }}
          itemStyle={{ color: 'hsl(var(--foreground))' }}
        />
        {keys.map((k, index) => (
          <Line 
            key={k}
            type="monotone" 
            dataKey={k} 
            stroke={`hsl(var(--chart-${(index % 6) + 1}))`} 
            strokeWidth={2} 
            dot={{ r: 4 }} 
            activeDot={{ r: 6 }} 
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
