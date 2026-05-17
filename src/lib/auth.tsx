import * as React from "react";
import { authApi } from "./api";

export type Role = "employee" | "manager" | "admin";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  title?: string;
  department?: string;
  avatar?: string;
};

type AuthCtx = {
  user: AuthUser | null;
  ready: boolean;
  login: (user: AuthUser) => void;
  logout: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<AuthUser | null>>;
};

const Ctx = React.createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    // Fetch current session from server on load
    authApi
      .getMe()
      .then((data) => {
        if (data && data.user) {
          setUser(data.user);
        }
      })
      .catch(() => {
        // Ignore error, just means not logged in
      })
      .finally(() => {
        setReady(true);
      });
  }, []);

  const login = React.useCallback((u: AuthUser) => {
    setUser(u);
  }, []);

  const logout = React.useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
    }
  }, []);

  return <Ctx.Provider value={{ user, ready, login, logout, setUser }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
