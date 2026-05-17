import { createFileRoute, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { useAuth } from "@/lib/auth";
import { authApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlassCard } from "@/components/widgets/glass-card";
import { PageHeader } from "@/components/widgets/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, Key, Building, Loader2, Save, Lock } from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";

export const Route = createFileRoute("/_app/profile")({ component: Profile });

function Profile() {
  const { user, login } = useAuth();
  const nav = useNavigate();

  const [name, setName] = React.useState(user?.name || "");
  const [department, setDepartment] = React.useState(user?.department || "");
  const [title, setTitle] = React.useState(user?.title || "");

  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");

  const updateProfileMutation = useMutation({
    mutationFn: authApi.updateProfile,
    onSuccess: (data) => {
      login(data.user);
      toast.success("Profile updated successfully!");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to update profile.");
    },
  });

  if (!user) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !department) {
      toast.error("Name and Department are required fields.");
      return;
    }
    if (newPassword && newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    if (newPassword && newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }

    updateProfileMutation.mutate({
      name,
      department,
      title,
      newPassword: newPassword || undefined,
      confirmPassword: confirmPassword || undefined,
    });
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Settings"
        title="My Profile"
        description="Manage your profile information, password, and active department settings."
      />

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Side: Summary Card */}
        <div className="md:col-span-1">
          <GlassCard className="p-6 text-center space-y-4">
            <div className="mx-auto flex size-20 items-center justify-center rounded-full gradient-primary text-2xl font-bold text-white shadow-glow">
              {user.name
                ? user.name
                    .split(" ")
                    .map((p) => p[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()
                : "U"}
            </div>
            <div>
              <h3 className="text-xl font-semibold">{user.name}</h3>
              <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">
                {user.role} · {user.title || "Associate"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{user.email}</p>
            </div>
            <div className="pt-4 border-t border-border/60 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Building className="size-3.5" />
              <span>{user.department || "No Department"}</span>
            </div>
          </GlassCard>
        </div>

        {/* Right Side: Editors */}
        <div className="md:col-span-2">
          <GlassCard className="p-6">
            <form onSubmit={submit} className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-lg font-semibold flex items-center gap-2">
                  <User className="size-4 text-primary" /> Profile details
                </h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="profile-name">Full name *</Label>
                    <Input
                      id="profile-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-10 rounded-xl"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="profile-title">Job title</Label>
                    <Input
                      id="profile-title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="h-10 rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="profile-department">Department *</Label>
                  <Select value={department} onValueChange={setDepartment}>
                    <SelectTrigger id="profile-department" className="h-10 rounded-xl">
                      <SelectValue placeholder="Select department" />
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

              <div className="pt-6 border-t border-border/60 space-y-4">
                <h4 className="text-lg font-semibold flex items-center gap-2">
                  <Key className="size-4 text-primary" /> Security & Password
                </h4>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="profile-new-password">New password</Label>
                    <Input
                      id="profile-new-password"
                      type="password"
                      placeholder="Leave blank to keep current"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="h-10 rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="profile-confirm-password">Confirm new password</Label>
                    <Input
                      id="profile-confirm-password"
                      type="password"
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="h-10 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  className="rounded-xl gradient-primary text-white shadow-glow px-6"
                >
                  {updateProfileMutation.isPending ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 size-4" />
                  )}
                  {updateProfileMutation.isPending ? "Saving changes…" : "Save profile changes"}
                </Button>
              </div>
            </form>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
