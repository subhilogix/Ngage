import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { PageHeader } from "@/components/widgets/page-header";
import { GlassCard } from "@/components/widgets/glass-card";
import { auditLog } from "@/lib/mock-data";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Download, Search, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/audit")({ component: AuditPage });

function AuditPage() {
  const [q, setQ] = React.useState("");
  const rows = auditLog.filter((a) => (a.actor + a.action + a.entity).toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Compliance"
        title="Audit trail"
        description="Every action across the goals platform — searchable, filterable, exportable."
        actions={<Button className="rounded-xl gradient-primary text-white" onClick={() => toast.success("Export ready")}><Download className="mr-1 size-4" /> Export CSV</Button>}
      />
      <GlassCard className="p-6">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by user, action, entity…" className="h-10 rounded-xl pl-8" />
          </div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-widest text-muted-foreground">
              <tr className="border-b border-border/60">
                <th className="py-2 text-left">Time</th>
                <th className="py-2 text-left">Actor</th>
                <th className="py-2 text-left">Action</th>
                <th className="py-2 text-left">Entity</th>
                <th className="py-2 text-left">Change</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border/40 last:border-b-0">
                  <td className="py-3 text-xs text-muted-foreground">{new Date(r.ts).toLocaleString()}</td>
                  <td className="py-3 font-medium">{r.actor}</td>
                  <td className="py-3"><span className="rounded-md bg-muted px-2 py-0.5 text-xs font-mono">{r.action}</span></td>
                  <td className="py-3">{r.entity}</td>
                  <td className="py-3 text-xs">
                    {r.before && <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-destructive">{r.before}</span>}
                    {r.before && r.after && <ArrowRight className="mx-1 inline size-3" />}
                    {r.after && <span className="rounded bg-success/10 px-1.5 py-0.5 text-success">{r.after}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
