import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import * as React from "react";
import { motion } from "framer-motion";
import { useAuth, type Role } from "@/lib/auth";
import { authApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Eye,
  EyeOff,
  Sparkles,
  Building2,
  ShieldCheck,
  User as UserIcon,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({ component: Login });

const ROLE_CONTENT: Record<
  Role,
  { title: string; sub: string; email: string; icon: React.ElementType }
> = {
  employee: {
    title: "Welcome back",
    sub: "Track your goals, log check-ins, and grow your career.",
    email: "employee@company.com",
    icon: UserIcon,
  },
  manager: {
    title: "Hello, manager",
    sub: "Approve goals, review check-ins, and steer your team.",
    email: "manager@company.com",
    icon: Building2,
  },
  admin: {
    title: "HR Operations",
    sub: "Run goal cycles, monitor escalations, and audit activity.",
    email: "admin@company.com",
    icon: ShieldCheck,
  },
};

function Login() {
  const nav = useNavigate();
  const { login, user } = useAuth();
  const [role, setRole] = React.useState<Role>("employee");
  const [email, setEmail] = React.useState(ROLE_CONTENT.employee.email);
  const [password, setPassword] = React.useState("demo1234");
  const [show, setShow] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [remember, setRemember] = React.useState(true);

  React.useEffect(() => {
    setEmail(ROLE_CONTENT[role].email);
  }, [role]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await authApi.login({ email, password });
      login(data.user);
      toast.success(`Welcome back, ${data.user.name || "there"}!`);
      nav({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to sign in. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const sso = async () => {
    setLoading(true);
    try {
      const defaultEmail = ROLE_CONTENT[role].email;
      const data = await authApi.login({ email: defaultEmail, password: "demo1234" });
      login(data.user);
      toast.success(`Welcome back, ${data.user.name}!`);
      nav({ to: "/dashboard" });
    } catch (err: any) {
      toast.error("SSO sign-in failed. Please make sure the database is seeded.");
    } finally {
      setLoading(false);
    }
  };

  const content = ROLE_CONTENT[role];

  return (
    <div className="relative grid min-h-screen lg:grid-cols-2">
      {/* Visual side */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-[hsl(280,40%,15%)] via-[hsl(265,20%,12%)] to-[hsl(240,20%,10%)] lg:block">
        <div className="absolute inset-0 mesh-bg opacity-90" />
        <div className="absolute inset-0 grid-pattern opacity-[0.07]" />
        {/* Floating particles */}
        {Array.from({ length: 18 }).map((_, i) => (
          <motion.span
            key={i}
            className="absolute size-1.5 rounded-full bg-white/40"
            style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 100}%` }}
            animate={{ y: [0, -30, 0], opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 5 + (i % 5), repeat: Infinity, delay: i * 0.2 }}
          />
        ))}

        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-2">
            <div className="flex size-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur">
              <Sparkles className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Ngage</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/60">Goals Portal</p>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-md"
          >
            <h1 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight">
              Set goals that{" "}
              <span className="bg-gradient-to-r from-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">
                move the org forward.
              </span>
            </h1>
            <p className="mt-4 text-white/70">
              Quarterly check-ins, approvals, escalations and analytics — all in one premium
              workspace, built for modern enterprises.
            </p>

            <div className="mt-10 grid grid-cols-3 gap-3">
              {[
                { k: "248", v: "Employees" },
                { k: "1,496", v: "Goals tracked" },
                { k: "71%", v: "Avg completion" },
              ].map((s) => (
                <div
                  key={s.v}
                  className="rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur"
                >
                  <p className="font-display text-2xl font-semibold">{s.k}</p>
                  <p className="text-[10px] uppercase tracking-widest text-white/60">{s.v}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <div className="flex items-center gap-3 text-xs text-white/50">
            <ShieldCheck className="size-4" />
            SOC 2 · ISO 27001 · Enterprise-grade SSO
          </div>
        </div>
      </div>

      {/* Form side */}
      <div className="relative flex items-center justify-center bg-background px-6 py-12">
        <div className="pointer-events-none absolute inset-0 mesh-bg opacity-40 lg:hidden" />
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative w-full max-w-md"
        >
          <div className="mb-6 flex items-center gap-2 lg:hidden">
            <div className="flex size-10 items-center justify-center rounded-xl gradient-primary">
              <Sparkles className="size-5 text-white" />
            </div>
            <p className="text-lg font-semibold">Ngage</p>
          </div>

          <Tabs value={role} onValueChange={(v) => setRole(v as Role)}>
            <TabsList className="grid w-full grid-cols-3 rounded-xl bg-muted/60 p-1">
              <TabsTrigger value="employee" className="rounded-lg">
                Employee
              </TabsTrigger>
              <TabsTrigger value="manager" className="rounded-lg">
                Manager
              </TabsTrigger>
              <TabsTrigger value="admin" className="rounded-lg">
                Admin · HR
              </TabsTrigger>
            </TabsList>
            {(["employee", "manager", "admin"] as Role[]).map((r) => (
              <TabsContent key={r} value={r} className="mt-6">
                <motion.div
                  key={r}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl gradient-primary text-white shadow-glow">
                      {React.createElement(content.icon, { className: "size-5" })}
                    </div>
                    <div>
                      <h2 className="font-display text-2xl font-semibold tracking-tight">
                        {content.title}
                      </h2>
                      <p className="text-sm text-muted-foreground">{content.sub}</p>
                    </div>
                  </div>





                  <form onSubmit={submit} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="email">



                        Work email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-11 rounded-xl"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password">Password</Label>
                        <button
                          type="button"
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          Forgot?
                        </button>
                      </div>
                      <div className="relative">
                        <Input
                          id="password"
                          type={show ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="h-11 rounded-xl pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShow(!show)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:bg-muted"
                        >
                          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="remember"
                        checked={remember}
                        onCheckedChange={(c) => setRemember(!!c)}
                      />
                      <Label htmlFor="remember" className="text-sm text-muted-foreground">
                        Remember me on this device
                      </Label>
                    </div>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="h-11 w-full rounded-xl gradient-primary text-white shadow-glow hover:opacity-95"
                    >
                      {loading ? (
                        <Loader2 className="mr-2 size-4 animate-spin" />
                      ) : (
                        <ArrowRight className="mr-2 size-4" />
                      )}
                      {loading
                        ? "Signing in…"
                        : `Sign in as ${r === "admin" ? "Admin" : r === "manager" ? "Manager" : "Employee"}`}
                    </Button>
                  </form>

                  <p className="mt-4 text-center text-sm text-muted-foreground">
                    Don't have an account?{" "}
                    <Link to="/signup" className="font-semibold text-primary hover:underline">
                      Sign up
                    </Link>
                  </p>

                  <div className="mt-5 rounded-xl border border-dashed border-border/70 bg-muted/40 p-3 text-xs">
                    <p className="mb-1 font-medium text-foreground">Demo credentials</p>
                    <p className="text-muted-foreground">{content.email} · any password</p>
                  </div>
                </motion.div>
              </TabsContent>
            ))}
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}
