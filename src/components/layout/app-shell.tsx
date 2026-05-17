import * as React from "react";
import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, Target, CheckSquare, Users, BarChart3, Building2,
  CalendarRange, ShieldCheck, AlertTriangle, Bell, Search, Sun, Moon, LogOut,
  Command, Sparkles, Share2, FileText, Plus, ClipboardCheck,
} from "lucide-react";
import { useAuth, type Role } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { motion, AnimatePresence } from "framer-motion";
import { notifications } from "@/lib/mock-data";

type NavItem = { to: string; label: string; icon: React.ComponentType<{ className?: string }>; roles: Role[]; badge?: string };

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["employee", "manager", "admin"] },
  { to: "/goals", label: "My Goals", icon: Target, roles: ["employee"] },
  { to: "/checkins", label: "Check-ins", icon: ClipboardCheck, roles: ["employee", "manager"] },
  { to: "/approvals", label: "Approvals", icon: CheckSquare, roles: ["manager"], badge: "3" },
  { to: "/team", label: "Team", icon: Users, roles: ["manager"] },
  { to: "/shared-goals", label: "Shared Goals", icon: Share2, roles: ["employee", "manager", "admin"] },
  { to: "/analytics", label: "Analytics", icon: BarChart3, roles: ["manager", "admin"] },
  { to: "/org", label: "Organization", icon: Building2, roles: ["admin"] },
  { to: "/cycles", label: "Goal Cycles", icon: CalendarRange, roles: ["admin"] },
  { to: "/escalations", label: "Escalations", icon: AlertTriangle, roles: ["manager", "admin"], badge: "2" },
  { to: "/audit", label: "Audit Trail", icon: ShieldCheck, roles: ["admin"] },
];

function roleAccent(role: Role) {
  if (role === "manager") return "Manager";
  if (role === "admin") return "Admin · HR";
  return "Employee";
}

