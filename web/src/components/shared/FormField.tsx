import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";

export function FormField({ 
  label, 
  id, 
  error,
  children 
}: { 
  label: string; 
  id: string; 
  error?: string;
  children?: ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
