import { createFileRoute, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_app/dashboard")({ component: Dashboard });

function Dashboard() {
  const { user, ready } = useAuth();
  const nav = useNavigate();

  React.useEffect(() => {
    if (!ready || !user) return;

    if (user.role === "employee") {
      nav({ to: "/employee/dashboard" });
    } else if (user.role === "manager") {
      nav({ to: "/manager/dashboard" });
    } else if (user.role === "admin") {
      nav({ to: "/admin/dashboard" });
    }
  }, [ready, user, nav]);

  return (
    <div className="grid h-72 place-items-center">
      <div className="animate-pulse text-sm text-muted-foreground">
        Redirecting to your workspace…
      </div>
    </div>
  );
}
