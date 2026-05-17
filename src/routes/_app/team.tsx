import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/widgets/page-header";
import { GlassCard } from "@/components/widgets/glass-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Search, Loader2, Users, Target } from "lucide-react";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { goalsApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/team")({ component: TeamPage });

function TeamPage() {
  const { user, ready } = useAuth();
  const nav = useNavigate();

  React.useEffect(() => {
    if (ready && (!user || (user.role !== "manager" && user.role !== "admin"))) {
      toast.error("Access Denied: Managerial privilege required.");
      nav({ to: "/dashboard" });
    }
  }, [ready, user, nav]);

  const [q, setQ] = React.useState("");

  const { data: goalsList = [], isLoading } = useQuery({
    queryKey: ["goals"],
    queryFn: goalsApi.getGoals,
    enabled: ready && (user?.role === "manager" || user?.role === "admin"),
  });

  if (!ready || !user || (user.role !== "manager" && user.role !== "admin")) {
    return (
      <div className="grid h-72 place-items-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  // Deduplicate and group goals by employee ID to form team list dynamically
  const employeesMap = new Map<string, any>();

  goalsList.forEach((g: any) => {
    // If we are a manager, we see our direct reports
    // Goals API already handles scoping goals to manager's reports + manager
    // Let's filter out manager's own goals from report list for clean reporting views
    if (g.employeeId === user?.id) return;

    const existing = employeesMap.get(g.employeeId);
    const weight = Number(g.weightage || 0);
    const progressVal = Number(g.progress || 0);
    const isApproved = g.status === "approved";
    const isPending = g.status === "pending";

    if (existing) {
      existing.goalsCount += 1;
      if (isPending) existing.pending += 1;
      existing.totalWeightedProgress += (progressVal * weight) / 100;
      existing.totalWeight += weight;
    } else {
      employeesMap.set(g.employeeId, {
        id: g.employeeId,
        name: g.employeeName || "Unknown Employee",
        email: g.employeeEmail || "",
        department: g.employeeDepartment || "Product Engineering",
        title: g.employeeTitle || "Associate",
        goalsCount: 1,
        pending: isPending ? 1 : 0,
        totalWeightedProgress: (progressVal * weight) / 100,
        totalWeight: weight,
      });
    }
  });

  const teamList = Array.from(employeesMap.values()).map((e) => ({
    ...e,
    completion: e.totalWeight > 0 ? Math.round((e.totalWeightedProgress / e.totalWeight) * 100) : 0,
  }));

  const filtered = teamList.filter((e: any) => e.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Team management"
        title="My team"
        description="Monitor alignment, active plan completions, and pending reviews for direct reports."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <GlassCard className="p-6 lg:col-span-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">Active direct reports</h3>
              <p className="text-xs text-muted-foreground">
                List of employees linked to your manager ID.
              </p>
            </div>
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search team..."
                className="h-9 w-full rounded-xl pl-8 bg-background/20"
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center bg-background/10 rounded-xl border border-dashed border-border/60 mt-6">
              <Users className="size-8 text-muted-foreground mb-2" />
              <p className="text-sm font-semibold">No direct reports found</p>
              <p className="text-xs text-muted-foreground max-w-sm mt-1">
                New employees can sign up and designate you as their manager. Once they register
                goals, they will appear here dynamically.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((e: any) => (
                <div
                  key={e.id}
                  className="rounded-2xl border border-border/60 bg-background/40 p-4 hover:border-primary/40 transition duration-200"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="size-10">
                      <AvatarFallback className="gradient-primary text-xs font-bold text-white">
                        {e.name
                          .split(" ")
                          .map((p: string) => p[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-sm">{e.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{e.department}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {e.goalsCount} goals registered · {e.pending} pending
                    </span>
                    <span className="font-semibold tabular-nums text-primary">{e.completion}%</span>
                  </div>
                  <Progress value={e.completion} className="mt-2 h-1.5" />
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold">Reporting Hierarchy</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Manager Profile: <span className="font-medium text-foreground">{user?.name}</span> ·{" "}
          {user?.title || "Lead"}
        </p>
        <div className="mt-4 p-4 rounded-xl border border-border/60 bg-background/40 flex items-center gap-3">
          <Avatar className="size-8">
            <AvatarFallback className="gradient-primary text-xs font-bold text-white">
              {user?.name
                ? user.name
                    .split(" ")
                    .map((p) => p[0])
                    .join("")
                : "M"}
            </AvatarFallback>
          </Avatar>
          <div className="text-xs">
            <p className="font-semibold text-foreground">{user?.name}</p>
            <p className="text-muted-foreground">{user?.department}</p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
