import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/widgets/page-header";
import { GlassCard } from "@/components/widgets/glass-card";
import { employees, DEPARTMENTS } from "@/lib/mock-data";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Building2, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_app/org")({ component: OrgPage });

function OrgPage() {
  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Organization" title="People & structure" description="Departments, reporting lines, and access control." />

      <div className="grid gap-4 lg:grid-cols-3">
        {DEPARTMENTS.slice(0, 6).map((d) => (
          <GlassCard key={d} className="p-5">
            <div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-xl gradient-primary text-white"><Building2 className="size-5" /></div><div><p className="font-medium">{d}</p><p className="text-xs text-muted-foreground">42 employees · 8 managers</p></div></div>
          </GlassCard>
        ))}
      </div>

      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold">Reporting tree · Platform Engineering</h3>
        <div className="mt-6 flex flex-col items-center">
          <Node name="Meera Iyer" title="Engineering Manager" />
          <div className="my-4 h-6 w-px bg-border" />
          <div className="flex flex-wrap items-start justify-center gap-6">
            {employees.slice(0, 5).map((e) => (
              <div key={e.id} className="flex flex-col items-center">
                <Node name={e.name} title={e.title} />
              </div>
            ))}
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <div className="flex items-center gap-2"><ShieldCheck className="size-4 text-primary" /><h3 className="text-lg font-semibold">Role & access control</h3></div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {[
            { role: "Employee", perms: ["Create / edit own goals", "Submit quarterly check-ins", "View shared goals"] },
            { role: "Manager", perms: ["Approve / reject team goals", "Inline edit before approval", "Review check-ins"] },
            { role: "Admin · HR", perms: ["Open / close cycles", "Push shared org KPIs", "View audit trail"] },
          ].map((r) => (
            <div key={r.role} className="rounded-xl border border-border/60 bg-background/40 p-4">
              <p className="font-medium">{r.role}</p>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {r.perms.map((p) => <li key={p}>• {p}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

function Node({ name, title }: { name: string; title: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-border/60 bg-background/40 px-4 py-3 shadow-elegant">
      <Avatar className="size-10"><AvatarFallback className="gradient-primary text-xs text-white">{name.split(" ").map((p) => p[0]).join("")}</AvatarFallback></Avatar>
      <div className="text-center">
        <p className="text-sm font-medium">{name}</p>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{title}</p>
      </div>
    </div>
  );
}
