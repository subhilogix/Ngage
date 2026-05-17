import { cn } from "@/lib/utils";
import type { GoalStatus } from "@/lib/mock-data";

const map: Record<GoalStatus | "open" | "acknowledged" | "resolved" | "Not Started" | "On Track" | "Completed", { label: string; cls: string }> = {
  draft: { label: "Draft", cls: "bg-muted text-muted-foreground" },
  pending: { label: "Pending approval", cls: "bg-warning/15 text-warning border border-warning/30" },
  approved: { label: "Approved", cls: "bg-info/15 text-info border border-info/30" },
  rejected: { label: "Rejected", cls: "bg-destructive/15 text-destructive border border-destructive/30" },
  "on-track": { label: "On track", cls: "bg-success/15 text-success border border-success/30" },
  "at-risk": { label: "At risk", cls: "bg-destructive/15 text-destructive border border-destructive/30" },
  completed: { label: "Completed", cls: "bg-primary/15 text-primary border border-primary/30" },
  open: { label: "Open", cls: "bg-warning/15 text-warning border border-warning/30" },
  acknowledged: { label: "Acknowledged", cls: "bg-info/15 text-info border border-info/30" },
  resolved: { label: "Resolved", cls: "bg-success/15 text-success border border-success/30" },
  "Not Started": { label: "Not started", cls: "bg-muted text-muted-foreground" },
  "On Track": { label: "On track", cls: "bg-success/15 text-success border border-success/30" },
  Completed: { label: "Completed", cls: "bg-primary/15 text-primary border border-primary/30" },
};

export function StatusBadge({ status }: { status: keyof typeof map }) {
  const m = map[status] ?? { label: String(status), cls: "bg-muted text-muted-foreground" };
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium", m.cls)}>
      <span className="size-1.5 rounded-full bg-current" />
      {m.label}
    </span>
  );
}
