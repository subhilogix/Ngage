import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/widgets/page-header";
import { GlassCard } from "@/components/widgets/glass-card";
import { StatusBadge } from "@/components/widgets/status-badge";
import { getGoalsFor, type Goal, type Quarter } from "@/lib/mock-data";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/checkins")({ component: CheckinsPage });

const QUARTERS: Quarter[] = ["Q1", "Q2", "Q3", "Q4"];

function CheckinsPage() {
  const { user } = useAuth();
  const list = getGoalsFor(user!.role, user!.id);
  const [q, setQ] = React.useState<Quarter>("Q2");

  const data = list.map((g) => ({
    name: g.title.length > 22 ? g.title.slice(0, 20) + "…" : g.title,
    planned: Math.round(g.quarterly[q].planned),
    actual: Math.round(g.quarterly[q].actual),
  }));

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Quarterly check-in"
        title="Plan vs Actual"
        description="Log your quarterly achievements, status, and notes for your manager."
        actions={<Button className="rounded-xl gradient-primary text-white" onClick={() => toast.success("Check-in submitted")}>Submit {q} check-in</Button>}
      />

      <Tabs value={q} onValueChange={(v) => setQ(v as Quarter)}>
        <TabsList className="rounded-xl bg-muted/60 p-1">
          {QUARTERS.map((qq) => (
            <TabsTrigger key={qq} value={qq} className="rounded-lg px-5">{qq}</TabsTrigger>
          ))}
        </TabsList>

        {QUARTERS.map((qq) => (
          <TabsContent key={qq} value={qq} className="space-y-6 pt-6">
            <GlassCard className="p-6">
              <h3 className="text-lg font-semibold">{qq} planned vs actual</h3>
              <div className="mt-4 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data}>
                    <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={11} interval={0} angle={-15} textAnchor="end" height={60} />
                    <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                    <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12 }} />
                    <Legend />
                    <Bar dataKey="planned" fill="var(--color-chart-1)" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="actual" fill="var(--color-chart-3)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>

            <div className="grid gap-4 lg:grid-cols-2">
              {list.map((g) => <CheckinCard key={g.id} goal={g} quarter={qq} />)}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function CheckinCard({ goal, quarter }: { goal: Goal; quarter: Quarter }) {
  const qd = goal.quarterly[quarter];
  const [actual, setActual] = React.useState<number>(Math.round(qd.actual));
  const [comments, setComments] = React.useState<string>("");
  const percent = Math.min(100, qd.planned === 0 ? 0 : (actual / qd.planned) * 100);

  let calc = "";
  if (goal.uom === "Numeric") calc = `Achieved ${actual} of ${Math.round(qd.planned)} planned`;
  if (goal.uom === "Percentage") calc = `${Math.round(percent)}% of quarterly plan met`;
  if (goal.uom === "Timeline") calc = `On schedule: ${percent >= 90 ? "yes" : "behind"}`;
  if (goal.uom === "Zero-based") calc = actual === 0 ? "Maintained zero — excellent" : `${actual} occurrence(s) — investigate`;

  return (
    <GlassCard className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-widest text-primary">{goal.thrustArea}</p>
          <h4 className="mt-0.5 font-medium">{goal.title}</h4>
          <p className="text-xs text-muted-foreground">{goal.uom} · Target {goal.target}{goal.unit ?? ""}</p>
        </div>
        <StatusBadge status={qd.status} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg bg-background/40 p-3">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Planned ({quarter})</p>
          <p className="mt-1 text-lg font-semibold tabular-nums">{Math.round(qd.planned)}</p>
        </div>
        <div className="rounded-lg bg-background/40 p-3">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Actual</p>
          <Input type="number" className="mt-1 h-9 rounded-lg" value={actual} onChange={(e) => setActual(Number(e.target.value))} />
        </div>
      </div>

      <div className="mt-3">
        <Progress value={percent} className="h-1.5" />
        <p className="mt-1.5 text-xs text-muted-foreground">{calc}</p>
      </div>

      <Textarea
        rows={2}
        placeholder="Add a note for your manager (challenges, blockers, wins)…"
        value={comments}
        onChange={(e) => setComments(e.target.value)}
        className="mt-3 rounded-xl"
      />
    </GlassCard>
  );
}
