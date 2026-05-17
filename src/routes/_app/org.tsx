import { createFileRoute, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { PageHeader } from "@/components/widgets/page-header";
import { GlassCard } from "@/components/widgets/glass-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Building2, ShieldCheck, Loader2, Search, Edit3, Check, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/api";

export const Route = createFileRoute("/_app/org")({ component: OrgPage });

function OrgPage() {
  const { user, ready } = useAuth();
  const nav = useNavigate();
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (ready && (!user || user.role !== "admin")) {
      toast.error("Access Denied: Administrative privilege required.");
      nav({ to: "/dashboard" });
    }
  }, [ready, user, nav]);

  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedRole, setSelectedRole] = React.useState<string>("all");
  const [selectedDept, setSelectedDept] = React.useState<string>("all");

  // Track editing state
  const [editingUserId, setEditingUserId] = React.useState<string | null>(null);
  const [editForm, setEditForm] = React.useState({
    role: "",
    department: "",
    title: "",
    managerId: "",
  });

  const { data: allUsers = [], isLoading } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: adminApi.getUsers,
    enabled: ready && user?.role === "admin",
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => adminApi.updateUser(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success("User profile and hierarchy updated successfully!");
      setEditingUserId(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to update user profile.");
    },
  });

  if (!ready || !user || user.role !== "admin") {
    return (
      <div className="grid h-72 place-items-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  // Get distinct departments and potential managers
  const departments = Array.from(
    new Set(allUsers.map((u: any) => u.department).filter(Boolean)),
  ) as string[];
  const potentialManagers = allUsers.filter((u: any) => u.role === "manager" || u.role === "admin");

  const filteredUsers = allUsers.filter((u: any) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.title || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = selectedRole === "all" || u.role === selectedRole;
    const matchesDept = selectedDept === "all" || u.department === selectedDept;
    return matchesSearch && matchesRole && matchesDept;
  });

  const startEditing = (u: any) => {
    setEditingUserId(u.id);
    setEditForm({
      role: u.role,
      department: u.department || "",
      title: u.title || "",
      managerId: u.managerId || "",
    });
  };

  const handleSave = (userId: string) => {
    updateUserMutation.mutate({
      id: userId,
      payload: editForm,
    });
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Organization"
        title="People & structure"
        description="View live staff directories, manage departments, designate reporting hierarchies, and alter governance roles."
      />

      {/* Stats Overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <GlassCard className="p-5 border-white/5 bg-background/30">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Total Directory Size
          </p>
          <p className="text-3xl font-extrabold tracking-tight mt-1">{allUsers.length}</p>
        </GlassCard>
        <GlassCard className="p-5 border-white/5 bg-background/30">
          <p className="text-xs uppercase tracking-widest text-emerald-400">Active Employees</p>
          <p className="text-3xl font-extrabold tracking-tight mt-1 text-emerald-400">
            {allUsers.filter((u: any) => u.role === "employee").length}
          </p>
        </GlassCard>
        <GlassCard className="p-5 border-white/5 bg-background/30">
          <p className="text-xs uppercase tracking-widest text-primary">Designated Managers</p>
          <p className="text-3xl font-extrabold tracking-tight mt-1 text-primary">
            {allUsers.filter((u: any) => u.role === "manager").length}
          </p>
        </GlassCard>
        <GlassCard className="p-5 border-white/5 bg-background/30">
          <p className="text-xs uppercase tracking-widest text-amber-400">System Administrators</p>
          <p className="text-3xl font-extrabold tracking-tight mt-1 text-amber-400">
            {allUsers.filter((u: any) => u.role === "admin").length}
          </p>
        </GlassCard>
      </div>

      {/* Directory Filters */}
      <GlassCard className="p-6 border-white/5 bg-background/40">
        <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search staff members by name, email, or job title..."
              className="h-10 rounded-xl pl-9 bg-background/20"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="h-10 px-3 rounded-xl border border-white/10 bg-background/40 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Roles</option>
              <option value="employee">Employees</option>
              <option value="manager">Managers</option>
              <option value="admin">Administrators</option>
            </select>

            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="h-10 px-3 rounded-xl border border-white/10 bg-background/40 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Directory Listing Table */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Syncing enterprise directory...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-white/10 rounded-2xl mt-6">
            <Building2 className="size-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-semibold">No active staff records found</p>
            <p className="text-xs text-muted-foreground mt-1">
              Try adjusting your query or filter configurations.
            </p>
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto w-full rounded-2xl border border-white/5 bg-background/10">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-widest text-muted-foreground bg-white/[0.02]">
                <tr className="border-b border-white/5">
                  <th className="py-3 px-4 text-left">Staff Member</th>
                  <th className="py-3 px-4 text-left">Job Title</th>
                  <th className="py-3 px-4 text-left">Department</th>
                  <th className="py-3 px-4 text-left">System Role</th>
                  <th className="py-3 px-4 text-left">Reporting Line</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u: any) => {
                  const isEditing = editingUserId === u.id;
                  const managerUser = allUsers.find((p: any) => p.id === u.managerId);

                  return (
                    <tr
                      key={u.id}
                      className="border-b border-white/5 last:border-b-0 hover:bg-white/[0.01] transition-colors"
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="size-9 border border-white/10">
                            <AvatarFallback className="gradient-primary text-xs text-white font-bold">
                              {u.name
                                .split(" ")
                                .map((p: string) => p[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold text-foreground">{u.name}</p>
                            <p className="text-xs text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        {isEditing ? (
                          <Input
                            value={editForm.title}
                            onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                            className="h-8 max-w-[180px] bg-background/30 rounded-lg text-xs"
                          />
                        ) : (
                          <span className="text-xs text-foreground/80">{u.title || "—"}</span>
                        )}
                      </td>

                      <td className="py-4 px-4">
                        {isEditing ? (
                          <select
                            value={editForm.department}
                            onChange={(e) =>
                              setEditForm({ ...editForm, department: e.target.value })
                            }
                            className="h-8 px-2 rounded-lg border border-white/10 bg-background text-xs focus:outline-none"
                          >
                            <option value="">No Department</option>
                            <option value="Platform Engineering">Platform Engineering</option>
                            <option value="Infrastructure">Infrastructure</option>
                            <option value="Product Development">Product Development</option>
                            <option value="Human Resources">Human Resources</option>
                            <option value="Sales & Marketing">Sales & Marketing</option>
                            <option value="Customer Success">Customer Success</option>
                          </select>
                        ) : (
                          <span className="text-xs font-medium text-foreground">
                            {u.department || "—"}
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4">
                        {isEditing ? (
                          <select
                            value={editForm.role}
                            onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                            className="h-8 px-2 rounded-lg border border-white/10 bg-background text-xs focus:outline-none font-semibold text-primary"
                          >
                            <option value="employee">Employee</option>
                            <option value="manager">Manager</option>
                            <option value="admin">Administrator</option>
                          </select>
                        ) : (
                          <span
                            className={`text-[10px] uppercase tracking-wider font-extrabold font-mono px-2 py-0.5 rounded ${
                              u.role === "admin"
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                : u.role === "manager"
                                  ? "bg-primary/10 text-primary border border-primary/20"
                                  : "bg-muted text-muted-foreground border border-white/5"
                            }`}
                          >
                            {u.role}
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4">
                        {isEditing ? (
                          <select
                            value={editForm.managerId}
                            onChange={(e) =>
                              setEditForm({ ...editForm, managerId: e.target.value })
                            }
                            className="h-8 px-2 rounded-lg border border-white/10 bg-background text-xs focus:outline-none"
                          >
                            <option value="">No Manager (Independent)</option>
                            {potentialManagers
                              .filter((mgr: any) => mgr.id !== u.id) // Avoid self-loop
                              .map((mgr: any) => (
                                <option key={mgr.id} value={mgr.id}>
                                  {mgr.name} ({mgr.role})
                                </option>
                              ))}
                          </select>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {managerUser ? `Managed by ${managerUser.name}` : "—"}
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSave(u.id)}
                              disabled={updateUserMutation.isPending}
                              className="size-8 p-0 rounded-lg bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white"
                            >
                              <Check className="size-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingUserId(null)}
                              className="size-8 p-0 rounded-lg bg-destructive/10 border-destructive/20 text-destructive hover:bg-destructive hover:text-white"
                            >
                              <X className="size-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startEditing(u)}
                            className="size-8 p-0 rounded-lg border-white/10 hover:bg-white/5 text-muted-foreground hover:text-foreground"
                          >
                            <Edit3 className="size-3.5" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* Governance Guidelines */}
      <GlassCard className="p-6 flex items-start gap-4">
        <div className="size-10 rounded-xl gradient-primary text-white grid place-items-center shrink-0 shadow-glow">
          <ShieldCheck className="size-5" />
        </div>
        <div className="space-y-1">
          <h4 className="text-base font-semibold">Security Governance Override Protocol</h4>
          <p className="text-xs text-muted-foreground leading-normal max-w-3xl">
            As a system administrator, you have strict bypass access to modify reporting structures
            and reallocate user roles across the portal. Any modifications will write explicit,
            hashed logs to the D1 security audit ledger, which are instantly inspectable from the
            Audit Trail interface.
          </p>
        </div>
      </GlassCard>
    </div>
  );
}
