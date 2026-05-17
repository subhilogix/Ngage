import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/widgets/page-header";
import { GlassCard } from "@/components/widgets/glass-card";
import { StatusBadge } from "@/components/widgets/status-badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Calendar,
  Plus,
  Target,
  CheckCircle2,
  Lock,
  Unlock,
  MessageSquare,
  Clock,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { goalsApi, checkinsApi, checkinWindowsApi, commentsApi } from "@/lib/api";

export const Route = createFileRoute("/_app/checkins")({ component: CheckinsPage });

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"] as const;
type Quarter = (typeof QUARTERS)[number];

const QUARTER_LABELS: Record<Quarter, string> = {
  Q1: "Q1 Check-in Window (July)",
  Q2: "Q2 Check-in Window (October)",
  Q3: "Q3 Check-in Window (January)",
  Q4: "Q4 / Annual Review Window (March & April)",
};

function CheckinsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeQuarter, setActiveQuarter] = React.useState<Quarter>("Q2");

  // Fetch real goals
  const { data: goalsList = [], isLoading: goalsLoading } = useQuery({
    queryKey: ["goals"],
    queryFn: goalsApi.getGoals,
  });

  // Fetch real checkins
  const { data: checkinsList = [], isLoading: checkinsLoading } = useQuery({
    queryKey: ["checkins"],
    queryFn: () => checkinsApi.getCheckins(),
  });

  // Fetch real windows status
  const {
    data: windowStatus = { GOAL_SETTING: false, Q1: false, Q2: false, Q3: false, Q4: false },
  } = useQuery({
    queryKey: ["checkinWindows"],
    queryFn: checkinWindowsApi.getWindowsStatus,
  });

  // Filter only approved goals since check-ins are restricted to approved plans
  const approvedGoals = goalsList.filter((g: any) => g.status === "approved");

  if (goalsLoading || checkinsLoading) {
    return (
      <div className="grid h-72 place-items-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading check-in workspace...</p>
        </div>
      </div>
    );
  }

  // Group latest check-in for each goal & quarter
  const latestCheckinsMap = new Map<string, any>();
  checkinsList.forEach((c: any) => {
    const key = `${c.goalId}-${c.quarter}`;
    const existing = latestCheckinsMap.get(key);
    if (!existing || new Date(c.updatedAt) > new Date(existing.updatedAt)) {
      latestCheckinsMap.set(key, c);
    }
  });

  const isCurrentQuarterOpen = user?.role === "admin" || Boolean(windowStatus[activeQuarter]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Quarterly check-in"
        title="Performance Tracker"
        description="Verify milestones, achievements, and log actual metrics for approved goal cycles."
        actions={
          <Button
            variant="outline"
            onClick={() => window.open("/api/exports/achievements", "_blank")}
            className="rounded-xl border-white/10"
          >
            Export Achievements
          </Button>
        }
      />

      {/* DYNAMIC WINDOW ENFORCEMENT BANNER */}
      <div className="animate-in fade-in slide-in-from-top-4 duration-300">
        {isCurrentQuarterOpen ? (
          <GlassCard className="border-emerald-500/20 bg-emerald-500/5 p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20 text-emerald-400">
                <Unlock className="size-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-emerald-400">
                  {QUARTER_LABELS[activeQuarter]} Active
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  The governance lock is open. You may log and update achievement targets.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              <Clock className="size-3.5" /> Submissions Enabled
            </div>
          </GlassCard>
        ) : (
          <GlassCard className="border-amber-500/20 bg-amber-500/5 p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-amber-500/10 p-2 rounded-xl border border-amber-500/20 text-amber-400">
                <Lock className="size-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-amber-400">
                  {QUARTER_LABELS[activeQuarter]} Closed
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  The standard reporting window is closed. Achievements are locked as read-only.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-amber-400 font-semibold bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
              <ShieldAlert className="size-3.5" /> Governance Locked
            </div>
          </GlassCard>
        )}
      </div>

      <Tabs value={activeQuarter} onValueChange={(v) => setActiveQuarter(v as Quarter)}>
        <TabsList className="rounded-xl bg-muted/60 p-1">
          {QUARTERS.map((q) => (
            <TabsTrigger key={q} value={q} className="rounded-lg px-5">
              {q}
            </TabsTrigger>
          ))}
        </TabsList>

        {QUARTERS.map((q) => (
          <TabsContent key={q} value={q} className="space-y-6 pt-6">
            {approvedGoals.length === 0 ? (
              <GlassCard className="grid place-items-center p-12 text-center bg-background/20">
                <Target className="size-10 text-muted-foreground mb-3" />
                <h3 className="text-lg font-semibold">No approved goals for {q}</h3>
                <p className="text-sm text-muted-foreground max-w-sm mt-1">
                  Check-ins can only be logged for approved goals. Ask your manager to approve your
                  goal plan.
                </p>
              </GlassCard>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {approvedGoals.map((g: any) => {
                  const checkin = latestCheckinsMap.get(`${g.id}-${q}`);
                  return (
                    <CheckinCard
                      key={g.id}
                      goal={g}
                      quarter={q}
                      existingCheckin={checkin}
                      isWindowOpen={user?.role === "admin" || Boolean(windowStatus[q])}
                    />
                  );
                })}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function computeProgress(actualVal: string, uomType: string, targetVal: number): number {
  const act = Number(actualVal);
  if (isNaN(act) || actualVal.trim() === "") return 0;

  const type = (uomType || "").toLowerCase();

  // Min (Numeric / %) - Higher is better -> Achievement / Target
  if (type.includes("min") || type === "percentage" || type === "numeric") {
    if (targetVal === 0) return 0;
    return Math.min(100, Math.max(0, Math.round((act / targetVal) * 100)));
  }

  // Max (Numeric / %) - Lower is better -> Target / Achievement
  if (type.includes("max")) {
    if (act === 0) return 0;
    return Math.min(100, Math.max(0, Math.round((targetVal / act) * 100)));
  }

  // Zero-based (Zero = Success) -> If 0 -> 100%, else 0%
  if (type.includes("zero")) {
    return act === 0 ? 100 : 0;
  }

  // Timeline
  if (type.includes("timeline")) {
    if (targetVal === 0) return 0;
    return Math.min(100, Math.max(0, Math.round((act / targetVal) * 100)));
  }

  return 0;
}

function CheckinCard({
  goal,
  quarter,
  existingCheckin,
  isWindowOpen,
}: {
  goal: any;
  quarter: Quarter;
  existingCheckin: any | null;
  isWindowOpen: boolean;
}) {
  const queryClient = useQueryClient();
  const [actual, setActual] = React.useState<string>(
    existingCheckin ? String(existingCheckin.actualAchievement) : "",
  );
  const [progress, setProgress] = React.useState<number>(
    existingCheckin ? Number(existingCheckin.progress) : 0,
  );
  const [status, setStatus] = React.useState<"Not Started" | "On Track" | "Completed">(
    () => (existingCheckin?.status as any) || "Not Started",
  );
  const [comments, setComments] = React.useState<string>(
    existingCheckin ? existingCheckin.employeeComment || "" : "",
  );

  React.useEffect(() => {
    if (existingCheckin) {
      setActual(String(existingCheckin.actualAchievement));
      setProgress(existingCheckin.progress);
      setStatus((existingCheckin.status as any) || "Not Started");
      setComments(existingCheckin.employeeComment || "");
    } else {
      setActual("");
      setProgress(0);
      setStatus("Not Started");
      setComments("");
    }
  }, [existingCheckin]);

  const createCheckinMutation = useMutation({
    mutationFn: checkinsApi.createCheckin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checkins"] });
      toast.success("Check-in submitted successfully!");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to submit check-in");
    },
  });

  const handleActualChange = (val: string) => {
    setActual(val);
    const computed = computeProgress(val, goal.uomType, goal.target);
    setProgress(computed);

    // Auto status suggestion
    if (computed === 100) {
      setStatus("Completed");
    } else if (computed > 0) {
      setStatus("On Track");
    } else {
      setStatus("Not Started");
    }
  };

  const submit = () => {
    if (!isWindowOpen) {
      toast.error("This reporting window is currently closed by the system administrator.");
      return;
    }

    const actNum = Number(actual);
    if (isNaN(actNum) || actual.trim() === "") {
      toast.error("Please enter a valid actual achievement value.");
      return;
    }
    if (progress < 0 || progress > 100) {
      toast.error("Progress percentage must be between 0 and 100.");
      return;
    }

    createCheckinMutation.mutate({
      goalId: goal.id,
      quarter,
      actualAchievement: actNum,
      progress,
      status,
      employeeComment: comments,
    });
  };

  return (
    <GlassCard className="p-5 flex flex-col justify-between border-white/5 bg-background/40">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-widest text-primary font-mono">
                {goal.thrustArea}
              </span>
              {goal.locked && (
                <span className="text-[9px] bg-indigo-500/10 text-indigo-400 px-1.5 py-0.2 rounded border border-indigo-500/20 font-medium">
                  Shared KPI
                </span>
              )}
            </div>
            <h4 className="mt-0.5 font-medium leading-tight">{goal.title}</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Unit: {goal.uomType} · Annual Target: {goal.target}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <StatusBadge status={existingCheckin?.status || "Not Started"} />
            {!isWindowOpen && (
              <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 font-medium">
                <Lock className="size-2.5" /> Closed
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-background/40 p-3 flex flex-col justify-between border border-white/5">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Progress met *
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Percentage completion</p>
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <Input
                type="number"
                min={0}
                max={100}
                disabled={!isWindowOpen}
                className="h-9 rounded-lg"
                value={progress}
                onChange={(e) => setProgress(Math.min(100, Math.max(0, Number(e.target.value))))}
              />
              <span className="font-semibold">%</span>
            </div>
          </div>

          <div className="rounded-lg bg-background/40 p-3 flex flex-col justify-between border border-white/5">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Actual Value *
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Numeric achievement</p>
            </div>
            <Input
              type="number"
              disabled={!isWindowOpen}
              className="mt-2 h-9 rounded-lg"
              value={actual}
              onChange={(e) => handleActualChange(e.target.value)}
              placeholder="e.g. 80"
            />
          </div>
        </div>

        <div className="mt-4 space-y-1.5">
          <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
            Status Selection *
          </label>
          <Select value={status} onValueChange={(v: any) => setStatus(v)} disabled={!isWindowOpen}>
            <SelectTrigger className="h-9 rounded-lg bg-background/20 border-white/10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["Not Started", "On Track", "Completed"].map((st) => (
                <SelectItem key={st} value={st}>
                  {st}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mt-4">
          <Progress value={progress} className="h-1.5" />
          <p className="mt-1.5 text-xs text-muted-foreground">
            Progress logged: {progress}% of annual milestone met for {quarter} (Calculated via{" "}
            {goal.uomType})
          </p>
        </div>

        <Textarea
          rows={2}
          disabled={!isWindowOpen}
          placeholder={
            isWindowOpen
              ? "Add comments, challenges, or key highlights for your manager..."
              : "Comments locked for this cycle."
          }
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          className="mt-4 rounded-xl text-xs bg-background/50 border-white/10"
        />
      </div>

      {isWindowOpen && (
        <div className="mt-4 flex justify-end">
          <Button
            onClick={submit}
            disabled={createCheckinMutation.isPending}
            className="rounded-xl gradient-primary text-white shadow-glow text-xs px-4"
          >
            {createCheckinMutation.isPending && (
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
            )}
            {existingCheckin ? "Update check-in" : "Log check-in"}
          </Button>
        </div>
      )}

      {/* DISCUSSION LOG DETAILS */}
      <CheckinCommentsSection goalId={goal.id} />
    </GlassCard>
  );
}

function CheckinCommentsSection({ goalId }: { goalId: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = React.useState("");

  // Query comments
  const { data: commentsList = [], isLoading } = useQuery({
    queryKey: ["comments", goalId],
    queryFn: () => commentsApi.getComments("goal", goalId),
  });

  const addCommentMutation = useMutation({
    mutationFn: commentsApi.createComment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", goalId] });
      setCommentText("");
      toast.success("Comment posted successfully!");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to add comment.");
    },
  });

  const submitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    addCommentMutation.mutate({
      entityType: "goal",
      entityId: goalId,
      message: commentText.trim(),
    });
  };

  return (
    <div className="mt-6 border-t border-white/5 pt-4">
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare className="size-3.5 text-primary animate-pulse" />
        <h5 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Goal Discussion Feed
        </h5>
        <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.2 rounded-full font-semibold">
          {commentsList.length}
        </span>
      </div>

      <div className="max-h-40 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin">
        {isLoading ? (
          <div className="flex items-center gap-1.5 py-2 text-[10px] text-muted-foreground">
            <Loader2 className="size-3 animate-spin text-primary" /> Loading thread...
          </div>
        ) : commentsList.length === 0 ? (
          <p className="text-[10px] text-muted-foreground italic py-1">
            No discussion items yet. Post a note below to align with your manager!
          </p>
        ) : (
          commentsList.map((comm: any) => {
            const isSelf = comm.userId === user?.id;
            return (
              <div
                key={comm.id}
                className={`flex flex-col gap-0.5 rounded-xl p-2.5 text-xs ${
                  isSelf
                    ? "bg-primary/5 border border-primary/10 ml-6"
                    : "bg-background/30 border border-white/5 mr-6"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-foreground/90">{comm.userName}</span>
                    <span className="text-[8px] uppercase tracking-wider bg-muted text-muted-foreground px-1 py-0.2 rounded font-mono">
                      {comm.userRole}
                    </span>
                  </div>
                  <span className="text-[8px] text-muted-foreground font-mono">
                    {new Date(comm.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-muted-foreground mt-1 text-[10px] leading-relaxed break-words">
                  {comm.message}
                </p>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={submitComment} className="mt-3 flex gap-1.5">
        <Input
          placeholder="Type alignment update or note..."
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          className="h-8 text-[11px] rounded-lg bg-background/50 border-white/10"
        />
        <Button
          type="submit"
          disabled={addCommentMutation.isPending || !commentText.trim()}
          className="h-8 text-[11px] px-3 rounded-lg gradient-primary text-white font-medium"
        >
          Post
        </Button>
      </form>
    </div>
  );
}
