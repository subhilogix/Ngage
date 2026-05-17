import { eq, and, ne } from "drizzle-orm";
import { goals, sharedGoalAssignments } from "../../db/schema";

export async function validateGoalCreation(
  db: any,
  employeeId: string,
  payload: { title: string; weightage: number; thrustArea: string },
): Promise<string | null> {
  const title = (payload.title || "").trim();
  const weightage = Number(payload.weightage);

  if (!title || title.length < 3) {
    return "Goal title must be at least 3 characters long";
  }

  if (weightage < 10) {
    return "Minimum weightage per goal is 10%";
  }

  // Count active goals
  const activeGoals = await db.select().from(goals).where(eq(goals.employeeId, employeeId));
  if (activeGoals.length >= 8) {
    return "Maximum 8 goals allowed per employee";
  }

  // Check duplicate title
  const [duplicate] = await db
    .select()
    .from(goals)
    .where(and(eq(goals.employeeId, employeeId), eq(goals.title, title)));
  if (duplicate) {
    return "A goal with this exact title already exists";
  }

  // Total weightage check
  const currentTotalWeight = activeGoals.reduce(
    (sum: number, g: any) => sum + Number(g.weightage),
    0,
  );
  if (currentTotalWeight + weightage > 100) {
    return `Adding this goal would push total weightage to ${currentTotalWeight + weightage}%, exceeding the 100% limit`;
  }

  return null;
}

export async function validateGoalUpdate(
  db: any,
  goalId: string,
  employeeId: string,
  payload: {
    title?: string;
    description?: string;
    target?: number;
    thrustArea?: string;
    uomType?: string;
    weightage?: number;
    status?: string;
    locked?: boolean;
  },
  actorRole: string,
): Promise<string | null> {
  const [existingGoal] = await db.select().from(goals).where(eq(goals.id, goalId));
  if (!existingGoal) {
    return "Goal not found";
  }

  // Enforce locked goals cannot be edited
  if (existingGoal.locked && actorRole !== "admin") {
    // Managers can adjust ONLY target and weightage during pending goal review
    if (actorRole === "manager" && existingGoal.status === "pending") {
      if (
        payload.title !== undefined ||
        payload.description !== undefined ||
        payload.thrustArea !== undefined ||
        payload.uomType !== undefined
      ) {
        return "Managers can only adjust goal target or weightage during review";
      }
    } else {
      // If not manager reviewing pending goal, block all modifications
      if (
        (payload.title !== undefined && payload.title !== existingGoal.title) ||
        (payload.description !== undefined && payload.description !== existingGoal.description) ||
        (payload.thrustArea !== undefined && payload.thrustArea !== existingGoal.thrustArea) ||
        (payload.uomType !== undefined && payload.uomType !== existingGoal.uomType) ||
        (payload.target !== undefined && payload.target !== existingGoal.target) ||
        (payload.weightage !== undefined &&
          Number(payload.weightage) !== Number(existingGoal.weightage))
      ) {
        return "Locked goals cannot be modified";
      }
    }
  }

  // Check if it's a cloned shared goal
  const [sharedAssignment] = await db
    .select()
    .from(sharedGoalAssignments)
    .where(eq(sharedGoalAssignments.goalId, goalId));

  if (sharedAssignment && actorRole === "employee") {
    // Cloned shared goals: Employees can edit weightage & deadline, but cannot edit title, description, thrustArea, target, uomType.
    if (
      (payload.title !== undefined && payload.title !== existingGoal.title) ||
      (payload.description !== undefined && payload.description !== existingGoal.description) ||
      (payload.thrustArea !== undefined && payload.thrustArea !== existingGoal.thrustArea) ||
      (payload.target !== undefined && payload.target !== existingGoal.target) ||
      (payload.uomType !== undefined && payload.uomType !== existingGoal.uomType)
    ) {
      return "You cannot modify the title, target, KPI description, thrust area, or UoM of a shared goal.";
    }
  }

  // If modifying title, check duplicates and length
  if (payload.title !== undefined) {
    const title = payload.title.trim();
    if (title.length < 3) {
      return "Goal title must be at least 3 characters long";
    }
    const [duplicate] = await db
      .select()
      .from(goals)
      .where(and(eq(goals.employeeId, employeeId), eq(goals.title, title), ne(goals.id, goalId)));
    if (duplicate) {
      return "A goal with this exact title already exists";
    }
  }

  // If modifying weightage, check total weightage constraint
  if (payload.weightage !== undefined) {
    const newWeight = Number(payload.weightage);
    if (newWeight < 10) {
      return "Minimum weightage per goal is 10%";
    }
    const allGoals = await db.select().from(goals).where(eq(goals.employeeId, employeeId));
    const otherGoalsWeight = allGoals
      .filter((g: any) => g.id !== goalId)
      .reduce((sum: number, g: any) => sum + Number(g.weightage), 0);
    if (otherGoalsWeight + newWeight > 100) {
      return `Total weightage cannot exceed 100% (currently: ${otherGoalsWeight + newWeight}%)`;
    }
  }

  // If submitting (status: "pending")
  if (payload.status === "pending") {
    // 1. Verify title is valid (min 3 characters)
    const titleVal = payload.title !== undefined ? payload.title : existingGoal.title;
    if (!titleVal || titleVal.trim().length < 3) {
      return "Goal title must be at least 3 characters long";
    }

    // 2. Verify weightage is valid (min 10%)
    const weightVal =
      payload.weightage !== undefined ? Number(payload.weightage) : Number(existingGoal.weightage);
    if (weightVal < 10) {
      return "Minimum weightage per goal is 10%";
    }

    // 3. Verify total weightage across all goals is exactly 100%
    const allGoals = await db.select().from(goals).where(eq(goals.employeeId, employeeId));
    const updatedGoalsMap = allGoals.map((g: any) => {
      if (g.id === goalId) {
        return {
          ...g,
          weightage: weightVal,
        };
      }
      return g;
    });

    const newTotalWeight = updatedGoalsMap.reduce(
      (sum: number, g: any) => sum + Number(g.weightage),
      0,
    );
    if (newTotalWeight !== 100) {
      return `Total goal weightage must equal 100% before submission (current total is ${newTotalWeight}%)`;
    }

    // 4. Verify total number of goals does not exceed 8
    if (allGoals.length > 8) {
      return "Maximum 8 goals allowed";
    }
  }

  return null;
}

export async function validateGoalDeletion(db: any, goalId: string): Promise<string | null> {
  const [existingGoal] = await db.select().from(goals).where(eq(goals.id, goalId));
  if (!existingGoal) {
    return "Goal not found";
  }
  if (existingGoal.locked) {
    return "Locked goals cannot be deleted";
  }
  return null;
}
