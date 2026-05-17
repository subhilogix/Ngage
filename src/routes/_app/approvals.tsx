import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { PageHeader } from "@/components/widgets/page-header";
import { GlassCard } from "@/components/widgets/glass-card";
import { StatusBadge } from "@/components/widgets/status-badge";
import { getGoalsFor, type Goal } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Check, X, RotateCcw, Lock, Pencil } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export const Route = createFileRoute("/_app/approvals")({ component: ApprovalsPage });

function ApprovalsPage() {
  const initial = getGoalsFor("manager", "u-mgr-001").filter((g) => g.status === "pending");
  const [queue, setQueue] = React.useState<Goal[]>(initial);
  const [history, setHistory] = React.useState<{ id: string; action: string; ts: string }[]>([]);

  const act = (id: string, action: "approve" | "reject" | "rework") => {
    setQueue((q) => q.filter((g) => g.id !== id));
    setHistory((h) => [{ id, action, ts: new Date().toLocaleString() }, ...h]);
    toast.success(`Goal ${action === "approve" ? "approved & locked" : action === "reject" ? "rejected" : "returned for rework"}`);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Manager workspace"
        title="Goal approvals"
        description="Review, edit, and approve goals submitted by your team. Approved goals are locked from further edits."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {queue.length === 0 ? (
            <GlassCard className="grid place-items-center p-12 text-center">
              <Check className="size-10 text-success" />
              <h3 className="mt-3 text-lg font-semibold">All caught up</h3>
              <p className="text-sm text-muted-foreground">No pending approvals in your queue.</p>
            </GlassCard>
          ) : (
            queue.map((g, i) => (
              <motion.div key={g.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <ApprovalRow goal={g} onAct={act} />
              </motion.div>
            ))
          )}
        </div>

        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold">Approval timeline</h3>
          <p className="text-xs text-muted-foreground">Recent actions this cycle</p>
          <div className="mt-4 space-y-3">
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">No actions yet — approve a goal to see it here.</p>
            ) : (
              history.map((h) => (
                <div key={h.ts} className="flex items-start gap-3 rounded-xl bg-background/40 p-3 text-sm">
                  <div className={`mt-0.5 flex size-7 items-center justify-center rounded-full ${h.action === "approve" ? "bg-success/20 text-success" : h.action === "reject" ? "bg-destructive/20 text-destructive" : "bg-warning/20 text-warning"}`}>
                    {h.action === "approve" ? <Check className="size-3.5" /> : h.action === "reject" ? <X className="size-3.5" /> : <RotateCcw className="size-3.5" />}
                  </div>
                  <div>
                    <p className="font-medium capitalize">{h.action} · {h.id}</p>
                    <p className="text-xs text-muted-foreground">{h.ts}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

function ApprovalRow({ goal, onAct }: { goal: Goal; onAct: (id: string, a: "approve" | "reject" | "rework") => void }) {
  return (
    <GlassCard className="p-5">
      <div className="flex items-start gap-4">
        <Avatar className="size-10"><AvatarFallback className="gradient-primary text-xs text-white">{goal.ownerName.split(" ").map((p) => p[0]).join("")}</AvatarFallback></Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-primary">{goal.thrustArea}</p>
              <h4 className="font-semibold">{goal.title}</h4>
              <p className="text-xs text-muted-foreground">{goal.ownerName} · {goal.timeline}</p>
            </div>
            <StatusBadge status={goal.status} />
          </div>
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{goal.description}</p>

          <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span>UoM: <b className="text-foreground">{goal.uom}</b></span>
            <span>Target: <b className="text-foreground">{goal.target}{goal.unit ? ` ${goal.unit}` : ""}</b></span>
            <span>Weight: <b className="text-foreground">{goal.weightage}%</b></span>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="rounded-xl"><Pencil className="mr-1 size-3.5" />Inline edit</Button>
              </DialogTrigger>
              <EditDialog goal={goal} onSave={() => onAct(goal.id, "approve")} />
            </Dialog>
            <Button variant="outline" className="rounded-xl text-warning hover:text-warning" onClick={() => onAct(goal.id, "rework")}>
              <RotateCcw className="mr-1 size-3.5" /> Return for rework
            </Button>
            <Button variant="outline" className="rounded-xl text-destructive hover:text-destructive" onClick={() => onAct(goal.id, "reject")}>
              <X className="mr-1 size-3.5" /> Reject
            </Button>
            <Button className="rounded-xl gradient-primary text-white" onClick={() => onAct(goal.id, "approve")}>
              <Lock className="mr-1 size-3.5" /> Approve & lock
            </Button>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

function EditDialog({ goal, onSave }: { goal: Goal; onSave: () => void }) {
  const [target, setTarget] = React.useState(goal.target);
  const [weight, setWeight] = React.useState(goal.weightage);
  const [note, setNote] = React.useState("");
  return (
    <DialogContent className="max-w-lg rounded-2xl">
      <DialogHeader>
        <DialogTitle>Edit & approve</DialogTitle>
        <DialogDescription>Adjust target or weightage before approving. Changes are logged in the audit trail.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm">Target</label>
          <Input type="number" value={target} onChange={(e) => setTarget(Number(e.target.value))} className="rounded-xl" />
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between"><label className="text-sm">Weightage</label><span className="text-sm font-semibold">{weight}%</span></div>
          <Slider value={[weight]} min={5} max={50} step={5} onValueChange={(v) => setWeight(v[0])} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm">Reviewer note</label>
          <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} className="rounded-xl" />
        </div>
      </div>
      <DialogFooter>
        <Button className="rounded-xl gradient-primary text-white" onClick={onSave}>Save & approve</Button>
      </DialogFooter>
    </DialogContent>
  );
}
