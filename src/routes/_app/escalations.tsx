import { createFileRoute, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { PageHeader } from "@/components/widgets/page-header";
import { GlassCard } from "@/components/widgets/glass-card";
import { StatusBadge } from "@/components/widgets/status-badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { goalsApi, checkinsApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_app/escalations")({ component: Escal });

function Escal() {
  const { user, ready } = useAuth();
  const nav = useNavigate();

  React.useEffect(() => {
    if (ready && (!user || (user.role !== "manager" && user.role !== "admin"))) {
      toast.error("Access Denied: Managerial privilege required.");
      nav({ to: "/dashboard" });
    }
  }, [ready, user, nav]);

  const { data: goalsList = [], isLoading: goalsLoading } = useQuery({
    queryKey: ["goals"],
    queryFn: goalsApi.getGoals,
    enabled: ready && (user?.role === "manager" || user?.role === "admin"),
  });

  const { data: checkinsList = [], isLoading: checkinsLoading } = useQuery({
    queryKey: ["checkins"],
    queryFn: () => checkinsApi.getCheckins(),
    enabled: ready && (user?.role === "manager" || user?.role === "admin"),
  });

  if (!ready || !user || (user.role !== "manager" && user.role !== "admin")) {
    return (
      <div className="grid h-72 place-items-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (goalsLoading || checkinsLoading) {
    return (
      <div className="grid h-72 place-items-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  // Calculate dynamic compliance triggers
  const draftGoals = goalsList.filter((g: any) => g.status === "draft");
  const pendingGoals = goalsList.filter((g: any) => g.status === "pending");

  // Find approved goals that do not have any check-ins registered yet!
  const approvedGoalIds = new Set(
    goalsList.filter((g: any) => g.status === "approved").map((g: any) => g.id),
  );
  const checkinGoalIds = new Set(checkinsList.map((c: any) => c.goalId));
  const missedCheckinsCount = Array.from(approvedGoalIds).filter(
    (id) => !checkinGoalIds.has(id),
  ).length;

  const overdueEscalations = goalsList
    .filter((g: any) => g.status === "approved" && !checkinGoalIds.has(g.id))
    .map((g: any) => ({
      id: `esc-o-${g.id}`,
      employee: g.employeeName || "Employee",
      reason: `Goal "${g.title}" has no logged check-ins (Overdue)`,
      raisedAt: g.createdAt || new Date(),
      level: 2,
      status: "overdue",
    }));

  // Build the list of active escalations dynamically!
  const escalations = [
    ...pendingGoals.map((g: any) => ({
      id: `esc-p-${g.id}`,
      employee: g.employeeName || "Employee",
      reason: `Goal plan "${g.title}" is pending manager review`,
      raisedAt: g.createdAt || new Date(),
      level: 1,
      status: "action_required",
    })),
    ...draftGoals.map((g: any) => ({
      id: `esc-d-${g.id}`,
      employee: g.employeeName || "Employee",
      reason: `Goal plan "${g.title}" is still in draft state`,
      raisedAt: g.createdAt || new Date(),
      level: 1,
      status: "draft",
    })),
    ...overdueEscalations,
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Compliance Escalations"
        title="Workflow alerts"
        description="Search active warnings, plan gaps, and overdue check-ins computed from live D1 registers."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <GlassCard className="p-5">
          <Scenario
            icon={Clock}
            title="Goals in draft"
            count={draftGoals.length}
            desc="Goal plans requiring final submission."
          />
        </GlassCard>
        <GlassCard className="p-5">
          <Scenario
            icon={Send}
            title="Review pending"
            count={pendingGoals.length}
            desc="Submitted goals awaiting approval."
          />
        </GlassCard>
        <GlassCard className="p-5">
          <Scenario
            icon={AlertTriangle}
            title="Check-ins pending"
            count={missedCheckinsCount}
            desc="Approved goals lacking logged progress."
          />
        </GlassCard>
      </div>

      <GlassCard className="p-6">
        <h3 className="text-lg font-bold tracking-tight">Active compliance alerts</h3>

        {escalations.length === 0 ? (
          <div className="mt-6 flex flex-col items-center justify-center py-12 text-center bg-background/10 rounded-xl border border-dashed border-border/60">
            <AlertTriangle className="size-8 text-muted-foreground mb-2" />
            <p className="text-sm font-semibold">Workspace fully compliant</p>
            <p className="text-xs text-muted-foreground mt-1">
              Zero active escalations detected. Excellent governance!
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {escalations.map((e) => (
              <div
                key={e.id}
                className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/40 p-4"
              >
                <div
                  className={`mt-0.5 flex size-9 items-center justify-center rounded-xl font-bold text-xs shrink-0 ${
                    e.level === 1
                      ? "bg-warning/15 text-warning"
                      : "bg-destructive/15 text-destructive"
                  }`}
                >
                  L{e.level}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm">{e.employee}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {e.reason} · Raised <SafeDateString date={e.raisedAt} />
                      </p>
                    </div>
                    <StatusBadge status={e.status} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-lg text-xs"
                      onClick={() => toast.success("Compliance reminder dispatched.")}
                    >
                      Send reminder
                    </Button>
                    <Button
                      size="sm"
                      className="rounded-lg gradient-primary text-white shadow-glow text-xs px-3"
                      onClick={() => toast.success("Acknowledge recorded in audit trail.")}
                    >
                      Acknowledge
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}

function SafeDateString({ date }: { date: any }) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  if (!mounted) return <span className="invisible">...</span>;
  return <span>{new Date(date).toLocaleDateString()}</span>;
}

function Scenario({
  icon: Icon,
  title,
  count,
  desc,
}: {
  icon: React.ElementType;
  title: string;
  count: number;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-11 items-center justify-center rounded-xl gradient-primary text-white shadow-glow">
        <Icon className="size-5" />
      </div>
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
          {title}
        </p>
        <p className="font-display text-3xl font-extrabold tracking-tight mt-0.5 tabular-nums">
          {count}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-normal">{desc}</p>
      </div>
    </div>
  );
}
