import { createFileRoute, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { user, ready } = useAuth();
  const nav = useNavigate();
  React.useEffect(() => {
    if (!ready) return;
    nav({ to: user ? "/dashboard" : "/login" });
  }, [ready, user, nav]);
  return (
    <div className="grid min-h-screen place-items-center bg-background">
      <div className="animate-pulse text-sm text-muted-foreground">Loading Ngage…</div>
    </div>
  );
}
