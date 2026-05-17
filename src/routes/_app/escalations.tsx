import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/widgets/page-header";
import { GlassCard } from "@/components/widgets/glass-card";
import { StatusBadge } from "@/components/widgets/status-badge";
import { escalations } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, Send } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/escalations")({ component: Escal });

function Escal() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Escalations"
        title="Workflow alerts"
        description="Track overdue submissions, missed check-ins and stuck approvals."
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <GlassCard className="p-5"><Scenario icon={Clock} title="Goal not submitted" count={3} desc="ICs without an FY26 plan after deadline." /></GlassCard>
        <GlassCard className="p-5"><Scenario icon={Send} title="Approval delayed" count={2} desc="Goals pending manager review > 5 days." /></GlassCard>
        <GlassCard className="p-5"><Scenario icon={AlertTriangle} title="Check-in missed" count={2} desc="Quarterly check-ins not submitted on time." /></GlassCard>
      </div>

      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold">Active escalations</h3>
        <div className="mt-4 space-y-3">
          {escalations.map((e) => (
            <div key={e.id} className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/40 p-4">
              <div className={`mt-0.5 flex size-9 items-center justify-center rounded-xl ${e.level === 1 ? "bg-warning/15 text-warning" : e.level === 2 ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary"}`}>
                L{e.level}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{e.employee}</p>
                    <p className="text-xs text-muted-foreground">{e.reason} · raised {new Date(e.raisedAt).toLocaleDateString()}</p>
                  </div>
                  <StatusBadge status={e.status} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" className="rounded-lg" onClick={() => toast.success("Reminder sent")}>Send reminder</Button>
                  <Button size="sm" variant="outline" className="rounded-lg" onClick={() => toast.success("Acknowledged")}>Acknowledge</Button>
                  <Button size="sm" className="rounded-lg gradient-primary text-white" onClick={() => toast.success("Escalated to HR")}>Escalate to HR</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

function Scenario({ icon: Icon, title, count, desc }: { icon: React.ElementType; title: string; count: number; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-11 items-center justify-center rounded-xl gradient-primary text-white"><Icon className="size-5" /></div>
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">{title}</p>
        <p className="font-display text-3xl font-semibold">{count}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}