export function AppShell() {
  const { user, logout, ready } = useAuth();
  const { theme, toggle } = useTheme();
  const nav = useNavigate();
  const loc = useLocation();
  const [cmdOpen, setCmdOpen] = React.useState(false);

  React.useEffect(() => {
    if (ready && !user) nav({ to: "/login" });
  }, [ready, user, nav]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!ready || !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="animate-pulse text-sm text-muted-foreground">Loading workspace…</div>
      </div>
    );
  }

  const items = NAV.filter((n) => n.roles.includes(user.role));
  const initials = user.name.split(" ").map((p) => p[0]).slice(0, 2).join("");

  return (
    <div className="relative min-h-screen bg-background">
      <div className="pointer-events-none fixed inset-0 -z-10 mesh-bg opacity-60" />
      <div className="pointer-events-none fixed inset-0 -z-10 grid-pattern opacity-[0.04]" />

      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-sidebar-border bg-sidebar/80 backdrop-blur-xl md:flex md:flex-col">
          <div className="flex h-16 items-center gap-2 px-5">
            <div className="flex size-9 items-center justify-center rounded-xl gradient-primary shadow-glow">
              <Sparkles className="size-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-none">Ngage</p>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Goals Portal</p>
            </div>
          </div>

          <div className="px-3">
            <button
              onClick={() => setCmdOpen(true)}
              className="flex w-full items-center justify-between rounded-xl border border-sidebar-border bg-background/40 px-3 py-2 text-xs text-muted-foreground transition hover:bg-background"
            >
              <span className="flex items-center gap-2"><Search className="size-3.5" /> Search…</span>
              <kbd className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium">⌘K</kbd>
            </button>
          </div>

          <nav className="mt-4 flex-1 space-y-0.5 overflow-y-auto scrollbar-thin px-2 pb-4">
            <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Workspace</p>
            {items.map((item) => {
              const active = loc.pathname === item.to || (item.to !== "/dashboard" && loc.pathname.startsWith(item.to));
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "group relative flex items-center justify-between rounded-xl px-3 py-2 text-sm transition",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-elegant"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-y-1 left-0 w-1 rounded-r-full gradient-primary"
                    />
                  )}
                  <span className="flex items-center gap-2.5">
                    <item.icon className="size-4" />
                    {item.label}
                  </span>
                  {item.badge && (
                    <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-sidebar-border p-3">
            <div className="flex items-center gap-3 rounded-xl bg-sidebar-accent/50 p-2.5">
              <Avatar className="size-9">
                <AvatarFallback className="gradient-primary text-xs font-semibold text-white">{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium leading-tight">{user.name}</p>
                <p className="truncate text-[10px] uppercase tracking-widest text-muted-foreground">{roleAccent(user.role)}</p>
              </div>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top navbar */}
          <header className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur-xl">
            <div className="flex h-16 items-center gap-3 px-4 md:px-8">
              <div className="md:hidden flex size-9 items-center justify-center rounded-xl gradient-primary">
                <Sparkles className="size-5 text-white" />
              </div>
              <div className="hidden flex-1 md:block">
                <div className="relative max-w-md">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search goals, people, cycles…"
                    onFocus={() => setCmdOpen(true)}
                    className="h-10 rounded-xl border-border/60 bg-background/60 pl-9"
                  />
                </div>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <Button variant="ghost" size="icon" className="rounded-xl" onClick={toggle} aria-label="Toggle theme">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={theme}
                      initial={{ rotate: -90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: 90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex"
                    >
                      {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
                    </motion.span>
                  </AnimatePresence>
                </Button>
                <NotificationBell />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/60 px-2 py-1.5 text-sm transition hover:bg-background">
                      <Avatar className="size-7"><AvatarFallback className="gradient-primary text-[10px] text-white">{initials}</AvatarFallback></Avatar>
                      <span className="hidden md:inline">{user.name.split(" ")[0]}</span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-60">
                    <DropdownMenuLabel>
                      <div className="flex flex-col">
                        <span className="font-medium">{user.name}</span>
                        <span className="text-xs text-muted-foreground">{user.email}</span>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem><FileText className="mr-2 size-4" />My profile</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setCmdOpen(true)}><Command className="mr-2 size-4" />Command palette</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => { logout(); nav({ to: "/login" }); }}>
                      <LogOut className="mr-2 size-4" />Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          {/* Mobile sidebar bottom nav */}
          <nav className="fixed inset-x-3 bottom-3 z-30 flex items-center justify-around rounded-2xl glass p-2 md:hidden">
            {items.slice(0, 5).map((it) => {
              const active = loc.pathname === it.to;
              return (
                <Link key={it.to} to={it.to} className={cn("flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[10px]", active ? "text-primary" : "text-muted-foreground")}>
                  <it.icon className="size-4" />
                  {it.label.split(" ")[0]}
                </Link>
              );
            })}
          </nav>

          <main className="flex-1 px-4 pb-24 pt-6 md:px-8 md:pb-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={loc.pathname}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="mx-auto max-w-7xl"
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </main>

          {/* Floating action button */}
          {user.role === "employee" && (
            <Link
              to="/goals"
              className="fixed bottom-24 right-4 z-30 inline-flex items-center gap-2 rounded-full gradient-primary px-4 py-3 text-sm font-semibold text-white shadow-glow transition hover:scale-105 md:bottom-8 md:right-8"
            >
              <Plus className="size-4" /> New Goal
            </Link>
          )}
        </div>
      </div>

      <CommandDialog open={cmdOpen} onOpenChange={setCmdOpen}>
        <CommandInput placeholder="Jump to page, goal, or person…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Navigate">
            {items.map((it) => (
              <CommandItem key={it.to} onSelect={() => { setCmdOpen(false); nav({ to: it.to }); }}>
                <it.icon className="mr-2 size-4" /> {it.label}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Quick actions">
            <CommandItem onSelect={() => { setCmdOpen(false); toggle(); }}>
              {theme === "dark" ? <Sun className="mr-2 size-4" /> : <Moon className="mr-2 size-4" />} Toggle theme
            </CommandItem>
            <CommandItem onSelect={() => { setCmdOpen(false); logout(); nav({ to: "/login" }); }}>
              <LogOut className="mr-2 size-4" /> Sign out
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  );
}

function NotificationBell() {
  const unread = notifications.length;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-xl">
          <Bell className="size-4" />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 flex size-2">
              <span className="absolute inset-0 animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative size-2 rounded-full bg-primary" />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <p className="text-sm font-semibold">Notifications</p>
            <p className="text-xs text-muted-foreground">{unread} new updates</p>
          </div>
          <Button size="sm" variant="ghost">Mark all read</Button>
        </div>
        <div className="max-h-96 overflow-y-auto scrollbar-thin">
          {notifications.map((n) => (
            <div key={n.id} className="flex gap-3 border-b px-4 py-3 last:border-b-0 hover:bg-accent/40">
              <div className={cn(
                "mt-1 size-2 shrink-0 rounded-full",
                n.type === "success" && "bg-success",
                n.type === "warning" && "bg-warning",
                n.type === "info" && "bg-info",
                n.type === "approval" && "bg-primary",
              )} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{n.title}</p>
                <p className="line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">{new Date(n.ts).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
