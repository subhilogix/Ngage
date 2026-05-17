import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/widgets/page-header";
import { StatCard } from "@/components/widgets/stat-card";
import { GlassCard } from "@/components/widgets/glass-card";
import { StatusBadge } from "@/components/widgets/status-badge";
import {
  Target,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  Calendar,
  Sparkles,
  ShieldCheck,
  Loader2,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { goalsApi, analyticsApi, auditApi } from "@/lib/api";

export const Route = createFileRoute("/_app/employee/dashboard")({
  component: EmployeeDashboardWrapper,
});

function EmployeeDashboardWrapper() {
  const { user } = useAuth();
  if (!user) return null;
  return <EmployeeDashboard userId={user.id} userName={user.name} />;
}

function EmployeeDashboard({ userId, userName }: { userId: string; userName: string }) {
  // Fetch real goals
  const { data: myGoals = [], isLoading: goalsLoading } = useQuery({
    queryKey: ["goals"],
    queryFn: goalsApi.getGoals,
  });

  // Fetch real analytics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["analytics", "employee"],
    queryFn: analyticsApi.getEmployeeAnalytics,
  });

  if (goalsLoading || statsLoading) {
    return (
      <div className="grid h-72 place-items-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalGoals = myGoals.length;
  const hasGoals = totalGoals > 0;

  // Clean calculations (Strictly no fake seed data fallbacks for newly registered users!)
  const completion = hasGoals
    ? Math.round(
        myGoals.reduce(
          (a: number, g: any) => a + (g.progress || 0) * ((g.weightage || 0) / 100),
          0,
        ),
      )
    : 0;

  const onTrack = hasGoals
    ? myGoals.filter((g: any) => g.status === "approved" && (g.progress || 0) >= 70).length
    : 0;
  const atRisk = hasGoals
    ? myGoals.filter((g: any) => g.status === "approved" && (g.progress || 0) < 40).length
    : 0;
  const completed = hasGoals ? myGoals.filter((g: any) => (g.progress || 0) === 100).length : 0;
  const pending = hasGoals ? myGoals.filter((g: any) => g.status === "pending").length : 0;

  const statusData = [
    { name: "On track", value: onTrack, color: "var(--color-success)" },
    { name: "Completed", value: completed, color: "var(--color-primary)" },
    { name: "At risk", value: atRisk, color: "var(--color-destructive)" },
    { name: "Pending", value: pending, color: "var(--color-warning)" },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="FY26 · Q2 in progress"
        title={`Good morning, ${userName}`}
        description="Here’s a snapshot of your goals, check-ins, and the quarter ahead."
        actions={
          <Link to="/goals">
            <Button className="rounded-xl gradient-primary text-white shadow-glow">
              Manage goals <ArrowRight className="ml-1 size-4" />
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Weighted completion"
          value={completion}
          suffix="%"
          icon={Target}
          tone="default"
        />
        <StatCard label="On-track goals" value={onTrack} icon={CheckCircle2} tone="success" />
        <StatCard label="At-risk goals" value={atRisk} icon={AlertTriangle} tone="destructive" />
        <StatCard label="Pending approvals" value={pending} icon={Clock} tone="warning" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <GlassCard className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Quarterly progress
              </p>
              <h3 className="mt-1 text-lg font-semibold">Planned vs Actual</h3>
            </div>
          </div>

          {hasGoals ? (
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={[
                    { name: "Q1 Start", planned: 0, actual: 0 },
                    { name: "Q1 End", planned: 25, actual: Math.min(completion, 25) },
                    { name: "Q2 Mid", planned: 50, actual: Math.min(completion, 50) },
                    { name: "Q2 End", planned: 100, actual: completion },
                  ]}
                >
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
                  <CartesianGrid
                    stroke="var(--color-border)"
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area
                    type="monotone"
                    dataKey="planned"
                    stroke="var(--color-chart-1)"
                    fill="url(#gPlanned)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="actual"
                    stroke="var(--color-chart-3)"
                    fill="url(#gYou)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-72 flex-col items-center justify-center text-center p-6 bg-background/20 rounded-xl border border-dashed border-border/60 mt-4">
              <TrendingUp className="size-8 text-muted-foreground animate-pulse mb-3" />
              <p className="text-sm font-medium">No progress records yet</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                Add and complete key goals to visualize your quarterly trajectory on this graph.
              </p>
            </div>
          )}
        </GlassCard>

        <GlassCard className="p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Goal status</p>
          <h3 className="mt-1 text-lg font-semibold">Distribution</h3>

          {hasGoals ? (
            <>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      dataKey="value"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={4}
                    >
                      {statusData.map((d, i) => (
                        <Cell key={i} fill={d.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {statusData.map((d) => (
                  <div key={d.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="size-2 rounded-full" style={{ background: d.color }} />
                      {d.name}
                    </span>
                    <span className="font-medium">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex h-64 flex-col items-center justify-center text-center p-4 mt-4">
              <p className="text-xs text-muted-foreground">No active goals found.</p>
            </div>
          )}
        </GlassCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <GlassCard className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Your active goals</h3>
            <Link to="/goals" className="text-xs font-medium text-primary hover:underline">
              View all →
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {hasGoals ? (
              myGoals.slice(0, 4).map((g: any, i: number) => (
                <motion.div
                  key={g.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-xl border border-border/60 bg-background/40 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-widest text-muted-foreground">
                        {g.thrustArea}
                      </p>
                      <p className="mt-0.5 truncate font-medium">{g.title}</p>
                    </div>
                    <StatusBadge status={g.status} />
                  </div>
                  <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                    <span>Weight {g.weightage}%</span>
                    <span>·</span>
                    <span>{g.deadline ? new Date(g.deadline).toLocaleDateString() : "FY26"}</span>
                    <span className="ml-auto font-semibold text-foreground">
                      {g.progress || 0}%
                    </span>
                  </div>
                  <Progress value={g.progress || 0} className="mt-2 h-1.5" />
                </motion.div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-10 bg-background/20 rounded-xl border border-dashed border-border/60">
                <Target className="size-8 text-muted-foreground mb-2" />
                <p className="text-sm font-medium">No goals registered yet</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  Create your first goal to set targets and track weights.
                </p>
                <Link to="/goals" className="mt-4">
                  <Button size="sm" variant="outline" className="rounded-xl">
                    Create a Goal
                  </Button>
                </Link>
              </div>
            )}
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
                <div className="flex size-9 items-center justify-center rounded-lg gradient-primary text-white shadow-glow">
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

      <ActivityCard userId={userId} />
    </div>
  );
}

function ActivityCard({ userId }: { userId: string }) {
  const { data: auditLogs = [] } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: auditApi.getLogs,
  });

  const myLogs = auditLogs.filter((log: any) => log.userId === userId);

  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Activity feed</h3>
      </div>
      <div className="mt-4 space-y-3">
        {myLogs.length > 0 ? (
          myLogs.slice(0, 5).map((a: any) => (
            <div key={a.id} className="flex items-start gap-3 rounded-xl bg-background/40 p-3">
              <div className="mt-0.5 flex size-8 items-center justify-center rounded-full gradient-primary text-[10px] font-semibold text-white shadow-glow">
                ME
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  Action: <span className="font-medium text-primary">{a.action}</span> on{" "}
                  {a.entityType}{" "}
                  <span className="text-xs text-muted-foreground">({a.entityId})</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(a.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No system actions recorded in the audit trail yet.
          </p>
        )}
      </div>
    </GlassCard>
  );
}

const tooltipStyle = {
  background: "var(--color-popover)",
  border: "1px solid var(--color-border)",
  borderRadius: 12,
  fontSize: 12,
  color: "var(--color-popover-foreground)",
};
