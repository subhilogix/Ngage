import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/widgets/page-header";
import { StatCard } from "@/components/widgets/stat-card";
import { GlassCard } from "@/components/widgets/glass-card";
import { StatusBadge } from "@/components/widgets/status-badge";
import {
  Target, CheckCircle2, AlertTriangle, Clock, Users, BarChart3, ArrowRight,
  Calendar, TrendingUp, Sparkles, Building2, ShieldCheck,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { goals, getGoalsFor, quarterlyTrend, departmentPerf, activityFeed, employees, orgKpis, escalations } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_app/dashboard")({ component: Dashboard });

function Dashboard() {
  const { user } = useAuth();
  if (!user) return null;

  if (user.role === "employee") return <EmployeeDashboard userId={user.id} />;
  if (user.role === "manager") return <ManagerDashboard />;
  return <AdminDashboard />;
}

/* ---------- EMPLOYEE ---------- */
function EmployeeDashboard({ userId }: { userId: string }) {
  const myGoals = getGoalsFor("employee", userId);
  const completion = Math.round(myGoals.reduce((a, g) => a + g.progress * (g.weightage / 100), 0));
  const onTrack = myGoals.filter((g) => g.status === "on-track").length;
  const atRisk = myGoals.filter((g) => g.status === "at-risk").length;
  const completed = myGoals.filter((g) => g.status === "completed").length;

  const statusData = [
    { name: "On track", value: onTrack, color: "var(--color-success)" },
    { name: "Completed", value: completed, color: "var(--color-primary)" },
    { name: "At risk", value: atRisk, color: "var(--color-destructive)" },
    { name: "Pending", value: myGoals.filter((g) => g.status === "pending").length, color: "var(--color-warning)" },
  ].filter((d) => d.value > 0);

  const trend = quarterlyTrend.map((q) => ({ ...q, you: q.actual }));

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="FY26 · Q2 in progress"
        title="Good morning, Aarav"
        description="Here’s a snapshot of your goals, check-ins, and the quarter ahead."
        actions={
          <Link to="/goals"><Button className="rounded-xl gradient-primary text-white">Manage goals <ArrowRight className="ml-1 size-4" /></Button></Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Weighted completion" value={completion} suffix="%" icon={Target} delta={6} tone="default" />
        <StatCard label="On-track goals" value={onTrack} icon={CheckCircle2} tone="success" delta={2} />
        <StatCard label="At-risk goals" value={atRisk} icon={AlertTriangle} tone="destructive" delta={-1} />
        <StatCard label="Pending approvals" value={myGoals.filter((g) => g.status === "pending").length} icon={Clock} tone="warning" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <GlassCard className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Quarterly progress</p>
              <h3 className="mt-1 text-lg font-semibold">Planned vs Actual</h3>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <Legend2 color="var(--color-chart-1)" label="Planned" />
              <Legend2 color="var(--color-chart-3)" label="You" />
              <Legend2 color="var(--color-chart-2)" label="Team avg" />
            </div>
          </div>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="gPlanned" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gYou" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-3)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--color-chart-3)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="quarter" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="planned" stroke="var(--color-chart-1)" fill="url(#gPlanned)" strokeWidth={2} />
                <Area type="monotone" dataKey="you" stroke="var(--color-chart-3)" fill="url(#gYou)" strokeWidth={2} />
                <Line type="monotone" dataKey="team" stroke="var(--color-chart-2)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Goal status</p>
          <h3 className="mt-1 text-lg font-semibold">Distribution</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} dataKey="value" innerRadius={55} outerRadius={80} paddingAngle={4}>
                  {statusData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            {statusData.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2"><span className="size-2 rounded-full" style={{ background: d.color }} />{d.name}</span>
                <span className="font-medium">{d.value}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <GlassCard className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Your active goals</h3>
            <Link to="/goals" className="text-xs font-medium text-primary hover:underline">View all →</Link>
          </div>
          <div className="mt-4 space-y-3">
            {myGoals.slice(0, 4).map((g, i) => (
              <motion.div
                key={g.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-border/60 bg-background/40 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">{g.thrustArea}</p>
                    <p className="mt-0.5 truncate font-medium">{g.title}</p>
                  </div>
                  <StatusBadge status={g.status} />
                </div>
                <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>Weight {g.weightage}%</span>
                  <span>·</span>
                  <span>{g.timeline}</span>
                  <span className="ml-auto font-semibold text-foreground">{g.progress}%</span>
                </div>
                <Progress value={g.progress} className="mt-2 h-1.5" />
              </motion.div>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold">Upcoming deadlines</h3>
          <div className="mt-4 space-y-3">
            {[
              { d: "May 24", t: "Q2 check-in window opens", icon: Calendar },
              { d: "Jun 07", t: "Submit Q2 actuals", icon: Clock },
              { d: "Jun 15", t: "Manager review cut-off", icon: ShieldCheck },
              { d: "Jul 01", t: "Q3 cycle starts", icon: Sparkles },
            ].map((u) => (
              <div key={u.t} className="flex items-center gap-3 rounded-xl bg-background/40 p-3">
                <div className="flex size-9 items-center justify-center rounded-lg gradient-primary text-white">
                  <u.icon className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{u.t}</p>
                  <p className="text-xs text-muted-foreground">{u.d}, 2026</p>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      <ActivityCard />
    </div>
  );
}

/* ---------- MANAGER ---------- */
function ManagerDashboard() {
  const teamGoals = getGoalsFor("manager", "u-mgr-001");
  const pending = teamGoals.filter((g) => g.status === "pending").length;
  const completed = teamGoals.filter((g) => g.status === "completed").length;
  const avg = Math.round(teamGoals.reduce((a, g) => a + g.progress, 0) / teamGoals.length);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Manager view · FY26 Q2"
        title="Your team at a glance"
        description="Track approvals, identify at-risk goals, and keep the quarter on course."
        actions={
          <Link to="/approvals"><Button className="rounded-xl gradient-primary text-white">Review approvals <ArrowRight className="ml-1 size-4" /></Button></Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Team size" value={employees.length} icon={Users} tone="info" />
        <StatCard label="Pending approvals" value={pending} icon={Clock} tone="warning" delta={2} />
        <StatCard label="Avg completion" value={avg} suffix="%" icon={TrendingUp} tone="success" delta={4} />
        <StatCard label="Goals completed" value={completed} icon={CheckCircle2} tone="default" delta={1} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <GlassCard className="p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold">Team performance by department</h3>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departmentPerf}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="department" stroke="var(--color-muted-foreground)" fontSize={11} interval={0} angle={-15} textAnchor="end" height={60} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="onTrack" stackId="a" fill="var(--color-chart-3)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="atRisk" stackId="a" fill="var(--color-chart-5)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold">Approval queue</h3>
          <p className="text-xs text-muted-foreground">{pending} goals awaiting your review</p>
          <div className="mt-4 space-y-3">
            {teamGoals.filter((g) => g.status === "pending").map((g) => (
              <div key={g.id} className="rounded-xl border border-border/60 bg-background/40 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{g.title}</p>
                    <p className="text-xs text-muted-foreground">{g.ownerName} · {g.weightage}%</p>
                  </div>
                  <StatusBadge status={g.status} />
                </div>
              </div>
            ))}
            <Link to="/approvals" className="block text-center text-xs font-medium text-primary hover:underline">Open approval workspace →</Link>
          </div>
        </GlassCard>
      </div>

      <TeamHeatmap />
      <ActivityCard />
    </div>
  );
}

/* ---------- ADMIN ---------- */
function AdminDashboard() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Organization · FY26"
        title="Org health overview"
        description="Monitor adoption, escalations, and cycle progress across the company."
        actions={
          <>
            <Link to="/audit"><Button variant="outline" className="rounded-xl">Audit trail</Button></Link>
            <Link to="/cycles"><Button className="rounded-xl gradient-primary text-white">Manage cycles</Button></Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Employees" value={orgKpis.totalEmployees} icon={Users} tone="info" />
        <StatCard label="Goals set" value={orgKpis.goalsSet} icon={Target} tone="default" delta={9} />
        <StatCard label="Org completion" value={orgKpis.completion} suffix="%" icon={TrendingUp} tone="success" delta={3} />
        <StatCard label="Approvals pending" value={orgKpis.pendingApprovals} icon={Clock} tone="warning" />
        <StatCard label="Escalations" value={orgKpis.escalations} icon={AlertTriangle} tone="destructive" />
        <StatCard label="Cycles open" value={orgKpis.cyclesOpen} icon={Building2} tone="info" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <GlassCard className="p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold">Quarter-over-quarter completion</h3>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={quarterlyTrend}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="quarter" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="planned" stroke="var(--color-chart-1)" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="actual" stroke="var(--color-chart-3)" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="team" stroke="var(--color-chart-2)" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold">Active escalations</h3>
          <div className="mt-4 space-y-3">
            {escalations.map((e) => (
              <div key={e.id} className="rounded-xl border border-border/60 bg-background/40 p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium">{e.employee}</p>
                    <p className="text-xs text-muted-foreground">{e.reason}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${e.level === 1 ? "bg-warning/15 text-warning" : e.level === 2 ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary"}`}>L{e.level}</span>
                </div>
                <StatusBadge status={e.status} />
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      <TeamHeatmap />
      <ActivityCard />
    </div>
  );
}

function TeamHeatmap() {
  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Team completion heatmap</h3>
          <p className="text-xs text-muted-foreground">Weekly check-in completion · last 12 weeks</p>
        </div>
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
          Low <div className="flex gap-1">
            {[0.1, 0.25, 0.45, 0.7, 1].map((o) => (
              <span key={o} className="size-3 rounded" style={{ background: `oklch(0.6 0.22 280 / ${o})` }} />
            ))}
          </div> High
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {employees.map((e) => (
          <div key={e.id} className="flex items-center gap-3">
            <p className="w-40 truncate text-sm">{e.name}</p>
            <div className="grid flex-1 grid-cols-12 gap-1">
              {Array.from({ length: 12 }).map((_, i) => {
                const v = ((e.completion + i * 7) % 100) / 100;
                return <span key={i} className="h-5 rounded-md" style={{ background: `oklch(0.6 0.22 280 / ${0.15 + v * 0.85})` }} />;
              })}
            </div>
            <p className="w-12 text-right text-xs font-semibold tabular-nums">{e.completion}%</p>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

function ActivityCard() {
  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Activity feed</h3>
        <BarChart3 className="size-4 text-muted-foreground" />
      </div>
      <div className="mt-4 space-y-3">
        {activityFeed.map((a) => (
          <div key={a.id} className="flex items-start gap-3 rounded-xl bg-background/40 p-3">
            <div className="mt-0.5 flex size-8 items-center justify-center rounded-full gradient-primary text-[10px] font-semibold text-white">
              {a.who.split(" ").map((p) => p[0]).join("").slice(0, 2)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm"><span className="font-medium">{a.who}</span> {a.what} <span className="font-medium">{a.target}</span></p>
              <p className="text-xs text-muted-foreground">{a.when}</p>
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

function Legend2({ color, label }: { color: string; label: string }) {
  return <span className="inline-flex items-center gap-1.5 text-muted-foreground"><span className="size-2 rounded-full" style={{ background: color }} />{label}</span>;
}

const tooltipStyle = {
  background: "var(--color-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: 12,
  fontSize: 12,
  color: "var(--color-popover-foreground)",
};
