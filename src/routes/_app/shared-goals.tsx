import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/widgets/page-header";
import { GlassCard } from "@/components/widgets/glass-card";
import { StatusBadge } from "@/components/widgets/status-badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Share2, Users, Lock, Loader2, Database, ShieldCheck, ArrowRightLeft } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { goalsApi, sharedGoalsApi, teamApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/shared-goals")({ component: SharedGoals });

const THRUST_AREAS = [
  "Productivity",
  "Innovation",
  "Operational Excellence",
  "Security",
  "Other",
] as const;

function SharedGoals() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // States for creating shared goal
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [thrustArea, setThrustArea] = React.useState<(typeof THRUST_AREAS)[number]>("Innovation");
  const [uomType, setUomType] = React.useState("percentage");
  const [target, setTarget] = React.useState("");
  const [weightage, setWeightage] = React.useState("15");
  const [selectedEmployees, setSelectedEmployees] = React.useState<string[]>([]);

  const { data: goalsList = [], isLoading: goalsLoading } = useQuery({
    queryKey: ["goals"],
    queryFn: goalsApi.getGoals,
  });

  const { data: teamMembers = [], isLoading: membersLoading } = useQuery({
    queryKey: ["team-members"],
    queryFn: teamApi.getTeamMembers,
    enabled: Boolean(user && (user.role === "manager" || user.role === "admin")),
  });

  const createSharedMutation = useMutation({
    mutationFn: sharedGoalsApi.createSharedGoal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      setTitle("");
      setDescription("");
      setTarget("");
      setWeightage("15");
      setSelectedEmployees([]);
      toast.success("Shared Departmental KPI pushed successfully!");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to publish shared goal.");
    },
  });

  if (goalsLoading || membersLoading) {
    return (
      <div className="grid h-72 place-items-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  // Use teamMembers fetched from real API choices
  const employeeOptions = (teamMembers || []) as any[];

  // Showcase approved aligned corporate goals (locked shared goals)
  const shared = goalsList.filter((g: any) => g.sharedGoalId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !target.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (selectedEmployees.length === 0) {
      toast.error("Please select at least one employee assignee.");
      return;
    }

    createSharedMutation.mutate({
      title,
      description,
      thrustArea,
      uomType,
      target: Number(target),
      weightage: Number(weightage),
      employeeIds: selectedEmployees,
    });
  };

  const handleSelectAll = () => {
    setSelectedEmployees(employeeOptions.map((emp) => emp.id));
  };

  const handleClearSelection = () => {
    setSelectedEmployees([]);
  };

  const toggleEmployee = (empId: string) => {
    setSelectedEmployees((prev) =>
      prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId],
    );
  };

  const isEligibleToPush = user?.role === "manager" || user?.role === "admin";

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Org-wide alignment"
        title="Shared goals"
        description="KPIs pushed by HR/Leadership to multiple employees. Progress is synced across owners."
      />

      {/* MANAGER CREATION MODULE */}
      {isEligibleToPush && (
        <GlassCard className="p-6 border-primary/10 bg-primary/5">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="size-5 text-primary" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-primary">
              Push Shared Departmental KPI
            </h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-sm">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Goal Title *</label>
                <Input
                  placeholder="e.g. Standard Edge Compliance Security Audit"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="rounded-xl h-10 bg-background/50 border-white/10"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Thrust Area *</label>
                <select
                  value={thrustArea}
                  onChange={(e) => setThrustArea(e.target.value as any)}
                  className="w-full rounded-xl h-10 bg-background/50 border border-white/10 px-3 text-foreground"
                >
                  {THRUST_AREAS.map((ta) => (
                    <option key={ta} value={ta}>
                      {ta}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">
                KPI Priority Description *
              </label>
              <Textarea
                rows={3}
                placeholder="Detail the metrics, expectations, and corporate urgency..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="rounded-xl bg-background/50 border-white/10"
              />
            </div>

            <div className="grid gap-4 grid-cols-3">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Unit (UoM) *</label>
                <select
                  value={uomType}
                  onChange={(e) => setUomType(e.target.value)}
                  className="w-full rounded-xl h-10 bg-background/50 border border-white/10 px-3 text-foreground"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="numeric">Numeric Value</option>
                  <option value="currency">Currency ($)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">
                  Annual Target *
                </label>
                <Input
                  type="number"
                  placeholder="e.g. 100"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className="rounded-xl h-10 bg-background/50 border-white/10"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">
                  Default Weightage %
                </label>
                <Input
                  type="number"
                  placeholder="e.g. 15"
                  value={weightage}
                  onChange={(e) => setWeightage(e.target.value)}
                  className="rounded-xl h-10 bg-background/50 border-white/10"
                />
              </div>
            </div>

            {/* MULTI SELECT CHECKBOX LIST */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-muted-foreground">
                  Select Assignee Employees *
                </label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="link"
                    onClick={handleSelectAll}
                    className="h-auto p-0 text-xs text-primary font-semibold"
                  >
                    Select All
                  </Button>
                  <span className="text-[10px] text-muted-foreground">•</span>
                  <Button
                    type="button"
                    variant="link"
                    onClick={handleClearSelection}
                    className="h-auto p-0 text-xs text-muted-foreground font-semibold"
                  >
                    Clear Selection
                  </Button>
                </div>
              </div>

              {employeeOptions.length === 0 ? (
                <p className="text-xs italic text-muted-foreground">
                  No active reporting employees found in department database.
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 max-h-48 overflow-y-auto p-3 bg-background/40 rounded-xl border border-white/5">
                  {employeeOptions.map((emp) => {
                    const isChecked = selectedEmployees.includes(emp.id);
                    return (
                      <div
                        key={emp.id}
                        onClick={() => toggleEmployee(emp.id)}
                        className={`flex items-center gap-2.5 p-2 rounded-lg border transition-all cursor-pointer select-none ${
                          isChecked
                            ? "bg-primary/10 border-primary/30 text-foreground"
                            : "bg-transparent border-white/5 text-muted-foreground hover:bg-white/5"
                        }`}
                      >
                        <div
                          className={`size-4 rounded border flex items-center justify-center transition-all ${
                            isChecked
                              ? "bg-primary border-primary text-white"
                              : "border-white/20 bg-background"
                          }`}
                        >
                          {isChecked && <span className="text-[10px] font-bold">✓</span>}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium leading-tight truncate">{emp.name}</p>
                          <p className="text-[9px] text-muted-foreground truncate">{emp.title}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={createSharedMutation.isPending}
                className="gradient-primary text-white shadow-glow rounded-xl h-10 px-5"
              >
                {createSharedMutation.isPending && (
                  <Loader2 className="mr-1.5 size-4 animate-spin" />
                )}
                Deploy Departmental KPI
              </Button>
            </div>
          </form>
        </GlassCard>
      )}

      {/* SHARED GOALS DISPLAY GRID */}
      {shared.length === 0 ? (
        <GlassCard className="grid place-items-center p-12 text-center bg-background/20 border-white/5">
          <Database className="size-10 text-muted-foreground mb-3" />
          <h3 className="text-lg font-semibold">No active shared priority goals</h3>
          <p className="text-sm text-muted-foreground max-w-sm mt-1">
            Global compliance goals are pushed directly by HR administrators. Ask your administrator
            to publish org-wide OKRs.
          </p>
        </GlassCard>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {shared.map((g: any) => (
            <GlassCard
              key={g.id}
              className="p-6 flex flex-col justify-between border-white/5 bg-background/40"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Share2 className="size-4 text-primary" />
                    <p className="text-[10px] uppercase tracking-widest text-primary font-bold">
                      {g.thrustArea}
                    </p>
                  </div>
                  <span className="flex items-center gap-1 text-[9px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-bold tracking-wider uppercase animate-pulse">
                    <ArrowRightLeft className="size-2.5" /> Synced Live
                  </span>
                </div>
                <h3 className="mt-1.5 text-lg font-semibold leading-tight">{g.title}</h3>
                <p className="text-xs text-muted-foreground mt-1.5">
                  {g.description || "Corporate priority goal."}
                </p>
              </div>

              <div className="mt-6">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Annual Target Goal Completion</span>
                  <span className="font-semibold tabular-nums text-primary">
                    {g.progress || 0}%
                  </span>
                </div>
                <Progress value={g.progress || 0} className="mt-2 h-1.5" />
              </div>

              <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Users className="size-3.5 text-muted-foreground" />
                  <div className="flex -space-x-1.5">
                    <Avatar className="size-6 border-2 border-background">
                      <AvatarFallback className="gradient-primary text-[8px] font-bold text-white">
                        {g.employeeName ? g.employeeName.slice(0, 2).toUpperCase() : "EM"}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium">
                    Assignee: {g.employeeName || "System"}
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                  <Lock className="size-3" /> Lock Pushed
                </span>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
