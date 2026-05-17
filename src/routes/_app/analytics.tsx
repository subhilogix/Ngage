import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/widgets/page-header";
import { GlassCard } from "@/components/widgets/glass-card";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Download,
  ShieldCheck,
  Building,
  TrendingUp,
  AlertCircle,
  Award,
  PieChart as PieIcon,
} from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "@/lib/api";

export const Route = createFileRoute("/_app/analytics")({ component: AnalyticsPage });

function AnalyticsPage() {
  const { user } = useAuth();

  const isAdmin = user?.role === "admin";
  const isManager = user?.role === "manager";
  const isEmployee = user?.role === "employee";

  // Dynamic role-based queries
  const { data: adminStats, isLoading: adminLoading } = useQuery({
    queryKey: ["analytics", "admin"],
    queryFn: analyticsApi.getAdminAnalytics,
    enabled: isAdmin,
  });

  const { data: managerStats, isLoading: managerLoading } = useQuery({
    queryKey: ["analytics", "manager"],
    queryFn: analyticsApi.getManagerAnalytics,
    enabled: isManager,
  });

  const { data: employeeStats, isLoading: employeeLoading } = useQuery({
    queryKey: ["analytics", "employee"],
    queryFn: analyticsApi.getEmployeeAnalytics,
    enabled: isEmployee,
  });

  const isLoading = adminLoading || managerLoading || employeeLoading;

  if (isLoading) {
    return (
      <div className="grid h-72 place-items-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Aggregating enterprise statistics...</p>
        </div>
      </div>
    );
  }

  // Construct charts based on role
  let overallCompletion = 0;
  let labelText = "My completion rate";
  let dist: any[] = [];

  if (isAdmin && adminStats) {
    overallCompletion = adminStats.avgEnterpriseProgress || 0;
    labelText = "Enterprise overall progress";

    dist = [
      { name: "Approved", value: adminStats.goalsApproved || 0, color: "hsl(280, 80%, 65%)" },
      { name: "Draft", value: adminStats.goalsDraft || 0, color: "hsl(320, 80%, 65%)" },
      { name: "Pending review", value: adminStats.goalsPending || 0, color: "hsl(200, 80%, 65%)" },
    ];
  } else if (isManager && managerStats) {
    overallCompletion = managerStats.teamProgressAverage || 0;
    labelText = "Team average completion";

    dist = [
      {
        name: "Team direct reports",
        value: managerStats.directReportsCount || 0,
        color: "hsl(280, 80%, 65%)",
      },
      {
        name: "Pending approvals",
        value: managerStats.pendingApprovals || 0,
        color: "hsl(200, 80%, 65%)",
      },
    ];
  } else if (isEmployee && employeeStats) {
    overallCompletion = employeeStats.avgProgress || 0;
    labelText = "Personal overall progress";

    dist = [
      {
        name: "Approved plans",
        value: employeeStats.approvedGoals || 0,
        color: "hsl(280, 80%, 65%)",
      },
      {
        name: "Draft/Pending",
        value: employeeStats.pendingGoals || 0,
        color: "hsl(320, 80%, 65%)",
      },
    ];
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Analytics & reporting"
        title="Performance insights"
        description="Dynamic charts, cycle completion rates, and adoption distribution calculated directly from D1."
        actions={
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button
                variant="outline"
                className="rounded-xl border-white/10 text-muted-foreground hover:bg-white/5 hover:text-foreground"
                onClick={() => window.open("/api/exports/performance", "_blank")}
              >
                <Download className="mr-1 size-4" /> Performance Ledger CSV
              </Button>
            )}
            <Button
              className="rounded-xl gradient-primary text-white shadow-glow"
              onClick={() => window.open("/api/exports/analytics", "_blank")}
            >
              <Download className="mr-1 size-4" /> Export Report
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        {/* Card 1: Dynamic Radial Completion Ring */}
        <GlassCard className="p-6 text-center space-y-6 flex flex-col justify-between border-white/5 bg-background/30">
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
              {labelText}
            </h3>
            <div className="relative size-40 mx-auto mt-6">
              <svg className="size-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="var(--color-border)"
                  strokeWidth="6"
                  fill="none"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="url(#radialGrad)"
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray="251.2"
                  strokeDashoffset={251.2 - (251.2 * overallCompletion) / 100}
                />
                <defs>
                  <linearGradient id="radialGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="hsl(280, 80%, 65%)" />
                    <stop offset="100%" stopColor="hsl(320, 80%, 65%)" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 grid place-items-center">
                <div>
                  <span className="text-3xl font-extrabold tracking-tight tabular-nums">
                    {overallCompletion}%
                  </span>
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">
                    avg completion
                  </p>
                </div>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Calculated in real-time across active key-result updates for this cycle.
          </p>
        </GlassCard>

        {/* Card 2: Pie distribution */}
        <GlassCard className="p-6 md:col-span-2 border-white/5 bg-background/30">
          <div className="flex items-center gap-2">
            <PieIcon className="size-4 text-primary" />
            <h3 className="text-lg font-bold tracking-tight">Status distribution</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Breakdown of goal cycles recorded in SQLite ledger.
          </p>

          <div className="grid sm:grid-cols-2 gap-6 items-center mt-4">
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dist}
                    dataKey="value"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={4}
                  >
                    {dist.map((d: any, i: number) => (
                      <Cell key={i} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-3">
              {dist.map((d: any) => (
                <div
                  key={d.name}
                  className="flex items-center justify-between text-sm rounded-lg bg-background/20 p-2.5 border border-white/5"
                >
                  <span className="flex items-center gap-2 font-medium">
                    <span className="size-2 rounded-full" style={{ background: d.color }} />
                    {d.name}
                  </span>
                  <span className="font-bold tabular-nums text-foreground">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Admin Specific Governance Analytics Section */}
      {isAdmin && adminStats && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Departmental Progress Matrix */}
          <GlassCard className="p-6 border-white/5 bg-background/30 space-y-4">
            <div className="flex items-center gap-2">
              <Building className="size-4 text-primary" />
              <h3 className="text-lg font-bold tracking-tight">Departmental Performance</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Average goal completion percentage computed across departmental team boundaries.
            </p>

            <div className="space-y-3 mt-4">
              {adminStats.departmentPerformance && adminStats.departmentPerformance.length > 0 ? (
                adminStats.departmentPerformance.map((dept: any) => (
                  <div
                    key={dept.department}
                    className="space-y-1.5 p-3 rounded-xl border border-white/5 bg-background/10"
                  >
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span>{dept.department}</span>
                      <span className="text-primary">
                        {dept.avgProgress}% ({dept.goalsCount} goals)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full gradient-primary transition-all duration-500"
                        style={{ width: `${dept.avgProgress}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground text-center py-6">
                  No departmental goal data registered.
                </p>
              )}
            </div>
          </GlassCard>

          {/* OKR Adoption & Governance Health */}
          <div className="space-y-6">
            {/* KPI Adoption Panel */}
            <GlassCard className="p-6 border-white/5 bg-background/30 flex items-start gap-4">
              <div className="size-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 grid place-items-center shrink-0">
                <Award className="size-5" />
              </div>
              <div className="space-y-1 flex-1">
                <h4 className="text-base font-semibold">Shared KPI Adoption Health</h4>
                <p className="text-xs text-muted-foreground max-w-lg">
                  KPIs assigned dynamically from high-level shared targets.
                </p>
                <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-white/5">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                      Adoption Count
                    </span>
                    <span className="text-2xl font-bold tracking-tight text-purple-400">
                      {adminStats.sharedKPIProgress?.adoptionCount || 0} goals
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                      Average Progress
                    </span>
                    <span className="text-2xl font-bold tracking-tight text-purple-400">
                      {adminStats.sharedKPIProgress?.avgProgress || 0}%
                    </span>
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Escalations Oversight Panel */}
            <GlassCard className="p-6 border-white/5 bg-background/30 flex items-start gap-4">
              <div className="size-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 grid place-items-center shrink-0">
                <AlertCircle className="size-5" />
              </div>
              <div className="space-y-1 flex-1">
                <h4 className="text-base font-semibold">Governance Escalations Badges</h4>
                <p className="text-xs text-muted-foreground max-w-lg">
                  Missed check-in trends and incomplete/unsubmitted goals requiring administrator
                  intervention.
                </p>
                <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-white/5">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                      Escalation Count
                    </span>
                    <span className="text-2xl font-bold tracking-tight text-amber-400">
                      {adminStats.escalationCount || 0} alerts
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                      Missed Check-ins
                    </span>
                    <span className="text-2xl font-bold tracking-tight text-amber-400">
                      {adminStats.missedCheckinsCount || 0} goals
                    </span>
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      )}

      {/* Info Card: Corporate Governance assurance */}
      <GlassCard className="p-6 flex items-start gap-4 border-white/5 bg-background/30">
        <div className="size-10 rounded-xl gradient-primary text-white grid place-items-center shrink-0 shadow-glow">
          <ShieldCheck className="size-5" />
        </div>
        <div className="space-y-1">
          <h4 className="text-base font-semibold">Standard Compliance Assured</h4>
          <p className="text-xs text-muted-foreground leading-normal max-w-3xl">
            Ngage analytics comply with international OKR paradigms, verifying weight limits,
            duplicate check triggers, and hierarchical security logs. Changes to check-ins are
            logged with SHA hashed actors.
          </p>
        </div>
      </GlassCard>
    </div>
  );
}
