import { Lucia } from "lucia";
import { D1Adapter } from "@lucia-auth/adapter-sqlite";

export function initializeLucia(d1: D1Database) {
  const adapter = new D1Adapter(d1, {
    user: "users",
    session: "sessions",
  });

  return new Lucia(adapter, {
    sessionCookie: {
      attributes: {
        // Secure must be true in production, false for local dev
        secure: process.env.NODE_ENV === "production",
      },
    },
    getUserAttributes: (attributes) => {
      return {
        name: attributes.name,
        email: attributes.email,
        role: attributes.role,
        department: attributes.department,
        title: attributes.title,
      };
    },
  });
}

declare module "lucia" {
  interface Register {
    Lucia: ReturnType<typeof initializeLucia>;
    DatabaseUserAttributes: DatabaseUserAttributes;
  }
}

interface DatabaseUserAttributes {
  name: string;
  email: string;
  role: "employee" | "manager" | "admin";
  department: string;
  title: string;
}
