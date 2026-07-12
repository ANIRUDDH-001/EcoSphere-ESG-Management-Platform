import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { ReactNode } from "react";

export function ChartCard({ title, description, children }: { title: string, description?: string, children: ReactNode }) {
  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="h-[300px] w-full">
        {children}
      </CardContent>
    </Card>
  );
}
