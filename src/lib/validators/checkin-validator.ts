import { eq } from "drizzle-orm";
import { goals } from "../../db/schema";

export async function validateCheckin(
  db: any,
  employeeId: string,
  payload: { goalId: string; quarter: string; progress: number; status: string },
): Promise<string | null> {
  const { goalId, quarter, progress, status } = payload;

  if (!goalId || !quarter || progress === undefined || !status) {
    return "Missing check-in payload fields";
  }

  // Validate quarter
  if (!["Q1", "Q2", "Q3", "Q4"].includes(quarter)) {
    return "Quarter must be Q1, Q2, Q3, or Q4";
  }

  // Validate progress range
  if (progress < 0 || progress > 100) {
    return "Progress percentage must be between 0 and 100";
  }

  // Validate status
  if (!["Not Started", "On Track", "Completed", "At Risk"].includes(status)) {
    return "Invalid status choice";
  }

  // Validate ownership
  const [goal] = await db.select().from(goals).where(eq(goals.id, goalId));
  if (!goal) {
    return "Goal not found";
  }

  if (goal.employeeId !== employeeId) {
    return "Unauthorized: You can only log check-ins for your own goals";
  }

  // Enforce goal must be approved prior to logging check-ins
  if (goal.status !== "approved") {
    return "Check-ins can only be logged for approved goals";
  }

  return null;
}
