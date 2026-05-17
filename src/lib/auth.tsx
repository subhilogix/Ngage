import * as React from "react";

export type Role = "employee" | "manager" | "admin";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  title: string;
  department: string;
  avatar?: string;
};

const ROLE_USERS: Record<Role, AuthUser> = {
  employee: {
    id: "u-emp-001",
    name: "Aarav Sharma",
    email: "employee@company.com",
    role: "employee",
    title: "Senior Product Engineer",
    department: "Platform Engineering",
  },
  manager: {
    id: "u-mgr-001",
    name: "Meera Iyer",
    email: "manager@company.com",
    role: "manager",
    title: "Engineering Manager",
    department: "Platform Engineering",
  },
  admin: {
    id: "u-adm-001",
    name: "Devika Rao",
    email: "admin@company.com",
    role: "admin",
    title: "HR Operations Lead",
    department: "People & Culture",
  },
};

type AuthCtx = {
  user: AuthUser | null;
  ready: boolean;
  login: (role: Role) => void;
  logout: () => void;
};

const Ctx = React.createContext<AuthCtx | null>(null);

const STORAGE_KEY = "ngage.auth.v1";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch {}
    setReady(true);
  }, []);

  const login = React.useCallback((role: Role) => {
    const u = ROLE_USERS[role];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    setUser(u);
  }, []);

  const logout = React.useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  return <Ctx.Provider value={{ user, ready, login, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
