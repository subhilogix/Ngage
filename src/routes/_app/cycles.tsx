import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/widgets/page-header";
import { GlassCard } from "@/components/widgets/glass-card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { CalendarRange, Lock, Unlock } from "lucide-react";

export const Route = createFileRoute("/_app/cycles")({ component: CyclesPage });

const cycles = [
  { name: "FY26 Q1", open: false, start: "Apr 1", end: "Jun 30", locked: true, completion: 92 },
  { name: "FY26 Q2", open: true, start: "Jul 1", end: "Sep 30", locked: false, completion: 42 },
  { name: "FY26 Q3", open: false, start: "Oct 1", end: "Dec 31", locked: false, completion: 0 },
  { name: "FY26 Q4", open: false, start: "Jan 1", end: "Mar 31", locked: false, completion: 0 },
];

function CyclesPage() {
  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Cycle management" title="Goal cycles" description="Open/close cycles, configure quarterly windows, and manage exceptions." />
      <div className="grid gap-4 md:grid-cols-2">
        {cycles.map((c) => (
          <GlassCard key={c.name} className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2"><CalendarRange className="size-4 text-primary" /><p className="text-[10px] uppercase tracking-widest text-primary">Cycle</p></div>
                <h3 className="mt-1 text-xl font-semibold">{c.name}</h3>
                <p className="text-xs text-muted-foreground">{c.start} – {c.end} · {c.completion}% complete</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{c.open ? "Open" : "Closed"}</span>
                <Switch defaultChecked={c.open} onCheckedChange={() => toast.success(`${c.name} ${c.open ? "closed" : "opened"}`)} />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button variant="outline" className="rounded-xl" onClick={() => toast.success(c.locked ? "Unlocked" : "Locked")}>
                {c.locked ? <Unlock className="mr-1 size-3.5" /> : <Lock className="mr-1 size-3.5" />}
                {c.locked ? "Unlock goals" : "Lock goals"}
              </Button>
              <Button variant="outline" className="rounded-xl">Configure windows</Button>
              <Button variant="ghost" className="rounded-xl">View exceptions</Button>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
