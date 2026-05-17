import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import * as React from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { authApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, EyeOff, Sparkles, ShieldCheck, Loader2, ArrowRight, UserPlus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/signup")({ component: Signup });

function Signup() {
  const nav = useNavigate();
  const { login, user } = useAuth();

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [department, setDepartment] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [role, setRole] = React.useState("employee");

  const [managers, setManagers] = React.useState<any[]>([]);
  const [managerId, setManagerId] = React.useState("");

  const [showPass, setShowPass] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/public/managers")
      .then((res) => res.json())
      .then((data: any) => {
        if (data.success && Array.isArray(data.data)) {
          setManagers(data.data);
          if (data.data.length > 0) {
            setManagerId(data.data[0].id);
          }
        }
      })
      .catch((err) => console.error("Error loading managers:", err));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !confirmPassword || !department) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (role === "employee" && !managerId) {
      toast.error("Please select a reporting manager.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const data = await authApi.register({
        name,
        email,
        password,
        confirmPassword,
        department,
        title,
        role,
        managerId: role === "employee" ? managerId : undefined,
      });
      login(data.user);
      toast.success(`Account created successfully! Welcome, ${data.user.name}!`);
      nav({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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
              Join the modern{" "}
              <span className="bg-gradient-to-r from-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">
                growth ecosystem.
              </span>
            </h1>
            <p className="mt-4 text-white/70">
              Set goals, complete quarterly check-ins, receive real-time manager feedback, and excel
              in your thrust areas.
            </p>

            <div className="mt-10 grid grid-cols-3 gap-3">
              {[
                { k: "100%", v: "D1 persistence" },
                { k: "Lucia", v: "Secure Auth" },
                { k: "Strict", v: "Role Access" },
              ].map((s) => (
                <div
                  key={s.v}
                  className="rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur"
                >
                  <p className="font-display text-lg font-semibold">{s.k}</p>
                  <p className="text-[10px] uppercase tracking-widest text-white/60">{s.v}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* <div className="flex items-center gap-3 text-xs text-white/50">
            <ShieldCheck className="size-4" />
            SOC 2 · ISO 27001 · Enterprise-grade SSO
          </div> */}
        </div>
      </div>

      {/* Form side */}cle
      <div className="relative flex items-center justify-center bg-background px-6 py-8 overflow-y-auto">
        <div className="pointer-events-none absolute inset-0 mesh-bg opacity-40 lg:hidden" />
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative w-full max-w-md space-y-6"
        >
          <div className="flex items-center gap-2 lg:hidden">
            <div className="flex size-10 items-center justify-center rounded-xl gradient-primary">
              <Sparkles className="size-5 text-white" />
            </div>
            <p className="text-lg font-semibold">Ngage</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl gradient-primary text-white shadow-glow">
                <UserPlus className="size-5" />
              </div>
              <div>
                <h2 className="font-display text-2xl font-semibold tracking-tight">
                  Create your account
                </h2>
                <p className="text-sm text-muted-foreground">
                  Register as a new employee or manager.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="name">Full name *</Label>
                <Input
                  id="name"
                  placeholder="Aarav Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-10 rounded-xl"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Work email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="aarav@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10 rounded-xl"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="role">Your role *</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger id="role" className="h-10 rounded-xl">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="department">Department *</Label>
                <Select value={department} onValueChange={setDepartment}>
                  <SelectTrigger id="department" className="h-10 rounded-xl">
                    <SelectValue placeholder="Select dept" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Platform Engineering">Platform Engineering</SelectItem>
                    <SelectItem value="Product Design">Product Design</SelectItem>
                    <SelectItem value="Customer Success">Customer Success</SelectItem>
                    <SelectItem value="People & Culture">People & Culture</SelectItem>
                    <SelectItem value="Finance">Finance</SelectItem>
                    <SelectItem value="Marketing">Marketing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {role === "employee" && (
              <div className="space-y-1.5">
                <Label htmlFor="manager">Reporting Manager *</Label>
                <Select value={managerId} onValueChange={setManagerId}>
                  <SelectTrigger id="manager" className="h-10 rounded-xl">
                    <SelectValue placeholder="Select your reporting manager" />
                  </SelectTrigger>
                  <SelectContent>
                    {managers.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name} ({m.department})
                      </SelectItem>
                    ))}
                    {managers.length === 0 && (
                      <SelectItem value="no-managers" disabled>
                        No managers found. Please select default.
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="title">Job title (Optional)</Label>
              <Input
                id="title"
                placeholder="Senior Engineer"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-10 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="password">Password *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-10 rounded-xl pr-9"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted"
                  >
                    {showPass ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-10 rounded-xl pr-9"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted"
                  >
                    {showConfirm ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="mt-2 h-11 w-full rounded-xl gradient-primary text-white shadow-glow hover:opacity-95"
            >
              {loading ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <ArrowRight className="mr-2 size-4" />
              )}
              {loading ? "Registering account…" : "Sign up"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
