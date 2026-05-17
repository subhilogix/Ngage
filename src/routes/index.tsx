import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { useAuth } from "@/lib/auth";
import { motion } from "framer-motion";
import { ArrowRight, Users, Target, Sparkles, UserCheck, Building } from "lucide-react";
import { GlassCard } from "@/components/widgets/glass-card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: IndexLandingPage,
});

function IndexLandingPage() {
  const { user } = useAuth();

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground flex flex-col justify-between selection:bg-primary/30 selection:text-primary">
      {/* Ambient background particles and meshes */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Glow meshes using CSS radial gradients for 100% bulletproof cross-browser rendering without heavy CPU blurs */}
        <div
          className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] rounded-full opacity-70"
          style={{
            background:
              "radial-gradient(circle at 30% 30%, rgba(168, 85, 247, 0.22) 0%, rgba(139, 92, 246, 0.12) 40%, rgba(0, 0, 0, 0) 70%)",
          }}
        />
        <div
          className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] rounded-full opacity-70"
          style={{
            background:
              "radial-gradient(circle at 70% 70%, rgba(6, 182, 212, 0.18) 0%, rgba(14, 116, 144, 0.08) 40%, rgba(0, 0, 0, 0) 70%)",
          }}
        />

        {/* Futuristic grid overlay with enhanced opacity */}
        <div
          className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:4rem_4rem]"
          style={{
            maskImage: "radial-gradient(ellipse 65% 55% at 50% 50%, #000 70%, transparent 100%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 65% 55% at 50% 50%, #000 70%, transparent 100%)",
          }}
        />
      </div>

      {/* Main Header navigation */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-xl gradient-primary text-white shadow-glow">
            <Target className="size-5" />
          </div>
          <span
            className="text-xl font-bold tracking-tight text-transparent bg-gradient-to-r from-fuchsia-400 to-cyan-400 bg-clip-text"
            style={{ WebkitBackgroundClip: "text", backgroundClip: "text" }}
          >
            Ngage
          </span>
        </div>

        <div className="flex items-center gap-4">
          {!user && (
            <>
              <Link to="/login">
                <Button variant="ghost" className="rounded-xl text-sm font-medium">
                  Sign In
                </Button>
              </Link>
              <Link to="/signup">
                <Button className="rounded-xl text-sm font-medium gradient-primary text-white shadow-glow">
                  Register
                </Button>
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Main Body content */}
      <main className="relative z-10 flex-1 max-w-4xl w-full mx-auto px-6 flex flex-col items-center justify-center text-center py-16 space-y-10">
        {/* Taglines & Details */}
        <div className="space-y-6 flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-4 flex flex-col items-center"
          >
            <div
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
              style={{
                backgroundColor: "rgba(168, 85, 247, 0.12)",
                border: "1px solid rgba(168, 85, 247, 0.25)",
                color: "#c084fc",
              }}
            >
              <Sparkles className="size-3.5 animate-pulse text-[#c084fc]" /> Next-Gen Goal
              Management
            </div>
            <h1
              className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-none text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text"
              style={{ WebkitBackgroundClip: "text", backgroundClip: "text" }}
            >
              Align Teams.
              <br />
              Accelerate Outcomes.
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed text-center">
              Ngage is a high-performance enterprise goal-setting and execution tracking platform
              backed by live data, automated check-ins, and role-based governance.
            </p>
          </motion.div>

          {/* Action Choice Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="grid sm:grid-cols-2 gap-6 w-full max-w-2xl mx-auto text-left pt-4"
          >
            <Link to="/login">
              <GlassCard className="p-6 hover:-translate-y-1 transition duration-300 group cursor-pointer border border-white/5 hover:border-primary/40 relative overflow-hidden bg-card/20 backdrop-blur-md">
                <div className="absolute top-0 right-0 size-20 gradient-primary opacity-5 rounded-bl-full" />
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4 group-hover:scale-110 transition duration-300">
                  <UserCheck className="size-5" />
                </div>
                <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition duration-300">
                  Existing User
                </h3>
                <p className="text-xs text-muted-foreground mt-1 leading-normal">
                  Login to your enterprise workspace and manage your active goals.
                </p>
                <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-primary">
                  Enter Workspace{" "}
                  <ArrowRight className="size-3 group-hover:translate-x-1 transition duration-300" />
                </div>
              </GlassCard>
            </Link>

            <Link to="/signup">
              <GlassCard className="p-6 hover:-translate-y-1 transition duration-300 group cursor-pointer border border-white/5 hover:border-info/40 relative overflow-hidden bg-card/20 backdrop-blur-md">
                <div className="absolute top-0 right-0 size-20 bg-info/5 opacity-5 rounded-bl-full" />
                <div className="flex size-10 items-center justify-center rounded-xl bg-info/10 text-info mb-4 group-hover:scale-110 transition duration-300">
                  <Users className="size-5" />
                </div>
                <h3 className="text-lg font-bold text-foreground group-hover:text-info transition duration-300">
                  New Member
                </h3>
                <p className="text-xs text-muted-foreground mt-1 leading-normal">
                  Create a new employee or manager profile with clean histories.
                </p>
                <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-info">
                  Get Started{" "}
                  <ArrowRight className="size-3 group-hover:translate-x-1 transition duration-300" />
                </div>
              </GlassCard>
            </Link>
          </motion.div>
        </div>
      </main>

      {/* Footer footer
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-8 border-t border-border/20 flex flex-col sm:flex-row gap-4 items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Building className="size-3.5" />

        </div>
        <div className="flex gap-4">
          <span className="hover:text-foreground cursor-pointer transition"></span>
          <span className="hover:text-foreground cursor-pointer transition"></span>
        </div>
      </footer> */}
    </div>
  );
}
