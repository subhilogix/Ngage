import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/widgets/page-header";
import { GlassCard } from "@/components/widgets/glass-card";
import { StatusBadge } from "@/components/widgets/status-badge";
import { goals, employees } from "@/lib/mock-data";
import { Progress } from "@/components/ui/progress";
import { Share2, Users, Lock } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export const Route = createFileRoute("/_app/shared-goals")({ component: SharedGoals });

function SharedGoals() {
  const shared = goals.filter((g) => g.shared);
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Org-wide alignment"
        title="Shared goals"
        description="KPIs pushed by HR/Finance to multiple employees. Progress is synced across owners."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        {shared.map((g) => (
          <GlassCard key={g.id} className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2"><Share2 className="size-4 text-primary" /><p className="text-[10px] uppercase tracking-widest text-primary">{g.thrustArea}</p></div>
                <h3 className="mt-1 text-lg font-semibold">{g.title}</h3>
                <p className="text-sm text-muted-foreground">{g.description}</p>
              </div>
              <StatusBadge status={g.status} />
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Synced progress</span><span className="font-semibold">{g.progress}%</span></div>
              <Progress value={g.progress} className="mt-1.5 h-2" />
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Users className="size-4 text-muted-foreground" />
              <div className="flex -space-x-2">
                {employees.slice(0, 5).map((e) => (
                  <Avatar key={e.id} className="size-7 border-2 border-background"><AvatarFallback className="gradient-primary text-[10px] text-white">{e.name.split(" ").map((p) => p[0]).join("")}</AvatarFallback></Avatar>
                ))}
              </div>
              <span className="text-xs text-muted-foreground">+ 243 employees</span>
              <span className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground"><Lock className="size-3" /> Read-only</span>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
