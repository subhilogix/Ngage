import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").$type<"employee" | "manager" | "admin">().notNull(),
  department: text("department").notNull(),
  title: text("title").notNull(),
  managerId: text("manager_id"), // Self-referential to another user.id
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const goals = sqliteTable("goals", {
  id: text("id").primaryKey(),
  employeeId: text("employee_id")
    .notNull()
    .references(() => users.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  thrustArea: text("thrust_area").notNull(),
  uomType: text("uom_type").notNull(),
  target: real("target").notNull(),
  weightage: real("weightage").notNull(),
  status: text("status").notNull().default("draft"),
  locked: integer("locked", { mode: "boolean" }).notNull().default(false),
  deadline: integer("deadline", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const checkins = sqliteTable("checkins", {
  id: text("id").primaryKey(),
  goalId: text("goal_id")
    .notNull()
    .references(() => goals.id),
  quarter: text("quarter").$type<"Q1" | "Q2" | "Q3" | "Q4">().notNull(),
  actualAchievement: real("actual_achievement").notNull(),
  progress: real("progress").notNull(), // percentage
  status: text("status").notNull(), // e.g., 'on_track', 'at_risk', 'delayed'
  employeeComment: text("employee_comment"),
  managerComment: text("manager_comment"),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const approvals = sqliteTable("approvals", {
  id: text("id").primaryKey(),
  goalId: text("goal_id")
    .notNull()
    .references(() => goals.id),
  managerId: text("manager_id")
    .notNull()
    .references(() => users.id),
  status: text("status")
    .$type<"pending" | "approved" | "rejected" | "rework_requested">()
    .notNull()
    .default("pending"),
  feedback: text("feedback"),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const auditLogs = sqliteTable("audit_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  oldValue: text("old_value"), // JSON string
  newValue: text("new_value"), // JSON string
  timestamp: integer("timestamp", { mode: "timestamp" }).notNull(),
});

// Required for Lucia Auth
export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  expiresAt: integer("expires_at").notNull(),
  sessionMetadata: text("session_metadata"), // JSON string for any extra data
});

export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  message: text("message").notNull(),
  read: integer("read", { mode: "boolean" }).notNull().default(false),
  type: text("type").notNull(), // e.g., 'approval_needed', 'goal_rejected'
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const comments = sqliteTable("comments", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  entityType: text("entity_type").notNull(), // 'goal' | 'checkin'
  entityId: text("entity_id").notNull(), // associated goalId / checkinId
  message: text("message").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const sharedGoals = sqliteTable("shared_goals", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  thrustArea: text("thrust_area").notNull(),
  uomType: text("uom_type").notNull(),
  target: real("target").notNull(),
  department: text("department").notNull(),
  managerId: text("manager_id")
    .notNull()
    .references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const sharedGoalAssignments = sqliteTable("shared_goal_assignments", {
  id: text("id").primaryKey(),
  sharedGoalId: text("shared_goal_id")
    .notNull()
    .references(() => sharedGoals.id),
  employeeId: text("employee_id")
    .notNull()
    .references(() => users.id),
  goalId: text("goal_id")
    .notNull()
    .references(() => goals.id), // Cloned child goal
});

export const quarterOverrides = sqliteTable("quarter_overrides", {
  id: text("id").primaryKey(),
  quarter: text("quarter").notNull(), // 'GOAL_SETTING', 'Q1', 'Q2', 'Q3', 'Q4'
  isOpen: integer("is_open", { mode: "boolean" }).notNull().default(false),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});
