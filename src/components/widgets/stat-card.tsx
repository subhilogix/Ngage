import { GlassCard } from "./glass-card";
import { AnimatedCounter } from "./animated-counter";
import { cn } from "@/lib/utils";
import { type LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

type Props = {
  label: string;
  value: number;
  suffix?: string;
  prefix?: string;
  icon: LucideIcon;
  delta?: number;
  tone?: "default" | "success" | "warning" | "destructive" | "info";
  decimals?: number;
};

const tones: Record<NonNullable<Props["tone"]>, string> = {
  default: "from-primary/30 to-primary/5 text-primary",
  success: "from-success/30 to-success/5 text-success",
  warning: "from-warning/30 to-warning/5 text-warning",
  destructive: "from-destructive/30 to-destructive/5 text-destructive",
  info: "from-info/30 to-info/5 text-info",
};

export function StatCard({
  label,
  value,
  suffix,
  prefix,
  icon: Icon,
  delta,
  tone = "default",
  decimals = 0,
}: Props) {
  const positive = (delta ?? 0) >= 0;
  return (
    <GlassCard className="relative overflow-hidden p-5">
      <div
        className={cn(
          "absolute -right-8 -top-8 size-32 rounded-full bg-gradient-to-br blur-2xl opacity-60",
          tones[tone],
        )}
      />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">
            <AnimatedCounter value={value} prefix={prefix} suffix={suffix} decimals={decimals} />
          </p>
          {delta !== undefined && (
            <p
              className={cn(
                "mt-2 inline-flex items-center gap-1 text-xs font-medium",
                positive ? "text-success" : "text-destructive",
              )}
            >
              {positive ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
              {positive ? "+" : ""}
              {delta}% vs last quarter
            </p>
          )}
        </div>
        <div
          className={cn(
            "flex size-11 items-center justify-center rounded-xl bg-gradient-to-br",
            tones[tone],
          )}
        >
          <Icon className="size-5" />
        </div>
      </div>
    </GlassCard>
  );
}
