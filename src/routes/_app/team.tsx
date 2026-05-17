import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/widgets/page-header";
import { GlassCard } from "@/components/widgets/glass-card";
import { employees, departmentPerf } from "@/lib/mock-data";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import * as React from "react";
import { Radar, RadarChart, PolarAngleAxis, PolarGrid, ResponsiveContainer, Tooltip } from "recharts";

export const Route = createFileRoute("/_app/team")({ component: TeamPage });

function TeamPage() {
  const [q, setQ] = React.useState("");
  const filtered = employees.filter((e) => e.name.toLowerCase().includes(q.toLowerCase()));

  const radarData = departmentPerf.map((d) => ({ subject: d.department.split(" ")[0], value: d.completion }));

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Team management" title="My team" description="Performance, alignment, and progress for every report." />

      <div className="grid gap-4 lg:grid-cols-3">
        <GlassCard className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Team members</h3>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="h-9 w-56 rounded-xl pl-8" />
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {filtered.map((e) => (
              <div key={e.id} className="rounded-2xl border border-border/60 bg-background/40 p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="size-10"><AvatarFallback className="gradient-primary text-xs text-white">{e.name.split(" ").map((p) => p[0]).join("")}</AvatarFallback></Avatar>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{e.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{e.title}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{e.goalsCount} goals · {e.pending} pending</span>
                  <span className="font-semibold tabular-nums">{e.completion}%</span>
                </div>
                <Progress value={e.completion} className="mt-1.5 h-1.5" />
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold">Goal alignment</h3>
          <p className="text-xs text-muted-foreground">Coverage across thrust areas</p>
          <div className="mt-2 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="80%">
                <PolarGrid stroke="var(--color-border)" />
                <PolarAngleAxis dataKey="subject" stroke="var(--color-muted-foreground)" fontSize={11} />
                <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12 }} />
                <Radar dataKey="value" stroke="var(--color-chart-1)" fill="var(--color-chart-1)" fillOpacity={0.35} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold">Reporting hierarchy</h3>
        <p className="text-xs text-muted-foreground">Meera Iyer · Engineering Manager</p>
        <div className="mt-6 flex flex-wrap gap-3">
          {employees.map((e) => (
            <div key={e.id} className="flex items-center gap-2 rounded-2xl border border-border/60 bg-background/40 px-3 py-2">
              <Avatar className="size-7"><AvatarFallback className="gradient-primary text-[10px] text-white">{e.name.split(" ").map((p) => p[0]).join("")}</AvatarFallback></Avatar>
              <div className="text-xs">
                <p className="font-medium">{e.name}</p>
                <p className="text-muted-foreground">{e.department}</p>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
