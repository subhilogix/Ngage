import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/widgets/page-header";
import { StatCard } from "@/components/widgets/stat-card";
import { GlassCard } from "@/components/widgets/glass-card";
import { StatusBadge } from "@/components/widgets/status-badge";
import {
  Users,
  CheckCircle2,
  Clock,
  TrendingUp,
  ArrowRight,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { goalsApi, analyticsApi, auditApi } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/manager/dashboard")({
  component: ManagerDashboardWrapper,
});

function ManagerDashboardWrapper() {
  const { user, ready } = useAuth();
  const nav = useNavigate();

  React.useEffect(() => {
    if (ready && (!user || (user.role !== "manager" && user.role !== "admin"))) {
      toast.error("Access Denied: Managerial privilege required.");
      nav({ to: "/dashboard" });
    }
  }, [ready, user, nav]);

  if (!ready || !user || (user.role !== "manager" && user.role !== "admin")) {
    return (
      <div className="grid h-72 place-items-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return <ManagerDashboard userId={user.id} userName={user.name} />;
}

function ManagerDashboard({ userId, userName }: { userId: string; userName: string }) {
  // Fetch real team goals
  const { data: teamGoals = [], isLoading: goalsLoading } = useQuery({
    queryKey: ["goals"],
    queryFn: goalsApi.getGoals,
  });

  // Fetch real analytics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["analytics", "manager"],
    queryFn: analyticsApi.getManagerAnalytics,
  });

  if (goalsLoading || statsLoading) {
    return (
      <div className="grid h-72 place-items-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  const hasGoals = teamGoals.length > 0;
  const pending = teamGoals.filter((g: any) => g.status === "pending").length;
  const completed = teamGoals.filter((g: any) => (g.progress || 0) === 100).length;
  const avg = hasGoals
    ? Math.round(
        teamGoals.reduce((a: number, g: any) => a + (g.progress || 0), 0) / teamGoals.length,
      )
    : 0;

  const directReportsCount = stats?.directReportsCount ?? 0;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Manager view · FY26 Q2"
        title={`Welcome back, ${userName}`}
        description="Track approvals, identify at-risk goals, and keep the quarter on course."
        actions={
          <Link to="/approvals">
            <Button className="rounded-xl gradient-primary text-white shadow-glow">
              Review approvals <ArrowRight className="ml-1 size-4" />
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Team size" value={directReportsCount} icon={Users} tone="info" />
        <StatCard label="Pending approvals" value={pending} icon={Clock} tone="warning" />
        <StatCard label="Avg completion" value={avg} suffix="%" icon={TrendingUp} tone="success" />
        <StatCard label="Goals completed" value={completed} icon={CheckCircle2} tone="default" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <GlassCard className="p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold">Team performance overview</h3>
          {directReportsCount > 0 ? (
            <div className="mt-6 space-y-4">
              <p className="text-sm text-muted-foreground">
                Your direct reports have registered a total of{" "}
                <span className="font-medium text-foreground">{teamGoals.length}</span> goals in
                this cycle.
              </p>
              <div className="rounded-xl bg-background/40 p-4 border border-border/60">
                <div className="flex justify-between items-center text-sm">
                  <span>Overall Team Progress Average</span>
                  <span className="font-semibold">{avg}%</span>
                </div>
                <div className="w-full bg-muted/60 h-2 rounded-full mt-2 overflow-hidden">
                  <div className="h-full gradient-primary" style={{ width: `${avg}%` }} />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-56 flex-col items-center justify-center text-center p-6 bg-background/20 rounded-xl border border-dashed border-border/60 mt-4">
              <Users className="size-8 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">Your team is empty</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                Newly registered users can set you as their manager during registration, or an admin
                can link their accounts.
              </p>
            </div>
          )}
        </GlassCard>

        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold">Approval queue</h3>
          <p className="text-xs text-muted-foreground">{pending} goals awaiting your review</p>
          <div className="mt-4 space-y-3">
            {pending > 0 ? (
              teamGoals
                .filter((g: any) => g.status === "pending")
                .map((g: any) => (
                  <div
                    key={g.id}
                    className="rounded-xl border border-border/60 bg-background/40 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{g.title}</p>
                        <p className="text-xs text-muted-foreground">Weight {g.weightage}%</p>
                      </div>
                      <StatusBadge status={g.status} />
                    </div>
                  </div>
                ))
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-10 bg-background/20 rounded-xl border border-dashed border-border/60">
                <CheckCircle2 className="size-6 text-success mb-2" />
                <p className="text-xs text-muted-foreground">
                  All caught up! No pending approvals.
                </p>
              </div>
            )}
            {pending > 0 && (
              <Link
                to="/approvals"
                className="block text-center text-xs font-medium text-primary hover:underline mt-2"
              >
                Open approval workspace →
              </Link>
            )}
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
                  <SafeDate date={a.timestamp} />
                </p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No manager actions recorded in the audit trail yet.
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
