import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/widgets/page-header";
import { GlassCard } from "@/components/widgets/glass-card";
import { departmentPerf, quarterlyTrend, employees } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/analytics")({ component: AnalyticsPage });

const dist = [
  { name: "On track", value: 132, color: "var(--color-chart-3)" },
  { name: "At risk", value: 38, color: "var(--color-chart-5)" },
  { name: "Completed", value: 64, color: "var(--color-chart-1)" },
  { name: "Pending", value: 28, color: "var(--color-chart-4)" },
];

const forecast = [
  { week: "W1", actual: 12, forecast: 12 },
  { week: "W2", actual: 24, forecast: 26 },
  { week: "W3", actual: 35, forecast: 40 },
  { week: "W4", actual: 47, forecast: 53 },
  { week: "W5", actual: 58, forecast: 65 },
  { week: "W6", actual: 64, forecast: 78 },
  { week: "W7", actual: null, forecast: 88 },
  { week: "W8", actual: null, forecast: 95 },
];

function AnalyticsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Analytics & reporting"
        title="Performance insights"
        description="Aggregate trends, distributions, and forecasts for the whole organization."
        actions={
          <>
            <Select defaultValue="all">
              <SelectTrigger className="h-9 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                <SelectItem value="eng">Engineering</SelectItem>
                <SelectItem value="design">Design</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="q2">
              <SelectTrigger className="h-9 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(["q1", "q2", "q3", "q4"] as const).map((q) => <SelectItem key={q} value={q}>{q.toUpperCase()}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" className="rounded-xl" onClick={() => toast.success("CSV export queued")}>
              <FileText className="mr-1 size-4" /> CSV
            </Button>
            <Button className="rounded-xl gradient-primary text-white" onClick={() => toast.success("Excel export queued")}>
              <FileSpreadsheet className="mr-1 size-4" /> Excel
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <GlassCard className="p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold">QoQ completion trend</h3>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={quarterlyTrend}>
                <defs>
                  <linearGradient id="aPlan" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.4} /><stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} /></linearGradient>
                  <linearGradient id="aAct" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-chart-3)" stopOpacity={0.5} /><stop offset="100%" stopColor="var(--color-chart-3)" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="quarter" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12 }} />
                <Area type="monotone" dataKey="planned" stroke="var(--color-chart-1)" fill="url(#aPlan)" strokeWidth={2} />
                <Area type="monotone" dataKey="actual" stroke="var(--color-chart-3)" fill="url(#aAct)" strokeWidth={2} />
                <Line type="monotone" dataKey="team" stroke="var(--color-chart-2)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold">Goal distribution</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={dist} dataKey="value" innerRadius={50} outerRadius={80} paddingAngle={3}>
                  {dist.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            {dist.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2"><span className="size-2 rounded-full" style={{ background: d.color }} />{d.name}</span>
                <span className="font-semibold">{d.value}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold">Department comparison</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departmentPerf}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="department" stroke="var(--color-muted-foreground)" fontSize={11} interval={0} angle={-15} textAnchor="end" height={60} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12 }} />
                <Bar dataKey="completion" fill="var(--color-chart-1)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold">Progress forecast</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={forecast}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="week" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12 }} />
                <Line type="monotone" dataKey="actual" stroke="var(--color-chart-3)" strokeWidth={3} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="forecast" stroke="var(--color-chart-1)" strokeDasharray="5 5" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      <GlassCard className="p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Team leaderboard</h3>
          <Button variant="ghost" size="sm" className="rounded-xl"><Download className="mr-1 size-4" /> Export</Button>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-widest text-muted-foreground">
              <tr className="border-b border-border/60">
                <th className="py-2 text-left">Rank</th>
                <th className="py-2 text-left">Employee</th>
                <th className="py-2 text-left">Department</th>
                <th className="py-2 text-right">Goals</th>
                <th className="py-2 text-right">Completion</th>
              </tr>
            </thead>
            <tbody>
              {[...employees].sort((a, b) => b.completion - a.completion).map((e, i) => (
                <tr key={e.id} className="border-b border-border/40 last:border-b-0">
                  <td className="py-3"><span className="inline-flex size-6 items-center justify-center rounded-full bg-muted text-xs font-semibold">{i + 1}</span></td>
                  <td className="py-3 font-medium">{e.name}</td>
                  <td className="py-3 text-muted-foreground">{e.department}</td>
                  <td className="py-3 text-right tabular-nums">{e.goalsCount}</td>
                  <td className="py-3 text-right font-semibold tabular-nums">{e.completion}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
