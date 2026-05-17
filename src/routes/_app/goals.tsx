import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/widgets/page-header";
import { GlassCard } from "@/components/widgets/glass-card";
import { StatusBadge } from "@/components/widgets/status-badge";
import { THRUST_AREAS } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { goalsApi, approvalsApi } from "@/lib/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Trash2,
  Pencil,
  AlertCircle,
  CheckCircle2,
  Target,
  Sparkles,
  Loader2,
  Unlock,
  Lock,
  CheckCheck,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export const Route = createFileRoute("/_app/goals")({ component: GoalsPage });

const MAX_GOALS = 8;
const MIN_WEIGHT = 10;

const formatDeadline = (dateVal: any) => {
  if (!dateVal) return "FY26";
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "FY26";
    return d.toLocaleDateString();
  } catch (e) {
    return "FY26";
  }
};

const getSafeDateString = (dateVal: any) => {
  if (!dateVal) return "";
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().split("T")[0];
  } catch (e) {
    return "";
  }
};

function GoalsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editing, setEditing] = React.useState<any | null>(null);
  const [open, setOpen] = React.useState(false);

  // Fetch real goals from backend D1 database
  const { data: list = [], isLoading } = useQuery({
    queryKey: ["goals"],
    queryFn: goalsApi.getGoals,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: goalsApi.createGoal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      toast.success("Goal added successfully");
      setOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to create goal");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => goalsApi.updateGoal(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      toast.success("Goal updated successfully");
      setOpen(false);
      setEditing(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to update goal");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: goalsApi.deleteGoal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      toast.success("Goal deleted successfully");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to delete goal");
    },
  });

  const unlockMutation = useMutation({
    mutationFn: (id: string) => goalsApi.updateGoal(id, { locked: false, status: "draft" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      toast.success("Goal plan unlocked successfully");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to unlock goal");
    },
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => approvalsApi.completeGoal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      toast.success("Goal marked as completed! 🎉");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to mark goal as completed");
    },
  });

  const totalWeight = list.reduce((a: number, g: any) => a + Number(g.weightage), 0);
  const remaining = 100 - totalWeight;

  const allValid =
    totalWeight === 100 &&
    list.every((g: any) => Number(g.weightage) >= MIN_WEIGHT) &&
    list.length <= MAX_GOALS &&
    list.length > 0;

  const upsert = (g: any) => {
    const payload = {
      title: g.title,
      description: g.description,
      thrustArea: g.thrustArea,
      uomType: g.uomType,
      target: Number(g.target),
      weightage: Number(g.weightage),
      deadline: g.deadline,
    };

    if (editing) {
      updateMutation.mutate({ id: editing.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const remove = (id: string) => {
    deleteMutation.mutate(id);
  };

  const submit = () => {
    // For all draft goals, submit them (updating their status to pending and locking them)
    const draftGoals = list.filter(
      (g: any) => g.status === "draft" || g.status === "rework_requested",
    );

    if (draftGoals.length === 0) {
      toast.info("No draft or rework goals to submit.");
      return;
    }

    Promise.all(
      draftGoals.map((g: any) => goalsApi.updateGoal(g.id, { status: "pending", locked: true })),
    )
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["goals"] });
        toast.success("All goals submitted for approval", {
          description: "Your manager has been notified to review your plan.",
        });
      })
      .catch((err) => {
        toast.error("Failed to submit goals for approval");
      });
  };

  if (isLoading) {
    return (
      <div className="grid h-72 place-items-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading goal plan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="FY26 · Goal plan"
        title="My Goals"
        description={`Build a balanced plan. Max ${MAX_GOALS} goals, min ${MIN_WEIGHT}% each, total weightage must equal 100%.`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => window.open("/api/exports/goals", "_blank")}
              className="rounded-xl border-white/10"
            >
              Export Goals
            </Button>
            <Button
              className="rounded-xl gradient-primary text-white disabled:opacity-50 shadow-glow"
              disabled={!allValid}
              onClick={submit}
            >
              Submit for approval
            </Button>
          </div>
        }
      />

      {/* Validation strip */}
      <GlassCard className="p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <Validation
            label="Total weightage"
            value={`${totalWeight}%`}
            ok={totalWeight === 100}
            hint={
              remaining === 0
                ? "Balanced — ready to submit"
                : remaining > 0
                  ? `${remaining}% remaining`
                  : `${Math.abs(remaining)}% over`
            }
          />
          <Validation
            label="Goal count"
            value={`${list.length} / ${MAX_GOALS}`}
            ok={list.length > 0 && list.length <= MAX_GOALS}
            hint={list.length > MAX_GOALS ? "Reduce to 8 or fewer" : "Within limit"}
          />
          <Validation
            label="Min weight per goal"
            value={`${MIN_WEIGHT}%`}
            ok={list.every((g: any) => Number(g.weightage) >= MIN_WEIGHT)}
            hint={
              list.every((g: any) => Number(g.weightage) >= MIN_WEIGHT)
                ? "All goals meet minimum"
                : "Some goals below 10%"
            }
          />
        </div>
        <Progress value={Math.min(100, totalWeight)} className="mt-4 h-2" />
      </GlassCard>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {list.length} goal{list.length === 1 ? "" : "s"}
        </p>
        <Dialog
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
            if (!o) setEditing(null);
          }}
        >
          <DialogTrigger asChild>
            <Button
              className="rounded-xl gradient-primary text-white shadow-glow"
              disabled={(list.length >= MAX_GOALS || remaining < 10) && !editing}
            >
              <Plus className="mr-1 size-4" /> Add goal
            </Button>
          </DialogTrigger>
          <GoalDialog goal={editing} onSave={upsert} remaining={remaining} />
        </Dialog>
      </div>

      {remaining <= 0 && list.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-success/20 bg-success/5 p-4 text-sm text-success">
          <CheckCircle2 className="size-5 shrink-0 animate-pulse text-success" />
          <div>
            <p className="font-semibold text-success">Goal Plan Weightage Fully Allocated (100%)</p>
            <p className="text-xs opacity-90 mt-0.5">
              You have successfully allocated all 100% of your weightage. If you need to add a new
              goal, edit or delete your existing draft/rework goals first.
            </p>
          </div>
        </div>
      )}

      {remaining > 0 && remaining < 10 && (
        <div className="flex items-center gap-3 rounded-xl border border-warning/20 bg-warning/5 p-4 text-sm text-warning">
          <AlertCircle className="size-5 shrink-0 animate-pulse text-warning" />
          <div>
            <p className="font-semibold text-warning">Insufficient Weightage Remaining</p>
            <p className="text-xs opacity-90 mt-0.5">
              You have {remaining}% remaining, but the minimum weightage per goal is 10%. Please
              adjust your existing goals to free up more weightage if you wish to add a new one.
            </p>
          </div>
        </div>
      )}

      {list.length === 0 ? (
        <EmptyState onAdd={() => setOpen(true)} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <AnimatePresence>
            {list.map((g: any, i: number) => (
              <motion.div
                key={g.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ delay: i * 0.04 }}
              >
                <GoalCard
                  goal={g}
                  userRole={user?.role}
                  onEdit={() => {
                    setEditing(g);
                    setOpen(true);
                  }}
                  onDelete={() => remove(g.id)}
                  onUnlock={() => unlockMutation.mutate(g.id)}
                  onComplete={() => completeMutation.mutate(g.id)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function Validation({
  label,
  value,
  ok,
  hint,
}: {
  label: string;
  value: string;
  ok: boolean;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/40 p-4">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-center justify-between">
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
        {ok ? (
          <CheckCircle2 className="size-5 text-success" />
        ) : (
          <AlertCircle className="size-5 text-warning" />
        )}
      </div>
      <p className={`mt-1 text-xs ${ok ? "text-success" : "text-warning"}`}>{hint}</p>
    </div>
  );
}

function GoalCard({
  goal,
  userRole,
  onEdit,
  onDelete,
  onUnlock,
  onComplete,
}: {
  goal: any;
  userRole?: string;
  onEdit: () => void;
  onDelete: () => void;
  onUnlock?: () => void;
  onComplete?: () => void;
}) {
  return (
    <GlassCard className="group overflow-hidden p-0">
      <div className="relative p-5">
        <div className="absolute right-0 top-0 size-32 rounded-bl-full gradient-primary opacity-10" />
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-primary">
              {goal.thrustArea}
            </p>
            <h3 className="mt-1 text-lg font-semibold leading-tight">{goal.title}</h3>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{goal.description}</p>
          </div>
          <ProgressRing value={goal.progress || 0} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Mini label="UoM" value={goal.uomType || "Percentage"} />
          <Mini label="Target" value={`${goal.target}`} />
          <Mini label="Weight" value={`${goal.weightage}%`} />
          <Mini label="Timeline" value={formatDeadline(goal.deadline)} />
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusBadge status={goal.status} />
            {goal.locked && (
              <span className="text-[9px] bg-indigo-500/10 text-indigo-400 px-1.5 py-0.2 rounded border border-indigo-500/20 font-medium">
                Locked
              </span>
            )}
          </div>
          {/* Locked goal actions */}
          {goal.locked && goal.status !== "completed" ? (
            <div className="flex items-center gap-2 flex-wrap">
              {userRole === "admin" && onUnlock && (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/10"
                  onClick={onUnlock}
                >
                  <Unlock className="mr-1 size-3.5" /> Unlock Plan
                </Button>
              )}
              {(userRole === "manager" || userRole === "admin") && goal.status === "approved" && onComplete && (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10"
                  onClick={onComplete}
                >
                  <CheckCheck className="mr-1 size-3.5" /> Mark Complete
                </Button>
              )}
            </div>
          ) : goal.status === "approved" && !goal.locked ? (
            <div className="flex items-center gap-1 flex-wrap">
              <Button variant="ghost" size="sm" className="rounded-lg" onClick={onEdit}>
                <Pencil className="mr-1 size-3.5" /> Edit
              </Button>
              {onComplete && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-lg text-emerald-400 hover:text-emerald-400"
                  onClick={onComplete}
                >
                  <CheckCheck className="mr-1 size-3.5" /> Complete
                </Button>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-lg text-destructive hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this goal?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will remove the goal and all associated data. This action is
                      irreversible.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ) : goal.status !== "completed" ? (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="rounded-lg" onClick={onEdit}>
                <Pencil className="mr-1 size-3.5" /> Edit
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-lg text-destructive hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this goal?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will remove the goal and all associated data. This action is
                      irreversible.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400">
              <CheckCheck className="size-3.5" />
              <span className="font-medium">Completed</span>
            </div>
          )}
        </div>
      </div>
    </GlassCard>
  );
}

function Mini({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-background/40 p-2.5">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate text-sm font-medium">{value}</p>
    </div>
  );
}

function ProgressRing({ value }: { value: number }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const off = c - (value / 100) * c;
  return (
    <div className="relative size-14 shrink-0">
      <svg className="size-full -rotate-90" viewBox="0 0 50 50">
        <circle cx="25" cy="25" r={r} stroke="var(--color-border)" strokeWidth="4" fill="none" />
        <motion.circle
          cx="25"
          cy="25"
          r={r}
          stroke="url(#ringGrad)"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: off }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="hsl(280, 80%, 65%)" />
            <stop offset="100%" stopColor="hsl(320, 80%, 65%)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 grid place-items-center text-xs font-semibold tabular-nums">
        {value}%
      </div>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <GlassCard className="grid place-items-center p-12 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl gradient-primary text-white shadow-glow">
        <Target className="size-6" />
      </div>
      <h3 className="mt-4 text-xl font-semibold">Start your FY26 goal plan</h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        Add up to 8 goals across your thrust areas. Make sure weightages total 100%.
      </p>
      <Button onClick={onAdd} className="mt-6 rounded-xl gradient-primary text-white shadow-glow">
        <Plus className="mr-1 size-4" /> Add your first goal
      </Button>
    </GlassCard>
  );
}

function GoalDialog({
  goal,
  onSave,
  remaining,
}: {
  goal: any | null;
  onSave: (g: any) => void;
  remaining: number;
}) {
  const [form, setForm] = React.useState<any>(
    () =>
      goal ?? {
        thrustArea: THRUST_AREAS[0],
        title: "",
        description: "",
        uomType: "percentage",
        target: 100,
        weightage: Math.max(MIN_WEIGHT, Math.min(remaining, 20)),
        deadline: "",
      },
  );

  React.useEffect(() => {
    if (goal) {
      setForm(goal);
    } else {
      setForm({
        thrustArea: THRUST_AREAS[0],
        title: "",
        description: "",
        uomType: "percentage",
        target: 100,
        weightage: Math.max(MIN_WEIGHT, Math.min(remaining, 20)),
        deadline: "",
      });
    }
  }, [goal, remaining]);

  const titleOk = form.title.trim().length >= 3;
  const weightOk = form.weightage >= MIN_WEIGHT;
  const canSave = titleOk && weightOk;

  return (
    <DialogContent className="max-w-2xl rounded-2xl">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" /> {goal ? "Edit goal" : "New goal"}
        </DialogTitle>
        <DialogDescription>
          Define the goal, choose a unit of measure, set weightage and timeline.
        </DialogDescription>
      </DialogHeader>

      {goal?.sharedGoalId && (
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 text-xs text-primary flex items-center gap-2 mb-2">
          <Lock className="size-4 shrink-0" />
          <span>
            This is an aligned corporate KPI. The Title, Description, Thrust Area, UoM and Target
            are read-only.
          </span>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5 md:col-span-2">
          <Label>Thrust area</Label>
          <Select
            disabled={Boolean(goal?.sharedGoalId)}
            value={form.thrustArea}
            onValueChange={(v) => setForm({ ...form, thrustArea: v })}
          >
            <SelectTrigger className="rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {THRUST_AREAS.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <div className="flex items-center justify-between">
            <Label>Goal title</Label>
            <span className={`text-[10px] ${titleOk ? "text-success" : "text-amber-500"}`}>
              {titleOk ? "✓ Valid length" : "Min 3 characters"}
            </span>
          </div>
          <Input
            disabled={Boolean(goal?.sharedGoalId)}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Lift NPS for power users"
            className="rounded-xl"
          />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label>Description</Label>
          <Textarea
            disabled={Boolean(goal?.sharedGoalId)}
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Describe the outcome, scope and how success is measured…"
            className="rounded-xl"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Unit of measure</Label>
          <Select
            disabled={Boolean(goal?.sharedGoalId)}
            value={form.uomType}
            onValueChange={(v) => setForm({ ...form, uomType: v })}
          >
            <SelectTrigger className="rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["numeric", "percentage", "timeline", "zero-based"].map((u) => (
                <SelectItem key={u} value={u}>
                  {u}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Target value</Label>
          <Input
            disabled={Boolean(goal?.sharedGoalId)}
            type="number"
            value={form.target}
            onChange={(e) => setForm({ ...form, target: Number(e.target.value) })}
            className="rounded-xl"
          />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <div className="flex items-center justify-between">
            <Label>Weightage</Label>
            <span className="text-sm font-semibold tabular-nums">{form.weightage}%</span>
          </div>
          <Slider
            value={[form.weightage]}
            min={10}
            max={100}
            step={5}
            onValueChange={(v) => setForm({ ...form, weightage: v[0] })}
          />
          <p className={`text-xs ${weightOk ? "text-muted-foreground" : "text-destructive"}`}>
            Minimum {MIN_WEIGHT}% per goal
          </p>
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label>Deadline (Optional)</Label>
          <Input
            type="date"
            value={getSafeDateString(form.deadline)}
            onChange={(e) => setForm({ ...form, deadline: e.target.value })}
            className="rounded-xl"
          />
        </div>
      </div>

      <DialogFooter>
        <Button
          className="rounded-xl gradient-primary text-white"
          disabled={!canSave}
          onClick={() => onSave(form)}
        >
          {goal ? "Save changes" : "Add goal"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
