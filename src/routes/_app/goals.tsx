import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/widgets/page-header";
import { GlassCard } from "@/components/widgets/glass-card";
import { StatusBadge } from "@/components/widgets/status-badge";
import { goals as seedGoals, THRUST_AREAS, type Goal, type UoM } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, Pencil, AlertCircle, CheckCircle2, Target, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export const Route = createFileRoute("/_app/goals")({ component: GoalsPage });

const MAX_GOALS = 8;
const MIN_WEIGHT = 10;

function GoalsPage() {
  const { user } = useAuth();
  const [list, setList] = React.useState<Goal[]>(() => seedGoals.filter((g) => g.ownerId === user?.id));
  const [editing, setEditing] = React.useState<Goal | null>(null);
  const [open, setOpen] = React.useState(false);

  const totalWeight = list.reduce((a, g) => a + g.weightage, 0);
  const remaining = 100 - totalWeight;
  const allValid = totalWeight === 100 && list.every((g) => g.weightage >= MIN_WEIGHT) && list.length <= MAX_GOALS && list.length > 0;

  const upsert = (g: Goal) => {
    setList((prev) => {
      const exists = prev.find((p) => p.id === g.id);
      return exists ? prev.map((p) => (p.id === g.id ? g : p)) : [...prev, g];
    });
    toast.success(editing ? "Goal updated" : "Goal added");
    setOpen(false);
    setEditing(null);
  };

  const remove = (id: string) => {
    setList((p) => p.filter((g) => g.id !== id));
    toast.success("Goal removed");
  };

  const submit = () => {
    toast.success("Goals submitted for approval", { description: "Your manager will review shortly." });
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="FY26 · Goal plan"
        title="My Goals"
        description={`Build a balanced plan. Max ${MAX_GOALS} goals, min ${MIN_WEIGHT}% each, total weightage must equal 100%.`}
        actions={
          <>
            <Button variant="outline" className="rounded-xl" onClick={() => toast.success("Draft saved")}>Save draft</Button>
            <Button
              className="rounded-xl gradient-primary text-white disabled:opacity-50"
              disabled={!allValid}
              onClick={submit}
            >
              Submit for approval
            </Button>
          </>
        }
      />

      {/* Validation strip */}
      <GlassCard className="p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <Validation
            label="Total weightage"
            value={`${totalWeight}%`}
            ok={totalWeight === 100}
            hint={remaining === 0 ? "Balanced — ready to submit" : remaining > 0 ? `${remaining}% remaining` : `${Math.abs(remaining)}% over`}
          />
          <Validation label="Goal count" value={`${list.length} / ${MAX_GOALS}`} ok={list.length > 0 && list.length <= MAX_GOALS} hint={list.length > MAX_GOALS ? "Reduce to 8 or fewer" : "Within limit"} />
          <Validation label="Min weight per goal" value={`${MIN_WEIGHT}%`} ok={list.every((g) => g.weightage >= MIN_WEIGHT)} hint={list.every((g) => g.weightage >= MIN_WEIGHT) ? "All goals meet minimum" : "Some goals below 10%"} />
        </div>
        <Progress value={Math.min(100, totalWeight)} className="mt-4 h-2" />
      </GlassCard>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{list.length} goal{list.length === 1 ? "" : "s"}</p>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button className="rounded-xl gradient-primary text-white" disabled={list.length >= MAX_GOALS && !editing}>
              <Plus className="mr-1 size-4" /> Add goal
            </Button>
          </DialogTrigger>
          <GoalDialog goal={editing} onSave={upsert} remaining={remaining} />
        </Dialog>
      </div>

      {list.length === 0 ? (
        <EmptyState onAdd={() => setOpen(true)} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <AnimatePresence>
            {list.map((g, i) => (
              <motion.div
                key={g.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ delay: i * 0.04 }}
              >
                <GoalCard goal={g} onEdit={() => { setEditing(g); setOpen(true); }} onDelete={() => remove(g.id)} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function Validation({ label, value, ok, hint }: { label: string; value: string; ok: boolean; hint: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/40 p-4">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-center justify-between">
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
        {ok ? <CheckCircle2 className="size-5 text-success" /> : <AlertCircle className="size-5 text-warning" />}
      </div>
      <p className={`mt-1 text-xs ${ok ? "text-success" : "text-warning"}`}>{hint}</p>
    </div>
  );
}

function GoalCard({ goal, onEdit, onDelete }: { goal: Goal; onEdit: () => void; onDelete: () => void }) {
  return (
    <GlassCard className="group overflow-hidden p-0">
      <div className="relative p-5">
        <div className="absolute right-0 top-0 size-32 rounded-bl-full gradient-primary opacity-10" />
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-primary">{goal.thrustArea}</p>
            <h3 className="mt-1 text-lg font-semibold leading-tight">{goal.title}</h3>
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{goal.description}</p>
          </div>
          <ProgressRing value={goal.progress} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Mini label="UoM" value={goal.uom} />
          <Mini label="Target" value={`${goal.target}${goal.unit ? " " + goal.unit : ""}`} />
          <Mini label="Weight" value={`${goal.weightage}%`} />
          <Mini label="Timeline" value={goal.timeline} />
        </div>

        <div className="mt-4 flex items-center justify-between">
          <StatusBadge status={goal.status} />
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="rounded-lg" onClick={onEdit}>
              <Pencil className="mr-1 size-3.5" /> Edit
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="rounded-lg text-destructive hover:text-destructive">
                  <Trash2 className="size-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this goal?</AlertDialogTitle>
                  <AlertDialogDescription>This will remove the goal and any quarterly entries. You can re-add it later.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
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
          cx="25" cy="25" r={r} stroke="url(#ringGrad)" strokeWidth="4" fill="none" strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: off }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="oklch(0.62 0.22 280)" />
            <stop offset="100%" stopColor="oklch(0.62 0.22 320)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 grid place-items-center text-xs font-semibold tabular-nums">{value}%</div>
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
      <p className="mt-1 max-w-md text-sm text-muted-foreground">Add up to 8 goals across your thrust areas. Make sure weightages total 100%.</p>
      <Button onClick={onAdd} className="mt-6 rounded-xl gradient-primary text-white">
        <Plus className="mr-1 size-4" /> Add your first goal
      </Button>
    </GlassCard>
  );
}

function GoalDialog({ goal, onSave, remaining }: { goal: Goal | null; onSave: (g: Goal) => void; remaining: number }) {
  const [form, setForm] = React.useState<Goal>(() =>
    goal ?? {
      id: `g-${Date.now()}`,
      ownerId: "u-emp-001",
      ownerName: "Aarav Sharma",
      thrustArea: THRUST_AREAS[0],
      title: "",
      description: "",
      uom: "Percentage",
      target: 100,
      unit: "%",
      weightage: Math.max(MIN_WEIGHT, Math.min(remaining, 20)),
      timeline: "FY26",
      progress: 0,
      status: "draft",
      quarterly: { Q1: { planned: 25, actual: 0, status: "Not Started" }, Q2: { planned: 25, actual: 0, status: "Not Started" }, Q3: { planned: 25, actual: 0, status: "Not Started" }, Q4: { planned: 25, actual: 0, status: "Not Started" } },
      history: [],
    },
  );

  React.useEffect(() => { if (goal) setForm(goal); }, [goal]);

  const titleOk = form.title.trim().length >= 3;
  const weightOk = form.weightage >= MIN_WEIGHT;
  const canSave = titleOk && weightOk;

  return (
    <DialogContent className="max-w-2xl rounded-2xl">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2"><Sparkles className="size-4 text-primary" /> {goal ? "Edit goal" : "New goal"}</DialogTitle>
        <DialogDescription>Define the goal, choose a unit of measure, set weightage and timeline.</DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5 md:col-span-2">
          <Label>Thrust area</Label>
          <Select value={form.thrustArea} onValueChange={(v) => setForm({ ...form, thrustArea: v })}>
            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              {THRUST_AREAS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label>Goal title</Label>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Lift NPS for power users" className="rounded-xl" />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label>Description</Label>
          <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe the outcome, scope and how success is measured…" className="rounded-xl" />
        </div>
        <div className="space-y-1.5">
          <Label>Unit of measure</Label>
          <Select value={form.uom} onValueChange={(v) => setForm({ ...form, uom: v as UoM })}>
            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(["Numeric", "Percentage", "Timeline", "Zero-based"] as UoM[]).map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Target value</Label>
          <Input type="number" value={form.target} onChange={(e) => setForm({ ...form, target: Number(e.target.value) })} className="rounded-xl" />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <div className="flex items-center justify-between">
            <Label>Weightage</Label>
            <span className="text-sm font-semibold tabular-nums">{form.weightage}%</span>
          </div>
          <Slider value={[form.weightage]} min={5} max={100} step={5} onValueChange={(v) => setForm({ ...form, weightage: v[0] })} />
          <p className={`text-xs ${weightOk ? "text-muted-foreground" : "text-destructive"}`}>Minimum {MIN_WEIGHT}% per goal</p>
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label>Timeline</Label>
          <Input value={form.timeline} onChange={(e) => setForm({ ...form, timeline: e.target.value })} placeholder="e.g. FY26 Q1–Q4" className="rounded-xl" />
        </div>
      </div>

      <DialogFooter>
        <Button className="rounded-xl gradient-primary text-white" disabled={!canSave} onClick={() => onSave(form)}>
          {goal ? "Save changes" : "Add goal"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
