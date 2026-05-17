import { createFileRoute, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { PageHeader } from "@/components/widgets/page-header";
import { GlassCard } from "@/components/widgets/glass-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Download, Search, ArrowRight, Loader2, Database } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { auditApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_app/audit")({ component: AuditPage });

function AuditPage() {
  const { user, ready } = useAuth();
  const nav = useNavigate();

  React.useEffect(() => {
    if (ready && (!user || user.role !== "admin")) {
      toast.error("Access Denied: Administrative privilege required.");
      nav({ to: "/dashboard" });
    }
  }, [ready, user, nav]);

  const [q, setQ] = React.useState("");

  const {
    data: logs = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: auditApi.getLogs,
    enabled: ready && user?.role === "admin",
  });

  if (!ready || !user || user.role !== "admin") {
    return (
      <div className="grid h-72 place-items-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  const filteredLogs = logs.filter((log: any) => {
    const query = q.toLowerCase();
    const action = (log.action || "").toLowerCase();
    const userId = (log.userId || "").toLowerCase();
    const entityType = (log.entityType || "").toLowerCase();
    return action.includes(query) || userId.includes(query) || entityType.includes(query);
  });

  const handleExport = () => {
    if (filteredLogs.length === 0) {
      toast.info("No audit logs to export.");
      return;
    }

    const headers = [
      "Time",
      "User ID",
      "Action",
      "Entity Type",
      "Entity ID",
      "Old Value",
      "New Value",
    ];
    const csvContent = [
      headers.join(","),
      ...filteredLogs.map((log: any) =>
        [
          new Date(log.timestamp).toISOString(),
          `"${log.userId}"`,
          `"${log.action}"`,
          `"${log.entityType}"`,
          `"${log.entityId}"`,
          `"${(log.oldValue || "").replace(/"/g, '""')}"`,
          `"${(log.newValue || "").replace(/"/g, '""')}"`,
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `ngage_audit_logs_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Security logs exported successfully!");
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Compliance & Governance"
        title="Audit trail"
        description="Every system action, configuration shift, and approval verified under D1 security ledger."
        actions={
          <Button
            className="rounded-xl gradient-primary text-white shadow-glow"
            onClick={() => window.open("/api/exports/audit-logs", "_blank")}
          >
            <Download className="mr-1 size-4" /> Export CSV
          </Button>
        }
      />

      <GlassCard className="p-6">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by User ID, action parameter, or entity..."
              className="h-10 rounded-xl pl-8 bg-background/20"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="mt-8 flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Fetching compliance logs...</p>
          </div>
        ) : error ? (
          <div className="mt-8 text-center py-10 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm">
            Failed to retrieve compliance records. Please verify administrative status.
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="mt-8 flex flex-col items-center justify-center py-12 text-center bg-background/10 rounded-xl border border-dashed border-border/60">
            <Database className="size-8 text-muted-foreground mb-2" />
            <p className="text-sm font-semibold">No compliance entries found</p>
            <p className="text-xs text-muted-foreground max-w-sm mt-1">
              Try adjusting your query or perform some administrative workflows to write to D1.
            </p>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto w-full rounded-xl border border-white/5 bg-background/20">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-widest text-muted-foreground bg-white/[0.02]">
                <tr className="border-b border-white/5">
                  <th className="py-3 px-4 text-left">Timestamp</th>
                  <th className="py-3 px-4 text-left">Actor</th>
                  <th className="py-3 px-4 text-left">Action type</th>
                  <th className="py-3 px-4 text-left">Entity</th>
                  <th className="py-3 px-4 text-left">Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log: any) => (
                  <tr
                    key={log.id}
                    className="border-b border-white/5 last:border-b-0 hover:bg-white/[0.01] transition-colors"
                  >
                    <td className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">
                      <SafeDate date={log.timestamp} />
                    </td>
                    <td className="py-3 px-4 text-xs font-semibold whitespace-nowrap text-primary">
                      {log.userName || log.userId}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-mono text-primary border border-white/5">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs whitespace-nowrap text-foreground/80">
                      {log.entityType} ({log.entityId})
                    </td>
                    <td className="py-3 px-4 text-xs max-w-xs truncate text-muted-foreground">
                      {log.newValue || log.oldValue || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
}

function SafeDate({ date }: { date: any }) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  if (!mounted) return <span className="invisible">...</span>;
  return <span>{new Date(date).toLocaleString()}</span>;
}
