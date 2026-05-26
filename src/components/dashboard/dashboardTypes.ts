import type { LucideIcon } from "lucide-react";

export type DerivedHomeStat = {
  label: string;
  value: string;
  trend: string;
  icon: LucideIcon;
  isUp: boolean;
};
