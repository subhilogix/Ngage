import { eq } from "drizzle-orm";
import { users, goals } from "../../db/schema";

export function enforceAdmin(role: string): string | null {
  if (role !== "admin") {
    return "Unauthorized: Administrative access only";
  }
  return null;
}

export function enforceManager(role: string): string | null {
  if (role !== "manager" && role !== "admin") {
    return "Unauthorized: Managerial access required";
  }
  return null;
}

export async function validateApprovalPermission(
  db: any,
  managerId: string,
  goalId: string,
): Promise<string | null> {
  const [goal] = await db.select().from(goals).where(eq(goals.id, goalId));
  if (!goal) {
    return "Goal not found";
  }

  const [employee] = await db.select().from(users).where(eq(users.id, goal.employeeId));
  if (!employee) {
    return "Associated employee not found";
  }

  const [manager] = await db.select().from(users).where(eq(users.id, managerId));
  if (!manager) {
    return "Manager account not found";
  }

  if (manager.role !== "admin" && employee.managerId !== managerId) {
    return "Unauthorized: You are not designated as this employee's direct manager";
  }

  return null;
}
