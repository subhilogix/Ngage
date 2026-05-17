import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/widgets/page-header";
import { StatCard } from "@/components/widgets/stat-card";
import { GlassCard } from "@/components/widgets/glass-card";
import { Users, Target, Clock, Building2, TrendingUp, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { analyticsApi, auditApi, adminApi } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/admin/dashboard")({
  component: AdminDashboardWrapper,
});

function AdminDashboardWrapper() {
  const { user, ready } = useAuth();
  const nav = useNavigate();

  React.useEffect(() => {
    if (ready && (!user || user.role !== "admin")) {
      toast.error("Access Denied: Administrative privilege required.");
      nav({ to: "/dashboard" });
    }
  }, [ready, user, nav]);

  if (!ready || !user || user.role !== "admin") {
    return (
      <div className="grid h-72 place-items-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return <AdminDashboard userName={user.name} />;
}

function AdminDashboard({ userName }: { userName: string }) {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["analytics", "admin"],
    queryFn: analyticsApi.getAdminAnalytics,
  });

  if (statsLoading) {
    return (
      <div className="grid h-72 place-items-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  const liveStats = stats || {};

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Organization · FY26"
        title="Org health overview"
        description="Monitor adoption, escalations, and cycle progress across the company."
        actions={
          <Link to="/audit">
            <Button variant="outline" className="rounded-xl">
              Audit trail
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="Employees"
          value={liveStats.totalEmployees ?? 0}
          icon={Users}
          tone="info"
        />
        <StatCard
          label="Goals set"
          value={liveStats.totalGoalsCount ?? 0}
          icon={Target}
          tone="default"
        />
        <StatCard
          label="Org completion"
          value={liveStats.avgEnterpriseProgress ?? 0}
          suffix="%"
          icon={TrendingUp}
          tone="success"
        />
        <StatCard
          label="Approvals pending"
          value={liveStats.goalsDraft ?? 0}
          icon={Clock}
          tone="warning"
        />
        <StatCard label="Cycles open" value={1} icon={Building2} tone="info" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <GlassCard className="p-6 border-white/5 bg-background/40">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <ShieldCheck className="size-5 text-primary" />
              System Administration & Governance
            </h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
              You are logged in as an administrator. From this workspace, you have global
              capabilities to set corporate goal deadlines, review department escalations, monitor
              progress key results, and inspect raw system security audit logs.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link to="/org">
                <Button variant="outline" className="rounded-xl">
                  Manage Departments
                </Button>
              </Link>
              <Link to="/cycles">
                <Button variant="outline" className="rounded-xl">
                  Configure Goal Cycles
                </Button>
              </Link>
            </div>
          </GlassCard>

          <ActivityCard />
        </div>

        <div className="space-y-6">
          <WindowsController />
        </div>
      </div>
    </div>
  );
}

function WindowsController() {
  const queryClient = useQueryClient();

  // Fetch overrides
  const { data: overrides = [], isLoading } = useQuery({
    queryKey: ["adminOverrides"],
    queryFn: adminApi.getQuarterOverrides,
  });

  const updateOverrideMutation = useMutation({
    mutationFn: adminApi.updateQuarterOverrides,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminOverrides"] });
      queryClient.invalidateQueries({ queryKey: ["checkinWindows"] });
      toast.success("Governance reporting window override updated!");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to update override.");
    },
  });

  const toggleOverride = (quarter: string, currentVal: boolean) => {
    updateOverrideMutation.mutate({
      quarter,
      isOpen: !currentVal,
    });
  };

  const overrideMap = new Map(overrides.map((o: any) => [o.quarter, o.isOpen]));

  const windows = [
    { id: "GOAL_SETTING", label: "Goal Setting Cycle", date: "May 1" },
    { id: "Q1", label: "Q1 Performance Check-in", date: "July" },
    { id: "Q2", label: "Q2 Performance Check-in", date: "October" },
    { id: "Q3", label: "Q3 Performance Check-in", date: "January" },
    { id: "Q4", label: "Q4 / Annual Review Cycle", date: "March & April" },
  ];

  return (
    <GlassCard className="p-6 border-white/5 bg-background/40">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-primary flex items-center gap-2">
        <Clock className="size-4 animate-pulse" />
        Reporting Windows Override
      </h3>
      <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
        Manually override calendar gates to force open closed cycles for all employees.
      </p>

      <div className="mt-4 space-y-3">
        {isLoading ? (
          <div className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
            <Loader2 className="size-4 animate-spin text-primary" /> Loading windows...
          </div>
        ) : (
          windows.map((win) => {
            const isForcedOpen = Boolean(overrideMap.get(win.id));
            return (
              <div
                key={win.id}
                className="flex items-center justify-between p-3 rounded-xl bg-background/30 border border-white/5"
              >
                <div>
                  <p className="text-xs font-semibold">{win.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Default Date: {win.date}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-mono font-bold ${
                      isForcedOpen
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-muted text-muted-foreground border border-white/5"
                    }`}
                  >
                    {isForcedOpen ? "Override Active" : "Locked"}
                  </span>

                  <button
                    type="button"
                    onClick={() => toggleOverride(win.id, isForcedOpen)}
                    disabled={updateOverrideMutation.isPending}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isForcedOpen ? "bg-primary" : "bg-muted"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block size-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        isForcedOpen ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </GlassCard>
  );
}

function ActivityCard() {
  const { data: auditLogs = [] } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: auditApi.getLogs,
  });

  return (
    <GlassCard className="p-6 border-white/5 bg-background/40">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Corporate Activity Feed</h3>
      </div>
      <div className="mt-4 space-y-3">
        {auditLogs.length > 0 ? (
          auditLogs.slice(0, 5).map((a: any) => (
            <div
              key={a.id}
              className="flex items-start gap-3 rounded-xl bg-background/40 p-3 border border-white/5"
            >
              <div className="mt-0.5 flex size-8 items-center justify-center rounded-full gradient-primary text-[10px] font-semibold text-white shadow-glow">
                AD
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <span className="font-medium text-primary">{a.userName || a.userId}</span> triggered{" "}
                  <span className="font-medium">{a.action}</span> on {a.entityType}{" "}
                  <span className="text-xs text-muted-foreground">({a.entityId})</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  <SafeDate date={a.timestamp} />
                </p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No system audit logs recorded yet.
          </p>
        )}
      </div>
    </GlassCard>
  );
}

function SafeDate({ date }: { date: any }) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  if (!mounted) return <span className="invisible">...</span>;
  return <span>{new Date(date).toLocaleString()}</span>;
}
