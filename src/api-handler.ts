import { getDb } from "./db";
import {
  users,
  goals,
  checkins,
  approvals,
  notifications,
  auditLogs,
  comments,
  sharedGoals,
  sharedGoalAssignments,
  quarterOverrides,
} from "./db/schema";
import { eq, and, or, inArray, desc, ne, like } from "drizzle-orm";
import * as bcrypt from "bcryptjs";
import { initializeLucia } from "./lib/server/auth";
import { apiSuccess, apiError } from "./lib/errors";
import { createAuditLog } from "./lib/audit";
import { validateRegistration } from "./lib/validators/auth-validator";
import {
  validateGoalCreation,
  validateGoalUpdate,
  validateGoalDeletion,
} from "./lib/validators/goal-validator";
import { validateCheckin } from "./lib/validators/checkin-validator";
import {
  enforceAdmin,
  enforceManager,
  validateApprovalPermission,
} from "./lib/validators/permission-validator";
import { isQuarterWindowOpen, isDefaultWindowOpen, type QuarterPeriod } from "./lib/checkin-window";
import { generateCSV } from "./lib/export/csv";

let cachedEnv: any = null;

export async function handleApiRequest(request: Request, env: any): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  let actualEnv = env;

  // Local development fallback to get Cloudflare bindings
  if (!actualEnv?.DB && process.env.NODE_ENV !== "production") {
    if (cachedEnv) {
      actualEnv = cachedEnv;
    } else {
      try {
        const { getPlatformProxy } = await import("wrangler");
        const proxy = await getPlatformProxy();
        cachedEnv = proxy.env;
        actualEnv = cachedEnv;
      } catch (e) {
        console.warn("Could not load wrangler proxy", e);
      }
    }
  }

  if (!actualEnv?.DB) {
    return apiError("Database not configured", 500);
  }

  const db = getDb(actualEnv.DB);
  const lucia = initializeLucia(actualEnv.DB);

  try {
    // ----------------------------------------------------
    // UNPROTECTED ROUTES (No Session Required)
    // ----------------------------------------------------

    // POST /api/login
    if (path === "/api/login" && method === "POST") {
      const { email, password } = (await request.json()) as any;
      if (!email || !password) {
        return apiError("Email and password are required", 400);
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email.trim().toLowerCase()));

      if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        return apiError("Invalid credentials", 401);
      }

      const session = await lucia.createSession(user.id, {});
      const sessionCookie = lucia.createSessionCookie(session.id);

      return apiSuccess(
        {
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            name: user.name,
            title: user.title,
            department: user.department,
          },
        },
        200,
        { "Set-Cookie": sessionCookie.serialize() },
      );
    }

    // POST /api/seed (Hackathon Convenience Endpoint - Kept for Judges)
    if (path === "/api/seed" && method === "POST") {
      const passwordHash = await bcrypt.hash("demo1234", 10);

      const adminId = "u-adm-001";
      const mgr1Id = "u-mgr-001";
      const emp1Id = "u-emp-001";

      await db
        .insert(users)
        .values([
          {
            id: adminId,
            name: "Devika Rao",
            email: "admin@company.com",
            passwordHash,
            role: "admin",
            department: "People & Culture",
            title: "HR Operations Lead",
            createdAt: new Date(),
          },
          {
            id: mgr1Id,
            name: "Meera Iyer",
            email: "manager@company.com",
            passwordHash,
            role: "manager",
            department: "Platform Engineering",
            title: "Engineering Manager",
            createdAt: new Date(),
          },
          {
            id: emp1Id,
            name: "Aarav Sharma",
            email: "employee@company.com",
            passwordHash,
            role: "employee",
            department: "Platform Engineering",
            title: "Senior Product Engineer",
            managerId: mgr1Id,
            createdAt: new Date(),
          },
        ])
        .onConflictDoNothing();

      // Seed a goal
      await db
        .insert(goals)
        .values([
          {
            id: "g-001",
            employeeId: emp1Id,
            title: "Migrate auth to Lucia",
            description: "Implement edge-compatible auth",
            thrustArea: "Engineering Excellence",
            uomType: "percentage",
            target: 100,
            weightage: 50,
            status: "approved",
            locked: true,
            createdAt: new Date(),
          },
        ])
        .onConflictDoNothing();

      return apiSuccess({ success: true, message: "Database seeded!" });
    }

    // POST /api/register (Connecting Real Registration Validation)
    if (path === "/api/register" && method === "POST") {
      const body = (await request.json()) as any;

      // Perform server-side validation
      const regError = await validateRegistration(db, body);
      if (regError) {
        return apiError(regError, 400);
      }

      const { name, email, password, department, title, role } = body;
      const userId = "u-" + crypto.randomUUID().slice(0, 8);
      const passwordHash = await bcrypt.hash(password, 10);

      // Determine manager assignment if none specified (link employee to manager@company.com manager for seed convenience)
      let managerId: string | null = null;
      if (role === "employee") {
        if (body.managerId) {
          managerId = body.managerId;
        } else {
          const [mgr] = await db.select().from(users).where(eq(users.email, "manager@company.com"));
          if (mgr) {
            managerId = mgr.id;
          }
        }
      }

      // Insert new user
      await db.insert(users).values({
        id: userId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        passwordHash,
        role: role === "manager" ? "manager" : "employee",
        department: department.trim(),
        title: (title || "").trim() || (role === "manager" ? "Team Lead" : "Associate"),
        managerId,
        createdAt: new Date(),
      });

      // Create Lucia Session
      const session = await lucia.createSession(userId, {});
      const sessionCookie = lucia.createSessionCookie(session.id);

      return apiSuccess(
        {
          user: {
            id: userId,
            email: email.trim().toLowerCase(),
            role: role === "manager" ? "manager" : "employee",
            name: name.trim(),
            title: (title || "").trim() || (role === "manager" ? "Team Lead" : "Associate"),
            department: department.trim(),
          },
        },
        201,
        { "Set-Cookie": sessionCookie.serialize() },
      );
    }

    // GET /api/public/managers (Public endpoint for signup select dropdown)
    if (path === "/api/public/managers" && method === "GET") {
      const list = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          department: users.department,
        })
        .from(users)
        .where(eq(users.role, "manager"));
      return apiSuccess(list);
    }

    // ----------------------------------------------------
    // SESSION VERIFICATION & AUTHENTICATION GUARD
    // ----------------------------------------------------
    const cookieHeader = request.headers.get("Cookie") || "";
    const sessionId = lucia.readSessionCookie(cookieHeader);

    let sessionUser: any = null;
    let currentSession: any = null;

    if (sessionId) {
      const { session, user } = await lucia.validateSession(sessionId);
      if (session) {
        currentSession = session;
        const [dbUser] = await db.select().from(users).where(eq(users.id, user.id));
        if (dbUser) {
          sessionUser = dbUser;
        }
      }
    }

    // If no valid session user found, reject standard requests
    if (!sessionUser) {
      if (path === "/api/me" && method === "GET") {
        return apiSuccess({ user: null });
      }
      return apiError("Unauthorized", 401);
    }

    // ----------------------------------------------------
    // PROTECTED ROUTES
    // ----------------------------------------------------

    // GET /api/me
    if (path === "/api/me" && method === "GET") {
      return apiSuccess({
        user: {
          id: sessionUser.id,
          email: sessionUser.email,
          role: sessionUser.role,
          name: sessionUser.name,
          title: sessionUser.title,
          department: sessionUser.department,
        },
      });
    }

    // POST /api/logout
    if (path === "/api/logout" && method === "POST") {
      if (currentSession) {
        await lucia.invalidateSession(currentSession.id);
      }
      const blankCookie = lucia.createBlankSessionCookie();
      return apiSuccess({ success: true }, 200, {
        "Set-Cookie": blankCookie.serialize(),
      });
    }

    // PUT /api/profile (Profiles validations & audits)
    if (path === "/api/profile" && method === "PUT") {
      const { name, department, title, newPassword, confirmPassword } =
        (await request.json()) as any;

      const updates: any = {};
      if (name) updates.name = name.trim();
      if (department) updates.department = department.trim();
      if (title !== undefined) updates.title = title.trim();

      if (newPassword) {
        if (newPassword !== confirmPassword) {
          return apiError("Passwords do not match", 400);
        }
        if (newPassword.length < 6) {
          return apiError("Password must be at least 6 characters long", 400);
        }
        updates.passwordHash = await bcrypt.hash(newPassword, 10);
      }

      if (Object.keys(updates).length > 0) {
        await db.update(users).set(updates).where(eq(users.id, sessionUser.id));
        await createAuditLog(
          db,
          sessionUser.id,
          "UPDATE_PROFILE",
          "users",
          sessionUser.id,
          sessionUser,
          updates,
        );
      }

      const [updatedUser] = await db.select().from(users).where(eq(users.id, sessionUser.id));

      return apiSuccess({
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          role: updatedUser.role,
          name: updatedUser.name,
          title: updatedUser.title,
          department: updatedUser.department,
        },
      });
    }

    // GET /api/goals
    if (path === "/api/goals" && method === "GET") {
      let userGoals: any[] = [];

      if (sessionUser.role === "employee") {
        userGoals = await db
          .select({
            id: goals.id,
            employeeId: goals.employeeId,
            title: goals.title,
            description: goals.description,
            thrustArea: goals.thrustArea,
            uomType: goals.uomType,
            target: goals.target,
            weightage: goals.weightage,
            status: goals.status,
            locked: goals.locked,
            deadline: goals.deadline,
            createdAt: goals.createdAt,
            sharedGoalId: sharedGoalAssignments.sharedGoalId,
          })
          .from(goals)
          .leftJoin(sharedGoalAssignments, eq(goals.id, sharedGoalAssignments.goalId))
          .where(eq(goals.employeeId, sessionUser.id));
      } else if (sessionUser.role === "manager") {
        const directReports = await db
          .select()
          .from(users)
          .where(eq(users.managerId, sessionUser.id));
        const employeeIds = directReports.map((u) => u.id).concat(sessionUser.id);

        if (employeeIds.length > 0) {
          userGoals = await db
            .select({
              id: goals.id,
              employeeId: goals.employeeId,
              title: goals.title,
              description: goals.description,
              thrustArea: goals.thrustArea,
              uomType: goals.uomType,
              target: goals.target,
              weightage: goals.weightage,
              status: goals.status,
              locked: goals.locked,
              deadline: goals.deadline,
              createdAt: goals.createdAt,
              sharedGoalId: sharedGoalAssignments.sharedGoalId,
            })
            .from(goals)
            .leftJoin(sharedGoalAssignments, eq(goals.id, sharedGoalAssignments.goalId))
            .where(inArray(goals.employeeId, employeeIds));
        } else {
          userGoals = [];
        }
      } else {
        userGoals = await db
          .select({
            id: goals.id,
            employeeId: goals.employeeId,
            title: goals.title,
            description: goals.description,
            thrustArea: goals.thrustArea,
            uomType: goals.uomType,
            target: goals.target,
            weightage: goals.weightage,
            status: goals.status,
            locked: goals.locked,
            deadline: goals.deadline,
            createdAt: goals.createdAt,
            sharedGoalId: sharedGoalAssignments.sharedGoalId,
          })
          .from(goals)
          .leftJoin(sharedGoalAssignments, eq(goals.id, sharedGoalAssignments.goalId));
      }

      // Fetch latest check-ins to enrich goals with progress
      const allCheckins = await db.select().from(checkins).orderBy(desc(checkins.updatedAt));
      const latestCheckinMap = new Map<string, number>();
      for (const chk of allCheckins) {
        if (!latestCheckinMap.has(chk.goalId)) {
          latestCheckinMap.set(chk.goalId, chk.progress);
        }
      }

      // Enrich employee details & progress
      const allUsers = await db.select().from(users);
      const userMap = new Map(allUsers.map((u) => [u.id, u]));

      const enrichedGoals = userGoals.map((g) => ({
        ...g,
        progress: latestCheckinMap.get(g.id) || 0,
        employeeName: userMap.get(g.employeeId)?.name || "Unknown",
        employeeEmail: userMap.get(g.employeeId)?.email || "Unknown",
        employeeDepartment: userMap.get(g.employeeId)?.department || "Unknown",
      }));

      return apiSuccess(enrichedGoals);
    }

    // POST /api/goals (Goal validations & audits)
    if (path === "/api/goals" && method === "POST") {
      const body = (await request.json()) as any;
      const employeeId =
        sessionUser.role === "employee" ? sessionUser.id : body.employeeId || sessionUser.id;

      // Server-side validation
      const goalErr = await validateGoalCreation(db, employeeId, body);
      if (goalErr) {
        return apiError(goalErr, 400);
      }

      // Check quarterly gate limits
      if (sessionUser.role !== "admin") {
        const windowOpen = await isQuarterWindowOpen(db, quarterOverrides, eq, "GOAL_SETTING");
        if (!windowOpen) {
          return apiError(
            "Goal Setting Period is currently closed. Submissions are disabled.",
            403,
          );
        }
      }

      const newGoal = {
        id: "g-" + crypto.randomUUID().slice(0, 8),
        employeeId,
        title: body.title.trim(),
        description: (body.description || "").trim(),
        thrustArea: body.thrustArea || "Other",
        uomType: body.uomType || "percentage",
        target: Number(body.target || 100),
        weightage: Number(body.weightage),
        status: "draft",
        locked: false,
        deadline: body.deadline ? new Date(body.deadline) : null,
        createdAt: new Date(),
      };

      await db.insert(goals).values(newGoal);
      await createAuditLog(db, sessionUser.id, "CREATE_GOAL", "GOAL", newGoal.id, null, newGoal);

      return apiSuccess({ goal: newGoal });
    }

    // PUT /api/goals/:id (Goal Update validations & audits)
    if (path.startsWith("/api/goals/") && method === "PUT") {
      const goalId = path.split("/").pop();
      if (!goalId) return apiError("Invalid Goal ID", 400);

      const [existingGoal] = await db.select().from(goals).where(eq(goals.id, goalId));
      if (!existingGoal) {
        return apiError("Goal not found", 404);
      }

      // Check permissions
      if (sessionUser.role === "employee" && existingGoal.employeeId !== sessionUser.id) {
        return apiError("Forbidden", 403);
      }

      // Check if this goal is a shared goal child
      const [linkage] = await db
        .select()
        .from(sharedGoalAssignments)
        .where(eq(sharedGoalAssignments.goalId, goalId));

      const body = (await request.json()) as any;

      if (linkage && sessionUser.role === "employee") {
        const forbiddenKeys = ["title", "description", "target", "uomType", "thrustArea"];
        const attemptedBreach = forbiddenKeys.some(
          (key) =>
            body[key] !== undefined &&
            String(body[key]).trim() !==
              String(existingGoal[key as keyof typeof existingGoal]).trim(),
        );
        if (attemptedBreach) {
          return apiError(
            "Departmental KPIs and shared goal titles, targets, and descriptions are read-only for assignees.",
            403,
          );
        }
      }

      // Perform server-side validation
      const goalUpErr = await validateGoalUpdate(
        db,
        goalId,
        existingGoal.employeeId,
        body,
        sessionUser.role,
      );
      if (goalUpErr) {
        return apiError(goalUpErr, 400);
      }

      const updatedFields: any = {};
      if (body.title !== undefined) updatedFields.title = body.title.trim();
      if (body.description !== undefined) updatedFields.description = body.description.trim();
      if (body.thrustArea !== undefined) updatedFields.thrustArea = body.thrustArea;
      if (body.uomType !== undefined) updatedFields.uomType = body.uomType;
      if (body.target !== undefined) updatedFields.target = Number(body.target);
      if (body.weightage !== undefined) updatedFields.weightage = Number(body.weightage);
      if (body.status !== undefined) updatedFields.status = body.status;

      let isUnlock = false;
      if (body.locked !== undefined) {
        if (existingGoal.locked && body.locked === false) {
          if (sessionUser.role !== "admin") {
            return apiError("Only administrators can unlock goals.", 403);
          }
          updatedFields.locked = false;
          updatedFields.status = "draft";
          isUnlock = true;

          // Notify employee
          await db.insert(notifications).values({
            id: "nt-" + crypto.randomUUID().slice(0, 8),
            userId: existingGoal.employeeId,
            message: `Your goal plan "${existingGoal.title}" has been unlocked for edits by an administrator.`,
            type: "GOAL_UNLOCKED",
            read: false,
            createdAt: new Date(),
          });
        } else {
          updatedFields.locked = body.locked;
        }
      }

      if (body.deadline !== undefined)
        updatedFields.deadline = body.deadline ? new Date(body.deadline) : null;

      await db.update(goals).set(updatedFields).where(eq(goals.id, goalId));
      await createAuditLog(
        db,
        sessionUser.id,
        isUnlock ? "UNLOCK_GOAL" : "UPDATE_GOAL",
        "GOAL",
        goalId,
        existingGoal,
        updatedFields,
      );

      // Trigger notification if submitted (status === "pending")
      if (updatedFields.status === "pending" && existingGoal.status !== "pending") {
        const [employeeUser] = await db
          .select()
          .from(users)
          .where(eq(users.id, existingGoal.employeeId));
        if (employeeUser && employeeUser.managerId) {
          const [existingNotif] = await db
            .select()
            .from(notifications)
            .where(
              and(
                eq(notifications.userId, employeeUser.managerId),
                eq(notifications.type, "goal_submission"),
                eq(notifications.read, false),
                like(notifications.message, `%${employeeUser.name}%`),
              ),
            );

          if (!existingNotif) {
            await db.insert(notifications).values({
              id: "nt-" + crypto.randomUUID().slice(0, 8),
              userId: employeeUser.managerId,
              message: `Employee ${employeeUser.name} has submitted a new goal plan for approval.`,
              type: "goal_submission",
              read: false,
              createdAt: new Date(),
            });
          }
        }
      }

      return apiSuccess({ success: true, message: "Goal updated successfully" });
    }

    // DELETE /api/goals/:id (Goal Deletion validations & audits)
    if (path.startsWith("/api/goals/") && method === "DELETE") {
      const goalId = path.split("/").pop();
      if (!goalId) return apiError("Invalid Goal ID", 400);

      const [existingGoal] = await db.select().from(goals).where(eq(goals.id, goalId));
      if (!existingGoal) {
        return apiError("Goal not found", 404);
      }

      if (sessionUser.role === "employee" && existingGoal.employeeId !== sessionUser.id) {
        return apiError("Forbidden", 403);
      }

      // Perform server-side validation
      const delErr = await validateGoalDeletion(db, goalId);
      if (delErr) {
        return apiError(delErr, 400);
      }

      await db.delete(goals).where(eq(goals.id, goalId));
      await createAuditLog(db, sessionUser.id, "DELETE_GOAL", "GOAL", goalId, existingGoal, null);

      return apiSuccess({ success: true, message: "Goal deleted successfully" });
    }

    // ----------------------------------------------------
    // GOAL APPROVALS & WORKFLOW ENDPOINTS (Permissions & Audits)
    // ----------------------------------------------------

    // POST /api/goals/:id/approve
    // POST /api/goals/:id/approve
    if (path.endsWith("/approve") && method === "POST") {
      const goalId = path.split("/")[3];
      let body: any = {};
      try {
        body = (await request.json()) as any;
      } catch (e) {}

      // Perform permission checks
      const permErr = await validateApprovalPermission(db, sessionUser.id, goalId);
      if (permErr) {
        return apiError(permErr, 403);
      }

      const [goal] = await db.select().from(goals).where(eq(goals.id, goalId));
      if (!goal) {
        return apiError("Goal not found", 404);
      }



      await db.update(goals).set({ status: "approved", locked: true }).where(eq(goals.id, goalId));

      await db.insert(approvals).values({
        id: "ap-" + crypto.randomUUID().slice(0, 8),
        goalId,
        managerId: sessionUser.id,
        status: "approved",
        feedback: body.feedback || "Approved by manager",
        updatedAt: new Date(),
      });

      await db.insert(notifications).values({
        id: "nt-" + crypto.randomUUID().slice(0, 8),
        userId: goal.employeeId,
        message: `Your goal "${goal.title}" has been approved!`,
        type: "goal_approved",
        read: false,
        createdAt: new Date(),
      });

      await createAuditLog(db, sessionUser.id, "APPROVE_GOAL", "GOAL", goalId, null, {
        status: "approved",
        feedback: body.feedback,
      });
      return apiSuccess({ success: true, message: "Goal approved successfully" });
    }

    // POST /api/goals/:id/reject
    if (path.endsWith("/reject") && method === "POST") {
      const goalId = path.split("/")[3];
      const body = (await request.json()) as any;

      const permErr = await validateApprovalPermission(db, sessionUser.id, goalId);
      if (permErr) {
        return apiError(permErr, 403);
      }

      const [goal] = await db.select().from(goals).where(eq(goals.id, goalId));

      await db.update(goals).set({ status: "rejected", locked: false }).where(eq(goals.id, goalId));

      await db.insert(approvals).values({
        id: "ap-" + crypto.randomUUID().slice(0, 8),
        goalId,
        managerId: sessionUser.id,
        status: "rejected",
        feedback: body.feedback || "Rejected",
        updatedAt: new Date(),
      });

      await db.insert(notifications).values({
        id: "nt-" + crypto.randomUUID().slice(0, 8),
        userId: goal.employeeId,
        message: `Your goal "${goal.title}" was rejected: ${body.feedback || "No feedback"}`,
        type: "goal_rejected",
        read: false,
        createdAt: new Date(),
      });

      await createAuditLog(db, sessionUser.id, "REJECT_GOAL", "GOAL", goalId, null, {
        status: "rejected",
        feedback: body.feedback,
      });
      return apiSuccess({ success: true, message: "Goal rejected successfully" });
    }

    // POST /api/goals/:id/rework
    if (path.endsWith("/rework") && method === "POST") {
      const goalId = path.split("/")[3];
      const body = (await request.json()) as any;

      const permErr = await validateApprovalPermission(db, sessionUser.id, goalId);
      if (permErr) {
        return apiError(permErr, 403);
      }

      const [goal] = await db.select().from(goals).where(eq(goals.id, goalId));

      await db
        .update(goals)
        .set({ status: "rework_requested", locked: false })
        .where(eq(goals.id, goalId));

      await db.insert(approvals).values({
        id: "ap-" + crypto.randomUUID().slice(0, 8),
        goalId,
        managerId: sessionUser.id,
        status: "rework_requested",
        feedback: body.feedback || "Rework requested",
        updatedAt: new Date(),
      });

      // Insert discussion thread history comment for employee reference
      await db.insert(comments).values({
        id: "comm-" + crypto.randomUUID().slice(0, 8),
        userId: sessionUser.id,
        entityType: "goal",
        entityId: goalId,
        message: `[Rework Requested]: ${body.feedback || "Please adjust goal details."}`,
        createdAt: new Date(),
      });

      await db.insert(notifications).values({
        id: "nt-" + crypto.randomUUID().slice(0, 8),
        userId: goal.employeeId,
        message: `Rework requested for your goal "${goal.title}": ${body.feedback}`,
        type: "rework_requested",
        read: false,
        createdAt: new Date(),
      });

      await createAuditLog(db, sessionUser.id, "REWORK_GOAL", "GOAL", goalId, null, {
        status: "rework_requested",
        feedback: body.feedback,
      });
      return apiSuccess({ success: true, message: "Rework requested successfully" });
    }

    // POST /api/goals/:id/complete
    if (path.endsWith("/complete") && method === "POST") {
      const goalId = path.split("/")[3];
      if (!goalId) return apiError("Invalid Goal ID", 400);

      const [goal] = await db.select().from(goals).where(eq(goals.id, goalId));
      if (!goal) return apiError("Goal not found", 404);

      // Permission: employee (own goal), manager (direct report's goal), or admin
      if (sessionUser.role === "employee") {
        if (goal.employeeId !== sessionUser.id) {
          return apiError("Forbidden: You can only complete your own goals", 403);
        }
        if (goal.status !== "approved") {
          return apiError("Only approved goals can be marked as completed", 400);
        }
      } else if (sessionUser.role === "manager") {
        const [employee] = await db.select().from(users).where(eq(users.id, goal.employeeId));
        if (!employee || employee.managerId !== sessionUser.id) {
          return apiError("Forbidden: Not your direct report's goal", 403);
        }
      }
      // admins can complete any goal regardless of status

      await db
        .update(goals)
        .set({ status: "completed", locked: true })
        .where(eq(goals.id, goalId));

      await db.insert(notifications).values({
        id: "nt-" + crypto.randomUUID().slice(0, 8),
        userId: goal.employeeId,
        message: `Your goal "${goal.title}" has been marked as completed. 🎉`,
        type: "goal_completed",
        read: false,
        createdAt: new Date(),
      });

      await createAuditLog(db, sessionUser.id, "COMPLETE_GOAL", "GOAL", goalId, null, {
        status: "completed",
      });
      return apiSuccess({ success: true, message: "Goal marked as completed" });
    }

    // ----------------------------------------------------
    // CHECK-INS ENDPOINTS (Quarterly validations & audits)
    // ----------------------------------------------------

    // GET /api/checkins
    if (path === "/api/checkins" && method === "GET") {
      const goalId = url.searchParams.get("goalId");
      let allCheckins: any[] = [];

      if (goalId) {
        const [goalRow] = await db.select().from(goals).where(eq(goals.id, goalId));
        if (!goalRow) return apiError("Goal not found", 404);

        if (sessionUser.role === "employee" && goalRow.employeeId !== sessionUser.id) {
          return apiError("Forbidden", 403);
        }
        if (sessionUser.role === "manager") {
          const [employee] = await db.select().from(users).where(eq(users.id, goalRow.employeeId));
          if (
            goalRow.employeeId !== sessionUser.id &&
            (!employee || employee.managerId !== sessionUser.id)
          ) {
            return apiError("Forbidden", 403);
          }
        }

        allCheckins = await db
          .select()
          .from(checkins)
          .where(eq(checkins.goalId, goalId))
          .orderBy(desc(checkins.updatedAt));
      } else {
        if (sessionUser.role === "employee") {
          const userGoals = await db
            .select()
            .from(goals)
            .where(eq(goals.employeeId, sessionUser.id));
          const goalIds = userGoals.map((g) => g.id);
          allCheckins =
            goalIds.length > 0
              ? await db
                  .select()
                  .from(checkins)
                  .where(inArray(checkins.goalId, goalIds))
                  .orderBy(desc(checkins.updatedAt))
              : [];
        } else if (sessionUser.role === "manager") {
          const directReports = await db
            .select()
            .from(users)
            .where(eq(users.managerId, sessionUser.id));
          const employeeIds = directReports.map((u) => u.id).concat(sessionUser.id);
          if (employeeIds.length > 0) {
            const reportGoals = await db
              .select()
              .from(goals)
              .where(inArray(goals.employeeId, employeeIds));
            const goalIds = reportGoals.map((g) => g.id);
            allCheckins =
              goalIds.length > 0
                ? await db
                    .select()
                    .from(checkins)
                    .where(inArray(checkins.goalId, goalIds))
                    .orderBy(desc(checkins.updatedAt))
                : [];
          } else {
            allCheckins = [];
          }
        } else {
          allCheckins = await db.select().from(checkins).orderBy(desc(checkins.updatedAt));
        }
      }

      return apiSuccess(allCheckins);
    }

    // POST /api/checkins (Checkin validators & audits)
    if (path === "/api/checkins" && method === "POST") {
      const body = (await request.json()) as any;

      // Perform server-side validation
      const chkErr = await validateCheckin(db, sessionUser.id, body);
      if (chkErr) {
        return apiError(chkErr, 400);
      }

      // Check quarterly check-in window
      if (sessionUser.role !== "admin") {
        const qtr = body.quarter as QuarterPeriod;
        const windowOpen = await isQuarterWindowOpen(db, quarterOverrides, eq, qtr);
        if (!windowOpen) {
          return apiError(
            `${qtr} Check-in Window is currently closed. Submissions are disabled.`,
            403,
          );
        }
      }

      const progress = Number(body.progress);
      const actualAchievement = Number(body.actualAchievement);

      let status = "on_track";
      if (progress < 40) status = "delayed";
      else if (progress < 75) status = "at_risk";

      const newCheckin = {
        id: "ch-" + crypto.randomUUID().slice(0, 8),
        goalId: body.goalId,
        quarter: body.quarter,
        actualAchievement,
        progress,
        status,
        employeeComment: (body.employeeComment || "").trim(),
        managerComment: (body.managerComment || "").trim(),
        updatedAt: new Date(),
      };

      await db.insert(checkins).values(newCheckin);

      // SYNC REQUIREMENT: Auto-propagate progress across all linked goals of this shared KPI
      try {
        const [linkage] = await db
          .select()
          .from(sharedGoalAssignments)
          .where(eq(sharedGoalAssignments.goalId, body.goalId));

        if (linkage) {
          const peers = await db
            .select()
            .from(sharedGoalAssignments)
            .where(eq(sharedGoalAssignments.sharedGoalId, linkage.sharedGoalId));

          for (const peer of peers) {
            if (peer.goalId === body.goalId) continue; // skip self

            const [existingPeerCheckin] = await db
              .select()
              .from(checkins)
              .where(and(eq(checkins.goalId, peer.goalId), eq(checkins.quarter, body.quarter)));

            if (existingPeerCheckin) {
              await db
                .update(checkins)
                .set({
                  actualAchievement,
                  progress,
                  status,
                  updatedAt: new Date(),
                })
                .where(eq(checkins.id, existingPeerCheckin.id));
            } else {
              await db.insert(checkins).values({
                id: "ch-" + crypto.randomUUID().slice(0, 8),
                goalId: peer.goalId,
                quarter: body.quarter,
                actualAchievement,
                progress,
                status,
                employeeComment: "Synchronized from shared goal owner updates.",
                updatedAt: new Date(),
              });
            }
          }
        }
      } catch (err) {
        // Sync fail-safe
      }

      await createAuditLog(
        db,
        sessionUser.id,
        "CREATE_CHECKIN",
        "CHECKIN",
        newCheckin.id,
        null,
        newCheckin,
      );

      // Notify manager of new check-in cycle
      try {
        const [goalRow] = await db.select().from(goals).where(eq(goals.id, body.goalId));
        if (goalRow) {
          const [employeeUser] = await db
            .select()
            .from(users)
            .where(eq(users.id, goalRow.employeeId));
          if (employeeUser && employeeUser.managerId) {
            const [existingNotif] = await db
              .select()
              .from(notifications)
              .where(
                and(
                  eq(notifications.userId, employeeUser.managerId),
                  eq(notifications.type, "checkin_submitted"),
                  eq(notifications.read, false),
                  like(
                    notifications.message,
                    `%${employeeUser.name} submitted a check-in for "${goalRow.title}"%`,
                  ),
                ),
              );

            if (!existingNotif) {
              await db.insert(notifications).values({
                id: "nt-" + crypto.randomUUID().slice(0, 8),
                userId: employeeUser.managerId,
                message: `Employee ${employeeUser.name} submitted a check-in for "${goalRow.title}" (${body.quarter}).`,
                type: "checkin_submitted",
                read: false,
                createdAt: new Date(),
              });
            }
          }
        }
      } catch (err) {
        // notification fail-safe
      }

      return apiSuccess({ checkin: newCheckin });
    }

    // ----------------------------------------------------
    // NOTIFICATIONS ENDPOINTS
    // ----------------------------------------------------

    // GET /api/notifications
    if (path === "/api/notifications" && method === "GET") {
      const alerts = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, sessionUser.id))
        .orderBy(desc(notifications.createdAt));
      return apiSuccess(alerts);
    }

    // POST /api/notifications/read
    if (path === "/api/notifications/read" && method === "POST") {
      const body = (await request.json()) as any;
      const notificationId = body.id;

      if (notificationId) {
        await db
          .update(notifications)
          .set({ read: true })
          .where(
            and(eq(notifications.id, notificationId), eq(notifications.userId, sessionUser.id)),
          );
      } else {
        await db
          .update(notifications)
          .set({ read: true })
          .where(eq(notifications.userId, sessionUser.id));
      }

      return apiSuccess({ success: true });
    }

    // ----------------------------------------------------
    // AUDIT LOGS ENDPOINTS (Guarded)
    // ----------------------------------------------------

    // GET /api/audit-logs
    if (path === "/api/audit-logs" && method === "GET") {
      const admErr = enforceAdmin(sessionUser.role);
      if (admErr) return apiError(admErr, 403);

      const logs = await db
        .select({
          id: auditLogs.id,
          userId: auditLogs.userId,
          userName: users.name,
          action: auditLogs.action,
          entityType: auditLogs.entityType,
          entityId: auditLogs.entityId,
          oldValue: auditLogs.oldValue,
          newValue: auditLogs.newValue,
          timestamp: auditLogs.timestamp,
        })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.userId, users.id))
        .orderBy(desc(auditLogs.timestamp));
      return apiSuccess(logs);
    }

    // ----------------------------------------------------
    // ANALYTICS & GOVERNANCE DASHBOARD ENDPOINTS
    // ----------------------------------------------------

    // GET /api/analytics/employee
    if (path === "/api/analytics/employee" && method === "GET") {
      const empGoals = await db.select().from(goals).where(eq(goals.employeeId, sessionUser.id));
      const goalIds = empGoals.map((g) => g.id);

      let empCheckins: any[] = [];
      if (goalIds.length > 0) {
        empCheckins = await db.select().from(checkins).where(inArray(checkins.goalId, goalIds));
      }

      const totalGoalsCount = empGoals.length;
      const approvedCount = empGoals.filter((g) => g.status === "approved").length;

      const progressMap = new Map();
      empCheckins.forEach((c) => {
        const prev = progressMap.get(c.goalId);
        if (!prev || new Date(c.updatedAt) > new Date(prev.updatedAt)) {
          progressMap.set(c.goalId, c);
        }
      });

      let totalProgress = 0;
      progressMap.forEach((c) => {
        totalProgress += c.progress;
      });
      const avgProgress = totalGoalsCount > 0 ? totalProgress / totalGoalsCount : 0;

      return apiSuccess({
        totalGoals: totalGoalsCount,
        approvedGoals: approvedCount,
        avgProgress: Math.round(avgProgress),
        pendingGoals: empGoals.filter((g) => g.status === "pending" || g.status === "draft").length,
      });
    }

    // GET /api/analytics/manager
    if (path === "/api/analytics/manager" && method === "GET") {
      const directReports = await db
        .select()
        .from(users)
        .where(eq(users.managerId, sessionUser.id));
      const reportIds = directReports.map((u) => u.id);

      if (reportIds.length === 0) {
        return apiSuccess({
          directReportsCount: 0,
          pendingApprovals: 0,
          teamProgressAverage: 0,
        });
      }

      const teamGoals = await db.select().from(goals).where(inArray(goals.employeeId, reportIds));
      const teamGoalIds = teamGoals.map((g) => g.id);

      let teamCheckins: any[] = [];
      if (teamGoalIds.length > 0) {
        teamCheckins = await db
          .select()
          .from(checkins)
          .where(inArray(checkins.goalId, teamGoalIds));
      }

      const pendingCount = teamGoals.filter(
        (g) => g.status === "pending" || g.status === "rework_requested",
      ).length;

      const latestProgressMap = new Map();
      teamCheckins.forEach((c) => {
        const prev = latestProgressMap.get(c.goalId);
        if (!prev || new Date(c.updatedAt) > new Date(prev.updatedAt)) {
          latestProgressMap.set(c.goalId, c);
        }
      });

      let totalProg = 0;
      latestProgressMap.forEach((c) => {
        totalProg += c.progress;
      });
      const avgProgress = teamGoals.length > 0 ? totalProg / teamGoals.length : 0;

      return apiSuccess({
        directReportsCount: directReports.length,
        pendingApprovals: pendingCount,
        teamProgressAverage: Math.round(avgProgress),
      });
    }

    // GET /api/analytics/admin
    if (path === "/api/analytics/admin" && method === "GET") {
      const admErr = enforceAdmin(sessionUser.role);
      if (admErr) return apiError(admErr, 403);

      const allGoalsList = await db.select().from(goals);
      const allCheckinsList = await db.select().from(checkins);
      const allUsersList = await db.select().from(users);

      const latestProgMap = new Map();
      allCheckinsList.forEach((c) => {
        const prev = latestProgMap.get(c.goalId);
        if (!prev || new Date(c.updatedAt) > new Date(prev.updatedAt)) {
          latestProgMap.set(c.goalId, c);
        }
      });

      let grandTotalProg = 0;
      latestProgMap.forEach((c) => {
        grandTotalProg += c.progress;
      });

      const avgProgress = allGoalsList.length > 0 ? grandTotalProg / allGoalsList.length : 0;

      // Group average progress by department
      const deptMap: Record<string, { totalProgress: number; count: number }> = {};
      const userDeptMap = new Map(allUsersList.map((u) => [u.id, u.department || "Other"]));

      allGoalsList.forEach((g) => {
        const dept = userDeptMap.get(g.employeeId) || "Other";
        const checkin = latestProgMap.get(g.id);
        const prog = checkin ? Number(checkin.progress) : 0;

        if (!deptMap[dept]) {
          deptMap[dept] = { totalProgress: 0, count: 0 };
        }
        deptMap[dept].totalProgress += prog;
        deptMap[dept].count += 1;
      });

      const departmentPerformance = Object.entries(deptMap).map(([dept, data]) => ({
        department: dept,
        avgProgress: Math.round(data.totalProgress / data.count),
        goalsCount: data.count,
      }));

      // Calculate shared KPI adoption progress
      const sharedAssignments = await db.select().from(sharedGoalAssignments);
      const sharedAssignedGoalIds = new Set(sharedAssignments.map((s) => s.goalId));
      let sharedCount = 0;
      let sharedTotalProg = 0;
      allGoalsList.forEach((g) => {
        if (sharedAssignedGoalIds.has(g.id)) {
          const checkin = latestProgMap.get(g.id);
          const prog = checkin ? Number(checkin.progress) : 0;
          sharedTotalProg += prog;
          sharedCount += 1;
        }
      });
      const sharedKPIProgress = {
        adoptionCount: sharedCount,
        avgProgress: sharedCount > 0 ? Math.round(sharedTotalProg / sharedCount) : 0,
      };

      // Quarterly check-in trends
      const qTrends: Record<string, number> = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
      allCheckinsList.forEach((c) => {
        if (qTrends[c.quarter] !== undefined) {
          qTrends[c.quarter] += 1;
        }
      });
      const quarterlyTrends = Object.entries(qTrends).map(([quarter, checkinsCount]) => ({
        quarter,
        checkinsCount,
      }));

      // Escalations count
      const draftCount = allGoalsList.filter((g) => g.status === "draft").length;
      const pendingCount = allGoalsList.filter((g) => g.status === "pending").length;
      const approvedGoalIds = allGoalsList.filter((g) => g.status === "approved").map((g) => g.id);
      const checkinGoalIds = new Set(allCheckinsList.map((c) => c.goalId));
      const missedCheckinsCount = approvedGoalIds.filter((id) => !checkinGoalIds.has(id)).length;
      const escalationCount = draftCount + pendingCount + missedCheckinsCount;

      return apiSuccess({
        totalEmployees: allUsersList.filter((u) => u.role === "employee").length,
        totalGoalsCount: allGoalsList.length,
        avgEnterpriseProgress: Math.round(avgProgress),
        goalsApproved: approvedGoalIds.length,
        goalsDraft: draftCount,
        goalsPending: pendingCount,
        escalationCount,
        missedCheckinsCount,
        departmentPerformance,
        sharedKPIProgress,
        quarterlyTrends,
      });
    }

    // ----------------------------------------------------
    // DISCUSSION COMMENTS ENDPOINTS
    // ----------------------------------------------------

    // GET /api/comments
    if (path === "/api/comments" && method === "GET") {
      const entityType = url.searchParams.get("entityType") || "";
      const entityId = url.searchParams.get("entityId") || "";

      // Security check: Verify user is authorized to read comments of this goal or check-in
      if (entityType === "goal") {
        const [goalRow] = await db.select().from(goals).where(eq(goals.id, entityId));
        if (!goalRow) return apiError("Goal not found", 404);

        if (sessionUser.role === "employee" && goalRow.employeeId !== sessionUser.id) {
          return apiError("Forbidden: Unrelated goal discussion", 403);
        }
        if (sessionUser.role === "manager") {
          const [employee] = await db.select().from(users).where(eq(users.id, goalRow.employeeId));
          if (
            goalRow.employeeId !== sessionUser.id &&
            (!employee || employee.managerId !== sessionUser.id)
          ) {
            return apiError("Forbidden: Unrelated goal discussion", 403);
          }
        }
      } else if (entityType === "checkin") {
        const [checkinRow] = await db.select().from(checkins).where(eq(checkins.id, entityId));
        if (!checkinRow) return apiError("Check-in not found", 404);

        const [goalRow] = await db.select().from(goals).where(eq(goals.id, checkinRow.goalId));
        if (!goalRow) return apiError("Goal not found for check-in", 404);

        if (sessionUser.role === "employee" && goalRow.employeeId !== sessionUser.id) {
          return apiError("Forbidden: Unrelated check-in discussion", 403);
        }
        if (sessionUser.role === "manager") {
          const [employee] = await db.select().from(users).where(eq(users.id, goalRow.employeeId));
          if (
            goalRow.employeeId !== sessionUser.id &&
            (!employee || employee.managerId !== sessionUser.id)
          ) {
            return apiError("Forbidden: Unrelated check-in discussion", 403);
          }
        }
      }

      const list = await db
        .select({
          id: comments.id,
          userId: comments.userId,
          entityType: comments.entityType,
          entityId: comments.entityId,
          message: comments.message,
          createdAt: comments.createdAt,
          userName: users.name,
          userRole: users.role,
        })
        .from(comments)
        .innerJoin(users, eq(comments.userId, users.id))
        .where(and(eq(comments.entityType, entityType), eq(comments.entityId, entityId)))
        .orderBy(desc(comments.createdAt));

      return apiSuccess(list);
    }

    // POST /api/comments
    if (path === "/api/comments" && method === "POST") {
      const body = (await request.json()) as any;
      if (!body.entityType || !body.entityId || !body.message || !body.message.trim()) {
        return apiError("Comments require entity type, entity ID, and text content.", 400);
      }

      // Prevent invalid entity references / orphan comments
      if (body.entityType === "goal") {
        const [goalRow] = await db.select().from(goals).where(eq(goals.id, body.entityId));
        if (!goalRow) return apiError("Goal not found", 404);
      } else if (body.entityType === "checkin") {
        const [checkinRow] = await db.select().from(checkins).where(eq(checkins.id, body.entityId));
        if (!checkinRow) return apiError("Check-in not found", 404);
      } else {
        return apiError(
          "Invalid entity type. Comments can only be attached to goals or check-ins.",
          400,
        );
      }

      const newComment = {
        id: "comm-" + crypto.randomUUID().slice(0, 8),
        userId: sessionUser.id,
        entityType: body.entityType,
        entityId: body.entityId,
        message: body.message.trim(),
        createdAt: new Date(),
      };

      await db.insert(comments).values(newComment);
      await createAuditLog(
        db,
        sessionUser.id,
        "ADD_COMMENT",
        "COMMENT",
        newComment.id,
        null,
        newComment,
      );

      // Trigger notification:
      if (body.entityType === "goal") {
        const [goalRow] = await db.select().from(goals).where(eq(goals.id, body.entityId));
        if (goalRow) {
          const employeeId = goalRow.employeeId;
          const [employeeUser] = await db.select().from(users).where(eq(users.id, employeeId));

          if (sessionUser.id === employeeId) {
            if (employeeUser && employeeUser.managerId) {
              const [existingNotif] = await db
                .select()
                .from(notifications)
                .where(
                  and(
                    eq(notifications.userId, employeeUser.managerId),
                    eq(notifications.type, "comment_added"),
                    eq(notifications.read, false),
                    like(notifications.message, `%Employee ${sessionUser.name} added a goal note%`),
                  ),
                );

              if (!existingNotif) {
                await db.insert(notifications).values({
                  id: "not-" + crypto.randomUUID().slice(0, 8),
                  userId: employeeUser.managerId,
                  message: `Employee ${sessionUser.name} added a goal note: "${body.message.slice(0, 30)}..."`,
                  type: "comment_added",
                  read: false,
                  createdAt: new Date(),
                });
              }
            }
          } else {
            const [existingNotif] = await db
              .select()
              .from(notifications)
              .where(
                and(
                  eq(notifications.userId, employeeId),
                  eq(notifications.type, "comment_added"),
                  eq(notifications.read, false),
                  like(notifications.message, `%Manager ${sessionUser.name} added a goal note%`),
                ),
              );

            if (!existingNotif) {
              await db.insert(notifications).values({
                id: "not-" + crypto.randomUUID().slice(0, 8),
                userId: employeeId,
                message: `Manager ${sessionUser.name} added a goal note: "${body.message.slice(0, 30)}..."`,
                type: "comment_added",
                read: false,
                createdAt: new Date(),
              });
            }
          }
        }
      }

      return apiSuccess({ comment: newComment });
    }

    // ----------------------------------------------------
    // SHARED GOALS ENDPOINTS
    // ----------------------------------------------------

    // POST /api/goals/shared (Bulk assign departmental KPI)
    if (path === "/api/goals/shared" && method === "POST") {
      const mgrErr = enforceManager(sessionUser.role);
      if (mgrErr) return apiError(mgrErr, 403);

      const body = (await request.json()) as any;
      if (
        !body.title ||
        !body.description ||
        !body.thrustArea ||
        !body.uomType ||
        !body.target ||
        !body.employeeIds ||
        !body.employeeIds.length
      ) {
        return apiError(
          "Shared goals require title, description, thrust area, UoM, target, and assignee employee IDs.",
          400,
        );
      }

      const sharedGoalId = "sg-" + crypto.randomUUID().slice(0, 8);
      const newSharedGoal = {
        id: sharedGoalId,
        title: body.title.trim(),
        description: body.description.trim(),
        thrustArea: body.thrustArea,
        uomType: body.uomType,
        target: Number(body.target),
        department: body.department || sessionUser.department,
        managerId: sessionUser.id,
        createdAt: new Date(),
      };
      await db.insert(sharedGoals).values(newSharedGoal);

      for (const empId of body.employeeIds) {
        // Prevent duplicate assignment for this employee
        const [existingGoal] = await db
          .select()
          .from(goals)
          .where(and(eq(goals.employeeId, empId), eq(goals.title, body.title.trim())));
        if (existingGoal) continue;

        const clonedGoalId = "g-" + crypto.randomUUID().slice(0, 8);
        const clonedGoal = {
          id: clonedGoalId,
          employeeId: empId,
          title: body.title.trim(),
          description: body.description.trim(),
          thrustArea: body.thrustArea,
          uomType: body.uomType,
          target: Number(body.target),
          weightage: Number(body.weightage || 15),
          status: "approved",
          locked: true,
          deadline: body.deadline ? new Date(body.deadline) : null,
          createdAt: new Date(),
        };
        await db.insert(goals).values(clonedGoal);

        await db.insert(sharedGoalAssignments).values({
          id: "sga-" + crypto.randomUUID().slice(0, 8),
          sharedGoalId: sharedGoalId,
          employeeId: empId,
          goalId: clonedGoalId,
        });

        await db.insert(notifications).values({
          id: "not-" + crypto.randomUUID().slice(0, 8),
          userId: empId,
          message: `Manager ${sessionUser.name} pushed a new shared KPI: "${body.title}"`,
          type: "shared_goal_assigned",
          read: false,
          createdAt: new Date(),
        });

        // Audit individual assignment
        await createAuditLog(
          db,
          sessionUser.id,
          "ASSIGN_SHARED_GOAL",
          "SHARED_GOAL_ASSIGNMENT",
          clonedGoalId,
          null,
          { sharedGoalId, employeeId: empId },
        );
      }

      await createAuditLog(
        db,
        sessionUser.id,
        "CREATE_SHARED_GOAL",
        "SHARED_GOAL",
        sharedGoalId,
        null,
        newSharedGoal,
      );
      return apiSuccess({ success: true, sharedGoalId });
    }

    // GET /api/team/members
    if (path === "/api/team/members" && method === "GET") {
      const mgrErr = enforceManager(sessionUser.role);
      if (mgrErr) return apiError(mgrErr, 403);

      let list;
      if (sessionUser.role === "admin") {
        list = await db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            title: users.title,
            department: users.department,
          })
          .from(users)
          .where(ne(users.role, "admin"));
      } else {
        list = await db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            title: users.title,
            department: users.department,
          })
          .from(users)
          .where(eq(users.managerId, sessionUser.id));
      }

      return apiSuccess(list);
    }

    // ----------------------------------------------------
    // GOVERNANCE EXPORTS ENDPOINTS
    // ----------------------------------------------------

    // GET /api/exports/achievements
    if (path === "/api/exports/achievements" && method === "GET") {
      let filteredGoals: any[] = [];
      if (sessionUser.role === "employee") {
        filteredGoals = await db.select().from(goals).where(eq(goals.employeeId, sessionUser.id));
      } else if (sessionUser.role === "manager") {
        const reports = await db.select().from(users).where(eq(users.managerId, sessionUser.id));
        const ids = [sessionUser.id, ...reports.map((r) => r.id)];
        filteredGoals = await db.select().from(goals).where(inArray(goals.employeeId, ids));
      } else {
        filteredGoals = await db.select().from(goals);
      }

      const goalIds = filteredGoals.map((g) => g.id);
      let list: any[] = [];
      if (goalIds.length > 0) {
        list = await db.select().from(checkins).where(inArray(checkins.goalId, goalIds));
      }

      const allUsers = await db.select().from(users);
      const userMap = new Map(allUsers.map((u) => [u.id, u.name]));
      const goalMap = new Map(filteredGoals.map((g) => [g.id, g]));

      const headers = [
        "Employee Name",
        "Goal Title",
        "Target",
        "Actual Achievement",
        "Quarter",
        "Progress %",
        "Status",
      ];
      const rows = list.map((c: any) => {
        const goal = goalMap.get(c.goalId);
        return [
          userMap.get(goal?.employeeId || "") || "Unknown",
          goal?.title || "Unknown Goal",
          goal?.target || 0,
          c.actualAchievement,
          c.quarter,
          c.progress,
          c.status,
        ];
      });

      await createAuditLog(
        db,
        sessionUser.id,
        "EXPORT_ACHIEVEMENTS",
        "EXPORT",
        "achievements",
        null,
        { role: sessionUser.role },
      );

      const csv = generateCSV(headers, rows);
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename=achievements_export_${Date.now()}.csv`,
        },
      });
    }

    // GET /api/exports/goals
    if (path === "/api/exports/goals" && method === "GET") {
      let filteredGoals: any[] = [];
      if (sessionUser.role === "employee") {
        filteredGoals = await db.select().from(goals).where(eq(goals.employeeId, sessionUser.id));
      } else if (sessionUser.role === "manager") {
        const reports = await db.select().from(users).where(eq(users.managerId, sessionUser.id));
        const ids = [sessionUser.id, ...reports.map((r) => r.id)];
        filteredGoals = await db.select().from(goals).where(inArray(goals.employeeId, ids));
      } else {
        filteredGoals = await db.select().from(goals);
      }

      const allUsers = await db.select().from(users);
      const userMap = new Map(allUsers.map((u) => [u.id, u.name]));

      const allApprovals = await db.select().from(approvals);
      const approvalFeedbackMap = new Map(allApprovals.map((a) => [a.goalId, a.feedback || ""]));

      const headers = [
        "Employee Name",
        "Thrust Area",
        "Goal Title",
        "UoM",
        "Target",
        "Weightage %",
        "Approval Status",
        "Manager Feedback",
      ];
      const rows = filteredGoals.map((g: any) => [
        userMap.get(g.employeeId) || "Unknown",
        g.thrustArea,
        g.title,
        g.uomType,
        g.target,
        g.weightage,
        g.status,
        approvalFeedbackMap.get(g.id) || "",
      ]);

      await createAuditLog(db, sessionUser.id, "EXPORT_GOALS", "EXPORT", "goals", null, {
        role: sessionUser.role,
      });

      const csv = generateCSV(headers, rows);
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename=goals_export_${Date.now()}.csv`,
        },
      });
    }

    // GET /api/exports/audit-logs
    if (path === "/api/exports/audit-logs" && method === "GET") {
      const admErr = enforceAdmin(sessionUser.role);
      if (admErr) return apiError(admErr, 403);

      const logsList = await db.select().from(auditLogs).orderBy(desc(auditLogs.timestamp));
      const allUsers = await db.select().from(users);
      const userMap = new Map(allUsers.map((u) => [u.id, u.name]));

      const headers = [
        "User",
        "Action",
        "Entity Type",
        "Entity ID",
        "Timestamp",
        "Previous Value",
        "Updated Value",
      ];
      const rows = logsList.map((l: any) => [
        userMap.get(l.userId) || l.userId,
        l.action,
        l.entityType,
        l.entityId,
        l.timestamp ? new Date(l.timestamp).toLocaleString() : "",
        l.oldValue || "",
        l.newValue || "",
      ]);

      await createAuditLog(db, sessionUser.id, "EXPORT_AUDIT_LOGS", "EXPORT", "audit-logs", null, {
        role: sessionUser.role,
      });

      const csv = generateCSV(headers, rows);
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename=audit_logs_export_${Date.now()}.csv`,
        },
      });
    }

    // GET /api/exports/analytics
    if (path === "/api/exports/analytics" && method === "GET") {
      const admErr = enforceAdmin(sessionUser.role);
      if (admErr) return apiError(admErr, 403);

      const allGoalsList = await db.select().from(goals);
      const allCheckinsList = await db.select().from(checkins);
      const allUsersList = await db.select().from(users);

      const approvedCount = allGoalsList.filter((g) => g.status === "approved").length;
      const draftCount = allGoalsList.filter((g) => g.status === "draft").length;
      const totalCount = allGoalsList.length;

      const latestProgMap = new Map();
      allCheckinsList.forEach((c) => {
        const prev = latestProgMap.get(c.goalId);
        if (!prev || new Date(c.updatedAt) > new Date(prev.updatedAt)) {
          latestProgMap.set(c.goalId, c);
        }
      });

      let totalProg = 0;
      latestProgMap.forEach((c) => {
        totalProg += c.progress;
      });
      const avgProgress = totalCount > 0 ? Math.round(totalProg / totalCount) : 0;

      const headers = ["Metric Title", "Value Description"];
      const rows = [
        ["Total Registered Staff", String(allUsersList.length)],
        ["Average Enterprise Progress %", `${avgProgress}%`],
        ["Total Tracked Goals", String(totalCount)],
        ["Approved Goal Plans", String(approvedCount)],
        ["Draft Goal Plans", String(draftCount)],
        [
          "Pending/Review Queue Plans",
          String(Math.max(0, totalCount - approvedCount - draftCount)),
        ],
      ];

      await createAuditLog(db, sessionUser.id, "EXPORT_ANALYTICS", "EXPORT", "analytics", null, {
        role: sessionUser.role,
      });

      const csv = generateCSV(headers, rows);
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename=analytics_export_${Date.now()}.csv`,
        },
      });
    }

    // GET /api/checkin-windows
    if (path === "/api/checkin-windows" && method === "GET") {
      const list = await db.select().from(quarterOverrides);
      const overrideMap = new Map(list.map((o: any) => [o.quarter, o.isOpen]));

      const windowsStatus = {
        GOAL_SETTING:
          isDefaultWindowOpen("GOAL_SETTING") || Boolean(overrideMap.get("GOAL_SETTING")),
        Q1: isDefaultWindowOpen("Q1") || Boolean(overrideMap.get("Q1")),
        Q2: isDefaultWindowOpen("Q2") || Boolean(overrideMap.get("Q2")),
        Q3: isDefaultWindowOpen("Q3") || Boolean(overrideMap.get("Q3")),
        Q4: isDefaultWindowOpen("Q4") || Boolean(overrideMap.get("Q4")),
      };
      return apiSuccess(windowsStatus);
    }

    // ----------------------------------------------------
    // QUARTER OVERRIDES ENDPOINTS (Guarded)
    // ----------------------------------------------------

    // GET /api/admin/quarter-overrides
    if (path === "/api/admin/quarter-overrides" && method === "GET") {
      const admErr = enforceAdmin(sessionUser.role);
      if (admErr) return apiError(admErr, 403);

      const list = await db.select().from(quarterOverrides);
      return apiSuccess(list);
    }

    // POST /api/admin/quarter-overrides
    if (path === "/api/admin/quarter-overrides" && method === "POST") {
      const admErr = enforceAdmin(sessionUser.role);
      if (admErr) return apiError(admErr, 403);

      const body = (await request.json()) as any;
      if (!body.quarter) {
        return apiError("Override requires a specified quarter period.", 400);
      }

      const qtr = body.quarter as string;
      const isOpen = Boolean(body.isOpen);

      const [existing] = await db
        .select()
        .from(quarterOverrides)
        .where(eq(quarterOverrides.quarter, qtr));

      if (existing) {
        await db
          .update(quarterOverrides)
          .set({ isOpen, updatedAt: new Date() })
          .where(eq(quarterOverrides.id, existing.id));
      } else {
        await db.insert(quarterOverrides).values({
          id: "ov-" + crypto.randomUUID().slice(0, 8),
          quarter: qtr,
          isOpen,
          updatedAt: new Date(),
        });
      }

      await createAuditLog(db, sessionUser.id, "TOGGLE_WINDOW_OVERRIDE", "OVERRIDE", qtr, null, {
        quarter: qtr,
        isOpen,
      });
      return apiSuccess({ success: true });
    }

    // GET /api/admin/users
    if (path === "/api/admin/users" && method === "GET") {
      const admErr = enforceAdmin(sessionUser.role);
      if (admErr) return apiError(admErr, 403);

      const list = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          department: users.department,
          title: users.title,
          managerId: users.managerId,
          createdAt: users.createdAt,
        })
        .from(users);

      return apiSuccess(list);
    }

    // PUT /api/admin/users/:id
    if (path.startsWith("/api/admin/users/") && method === "PUT") {
      const admErr = enforceAdmin(sessionUser.role);
      if (admErr) return apiError(admErr, 403);

      const userId = path.split("/").pop() as string;
      const body = (await request.json()) as any;

      const [existingUser] = await db.select().from(users).where(eq(users.id, userId));
      if (!existingUser) {
        return apiError("User not found", 404);
      }

      const updatedFields: any = {};
      if (body.role !== undefined) updatedFields.role = body.role;
      if (body.department !== undefined) updatedFields.department = body.department;
      if (body.managerId !== undefined) updatedFields.managerId = body.managerId;
      if (body.title !== undefined) updatedFields.title = body.title;

      await db.update(users).set(updatedFields).where(eq(users.id, userId));

      await createAuditLog(
        db,
        sessionUser.id,
        "UPDATE_USER_ROLE_OR_HIERARCHY",
        "USER",
        userId,
        existingUser,
        updatedFields,
      );

      return apiSuccess({ success: true });
    }

    // GET /api/exports/performance
    if (path === "/api/exports/performance" && method === "GET") {
      const admErr = enforceAdmin(sessionUser.role);
      if (admErr) return apiError(admErr, 403);

      const allGoalsList = await db.select().from(goals);
      const allCheckinsList = await db.select().from(checkins);
      const allUsersList = await db.select().from(users);

      const latestProgMap = new Map();
      allCheckinsList.forEach((c) => {
        const prev = latestProgMap.get(c.goalId);
        if (!prev || new Date(c.updatedAt) > new Date(prev.updatedAt)) {
          latestProgMap.set(c.goalId, c);
        }
      });

      const userMap = new Map(allUsersList.map((u) => [u.id, u]));

      const headers = [
        "Employee Name",
        "Email",
        "Role",
        "Department",
        "Job Title",
        "Goal Title",
        "Thrust Area",
        "UoM",
        "Target",
        "Weightage",
        "Status",
        "Progress %",
      ];

      const rows = allGoalsList.map((g: any) => {
        const emp = userMap.get(g.employeeId) || ({} as any);
        const checkin = latestProgMap.get(g.id);
        const prog = checkin ? `${checkin.progress}%` : "0%";
        return [
          emp.name || "Unknown",
          emp.email || "",
          emp.role || "",
          emp.department || "",
          emp.title || "",
          g.title,
          g.thrustArea,
          g.uomType,
          String(g.target),
          `${g.weightage}%`,
          g.status,
          prog,
        ];
      });

      await createAuditLog(
        db,
        sessionUser.id,
        "EXPORT_PERFORMANCE_REPORTS",
        "EXPORT",
        "performance",
        null,
        {
          role: sessionUser.role,
        },
      );

      const csv = generateCSV(headers, rows);
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename=performance_export_${Date.now()}.csv`,
        },
      });
    }

    return apiError("Not Found", 404);
  } catch (error: any) {
    return apiError(error.message || "Internal Server Error", 500);
  }
}
