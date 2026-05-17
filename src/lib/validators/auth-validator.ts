import { eq } from "drizzle-orm";
import { users } from "../../db/schema";

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export interface AuthRegistrationPayload {
  name: string;
  email: string;
  password?: string;
  confirmPassword?: string;
  department: string;
  title?: string;
  role: string;
}

export async function validateRegistration(
  db: any,
  payload: AuthRegistrationPayload,
): Promise<string | null> {
  const name = (payload.name || "").trim();
  const email = (payload.email || "").trim().toLowerCase();
  const password = payload.password || "";
  const confirmPassword = payload.confirmPassword || "";
  const department = (payload.department || "").trim();
  const role = payload.role;

  if (!name || !email || !password || !confirmPassword || !department) {
    return "All required fields must be supplied";
  }

  if (!validateEmail(email)) {
    return "Invalid work email format";
  }

  if (password.length < 6) {
    return "Password must be at least 6 characters long";
  }

  if (password !== confirmPassword) {
    return "Passwords do not match";
  }

  if (role === "admin") {
    return "Public admin registration is not allowed";
  }

  // Unique email check
  const [existing] = await db.select().from(users).where(eq(users.email, email));
  if (existing) {
    return "Email is already registered";
  }

  return null;
}
