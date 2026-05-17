import { createFileRoute, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { PageHeader } from "@/components/widgets/page-header";
import { GlassCard } from "@/components/widgets/glass-card";
import { StatusBadge } from "@/components/widgets/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { goalsApi, approvalsApi, auditApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Check, X, RotateCcw, Lock, Pencil, Loader2, History } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export const Route = createFileRoute("/_app/approvals")({ component: ApprovalsPage });

function ApprovalsPage() {
  const { user, ready } = useAuth();
  const nav = useNavigate();

  React.useEffect(() => {
    if (ready && (!user || (user.role !== "manager" && user.role !== "admin"))) {
      toast.error("Access Denied: Managerial privilege required.");
      nav({ to: "/dashboard" });
    }
  }, [ready, user, nav]);

  const queryClient = useQueryClient();

  // 1. Fetch real goals from DB
  const { data: allGoals = [], isLoading: goalsLoading } = useQuery({
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

  // Filter goals awaiting review (pending)
  const queue = allGoals.filter((g: any) => g.status === "pending");

  // 2. Fetch real audit logs if user is admin, else local timeline
  const { data: auditLogs = [], isLoading: auditLoading } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: auditApi.getLogs,
    enabled: user?.role === "admin",
  });

  // Action Mutations
  const approveMutation = useMutation({
    mutationFn: (id: string) => approvalsApi.approveGoal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
      toast.success("Goal approved & locked successfully");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to approve goal");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, feedback }: { id: string; feedback: string }) =>
      approvalsApi.rejectGoal(id, feedback),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
      toast.success("Goal rejected");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to reject goal");
    },
  });

  const reworkMutation = useMutation({
    mutationFn: ({ id, feedback }: { id: string; feedback: string }) =>
      approvalsApi.requestRework(id, feedback),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
      toast.success("Rework requested successfully");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to request rework");
    },
  });

  const act = (id: string, action: "approve" | "reject" | "rework", feedback = "") => {
    if (action === "approve") {
      approveMutation.mutate(id);
    } else if (action === "reject") {
      rejectMutation.mutate({ id, feedback: feedback || "Rejected" });
    } else {
      reworkMutation.mutate({ id, feedback: feedback || "Rework requested" });
    }
  };

  if (goalsLoading) {
    return (
      <div className="grid h-72 place-items-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading approval queue...</p>
        </div>
      </div>
    );
  }

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
            queue.map((g: any, i: number) => (
              <motion.div
                key={g.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <ApprovalRow goal={g} onAct={act} />
              </motion.div>
            ))
          )}
        </div>

        <GlassCard className="p-6">
          <div className="flex items-center gap-2">
            <History className="size-5 text-primary" />
            <h3 className="text-lg font-semibold">Approval History</h3>
          </div>
          <p className="text-xs text-muted-foreground">Recent governance audit trail</p>
          <div className="mt-4 space-y-3">
            {user?.role !== "admin" ? (
              <p className="text-xs text-muted-foreground italic">
                Timeline is logged in the central HR audit trail (admin access required).
              </p>
            ) : auditLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent actions in audit trail.</p>
            ) : (
              auditLogs.slice(0, 5).map((log: any) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 rounded-xl bg-background/40 p-3 text-xs"
                >
                  <div className="mt-0.5 flex size-5 items-center justify-center rounded-full bg-primary/20 text-primary">
                    <History className="size-3" />
                  </div>
                  <div>
                    <p className="font-semibold capitalize">{log.action.replace("_", " ")}</p>
                    <p className="text-muted-foreground mt-0.5">Goal ID: {log.entityId}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(log.timestamp).toLocaleString()}
                    </p>
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

function ApprovalRow({
  goal,
  onAct,
}: {
  goal: any;
  onAct: (id: string, a: "approve" | "reject" | "rework", feedback?: string) => void;
}) {
  const [rejectFeedback, setRejectFeedback] = React.useState("");
  const [reworkFeedback, setReworkFeedback] = React.useState("");
  const [rejectOpen, setRejectOpen] = React.useState(false);
  const [reworkOpen, setReworkOpen] = React.useState(false);

  return (
    <GlassCard className="p-5">
      <div className="flex items-start gap-4">
        <Avatar className="size-10">
          <AvatarFallback className="gradient-primary text-xs text-white">
            {(goal.employeeName || "U")
              .split(" ")
              .map((p: string) => p[0])
              .join("")}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-primary">
                {goal.thrustArea}
              </p>
              <h4 className="font-semibold">{goal.title}</h4>
              <p className="text-xs text-muted-foreground">
                {goal.employeeName || "Team Member"} ·{" "}
                {goal.employeeEmail || "employee@company.com"}
              </p>
            </div>
            <StatusBadge status={goal.status} />
          </div>
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{goal.description}</p>

          <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span>
              UoM: <b className="text-foreground">{goal.uomType || "Percentage"}</b>
            </span>
            <span>
              Target: <b className="text-foreground">{goal.target}</b>
            </span>
            <span>
              Weight: <b className="text-foreground">{goal.weightage}%</b>
            </span>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {/* Inline edit can approve/lock */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="rounded-xl">
                  <Pencil className="mr-1 size-3.5" />
                  Review & Adjust
                </Button>
              </DialogTrigger>
              <EditDialog goal={goal} onSave={(adjusted) => onAct(goal.id, "approve")} />
            </Dialog>

            {/* Rework dialog */}
            <Dialog open={reworkOpen} onOpenChange={setReworkOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="rounded-xl text-warning hover:text-warning">
                  <RotateCcw className="mr-1 size-3.5" /> Return for rework
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md rounded-2xl">
                <DialogHeader>
                  <DialogTitle>Request goal rework</DialogTitle>
                  <DialogDescription>
                    Provide constructive feedback to the employee on what needs to be changed.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-3">
                  <label className="text-sm font-medium">Rework feedback</label>
                  <Textarea
                    className="mt-1.5 rounded-xl"
                    rows={3}
                    placeholder="e.g. Please align the weightage to 20% or specify Q3 targets..."
                    value={reworkFeedback}
                    onChange={(e) => setReworkFeedback(e.target.value)}
                  />
                </div>
                <DialogFooter>
                  <Button
                    className="rounded-xl"
                    variant="outline"
                    onClick={() => setReworkOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="rounded-xl gradient-primary text-white"
                    disabled={!reworkFeedback.trim()}
                    onClick={() => {
                      onAct(goal.id, "rework", reworkFeedback);
                      setReworkOpen(false);
                    }}
                  >
                    Submit request
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Reject dialog */}
            <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="rounded-xl text-destructive hover:text-destructive"
                >
                  <X className="mr-1 size-3.5" /> Reject
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md rounded-2xl">
                <DialogHeader>
                  <DialogTitle>Reject Goal Plan</DialogTitle>
                  <DialogDescription>
                    Explain the rationale for rejecting this goal. The goal will be returned to
                    draft state.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-3">
                  <label className="text-sm font-medium">Rejection reason</label>
                  <Textarea
                    className="mt-1.5 rounded-xl"
                    rows={3}
                    placeholder="e.g. This metric is no longer a corporate key focus area..."
                    value={rejectFeedback}
                    onChange={(e) => setRejectFeedback(e.target.value)}
                  />
                </div>
                <DialogFooter>
                  <Button
                    className="rounded-xl"
                    variant="outline"
                    onClick={() => setRejectOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={!rejectFeedback.trim()}
                    onClick={() => {
                      onAct(goal.id, "reject", rejectFeedback);
                      setRejectOpen(false);
                    }}
                  >
                    Confirm Rejection
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button
              className="rounded-xl gradient-primary text-white shadow-glow"
              onClick={() => onAct(goal.id, "approve")}
            >
              <Lock className="mr-1 size-3.5" /> Approve & lock
            </Button>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

function EditDialog({ goal, onSave }: { goal: any; onSave: (adjusted: any) => void }) {
  const queryClient = useQueryClient();
  const [target, setTarget] = React.useState(goal.target);
  const [weight, setWeight] = React.useState(goal.weightage);
  const [note, setNote] = React.useState("");

  const updateAndApproveMutation = useMutation({
    mutationFn: async () => {
      // First update goal
      await goalsApi.updateGoal(goal.id, {
        target: Number(target),
        weightage: Number(weight),
      });
      // Then approve goal with the reviewer note
      await approvalsApi.approveGoal(goal.id, note || "Approved by manager after adjustments");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      toast.success("Goal successfully updated and approved");
      onSave(true);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to edit and approve goal");
    },
  });

  return (
    <DialogContent className="max-w-lg rounded-2xl">
      <DialogHeader>
        <DialogTitle>Edit & approve</DialogTitle>
        <DialogDescription>
          Adjust target or weightage before approving. Changes are logged in the audit trail.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm">Target</label>
          <Input
            type="number"
            value={target}
            onChange={(e) => setTarget(Number(e.target.value))}
            className="rounded-xl"
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between">
            <label className="text-sm">Weightage</label>
            <span className="text-sm font-semibold">{weight}%</span>
          </div>
          <Slider
            value={[weight]}
            min={10}
            max={100}
            step={5}
            onValueChange={(v) => setWeight(v[0])}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm">Reviewer note</label>
          <Textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="rounded-xl"
            placeholder="Log details of this inline adjustment..."
          />
        </div>
      </div>
      <DialogFooter>
        <Button
          className="rounded-xl gradient-primary text-white"
          onClick={() => updateAndApproveMutation.mutate()}
          disabled={updateAndApproveMutation.isPending}
        >
          {updateAndApproveMutation.isPending ? "Approving..." : "Save & approve"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
