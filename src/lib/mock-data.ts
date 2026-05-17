import type { Role } from "./auth";

export type GoalStatus =
  | "draft"
  | "pending"
  | "approved"
  | "rejected"
  | "on-track"
  | "at-risk"
  | "completed";
export type UoM = "Numeric" | "Percentage" | "Timeline" | "Zero-based";
export type Quarter = "Q1" | "Q2" | "Q3" | "Q4";

export type Goal = {
  id: string;
  ownerId: string;
  ownerName: string;
  thrustArea: string;
  title: string;
  description: string;
  uom: UoM;
  target: number;
  unit?: string;
  weightage: number;
  timeline: string;
  progress: number;
  status: GoalStatus;
  shared?: boolean;
  quarterly: Record<
    Quarter,
    {
      planned: number;
      actual: number;
      status: "Not Started" | "On Track" | "Completed";
      comments?: string;
    }
  >;
  history: { date: string; event: string; by: string }[];
};

export type Employee = {
  id: string;
  name: string;
  email: string;
  title: string;
  department: string;
  managerId?: string;
  avatar?: string;
  completion: number;
  goalsCount: number;
  pending: number;
};

export type AuditEntry = {
  id: string;
  ts: string;
  actor: string;
  action: string;
  entity: string;
  before?: string;
  after?: string;
};

export type Notification = {
  id: string;
  ts: string;
  title: string;
  body: string;
  type: "info" | "warning" | "success" | "approval";
  read?: boolean;
  link?: string;
};

export type Escalation = {
  id: string;
  employee: string;
  reason: string;
  level: 1 | 2 | 3;
  raisedAt: string;
  status: "open" | "acknowledged" | "resolved";
};

export const THRUST_AREAS = [
  "Customer Excellence",
  "Operational Efficiency",
  "Innovation & R&D",
  "People & Culture",
  "Financial Performance",
  "Quality & Compliance",
  "Digital Transformation",
];

export const DEPARTMENTS = [
  "Platform Engineering",
  "Product Design",
  "Customer Success",
  "People & Culture",
  "Finance",
  "Marketing",
  "Sales",
];

function mkQuarterly(target: number, progress: number): Goal["quarterly"] {
  const planned = target / 4;
  const done = (progress / 100) * target;
  const a1 = Math.min(planned, done);
  const a2 = Math.min(planned, Math.max(0, done - planned));
  const a3 = Math.min(planned, Math.max(0, done - planned * 2));
  const a4 = Math.max(0, done - planned * 3);
  return {
    Q1: {
      planned,
      actual: a1,
      status: a1 >= planned ? "Completed" : a1 > 0 ? "On Track" : "Not Started",
    },
    Q2: {
      planned,
      actual: a2,
      status: a2 >= planned ? "Completed" : a2 > 0 ? "On Track" : "Not Started",
    },
    Q3: {
      planned,
      actual: a3,
      status: a3 >= planned ? "Completed" : a3 > 0 ? "On Track" : "Not Started",
    },
    Q4: {
      planned,
      actual: a4,
      status: a4 >= planned ? "Completed" : a4 > 0 ? "On Track" : "Not Started",
    },
  };
}

export const employees: Employee[] = [
  {
    id: "u-emp-001",
    name: "Aarav Sharma",
    email: "aarav@company.com",
    title: "Sr Product Engineer",
    department: "Platform Engineering",
    managerId: "u-mgr-001",
    completion: 72,
    goalsCount: 6,
    pending: 1,
  },
  {
    id: "u-emp-002",
    name: "Priya Nair",
    email: "priya@company.com",
    title: "Product Designer",
    department: "Product Design",
    managerId: "u-mgr-001",
    completion: 88,
    goalsCount: 5,
    pending: 0,
  },
  {
    id: "u-emp-003",
    name: "Rohan Mehta",
    email: "rohan@company.com",
    title: "Backend Engineer",
    department: "Platform Engineering",
    managerId: "u-mgr-001",
    completion: 45,
    goalsCount: 7,
    pending: 2,
  },
  {
    id: "u-emp-004",
    name: "Sneha Kapoor",
    email: "sneha@company.com",
    title: "QA Engineer",
    department: "Platform Engineering",
    managerId: "u-mgr-001",
    completion: 64,
    goalsCount: 5,
    pending: 1,
  },
  {
    id: "u-emp-005",
    name: "Karan Patel",
    email: "karan@company.com",
    title: "DevOps Engineer",
    department: "Platform Engineering",
    managerId: "u-mgr-001",
    completion: 91,
    goalsCount: 4,
    pending: 0,
  },
  {
    id: "u-emp-006",
    name: "Ishita Verma",
    email: "ishita@company.com",
    title: "Data Analyst",
    department: "Finance",
    managerId: "u-mgr-001",
    completion: 58,
    goalsCount: 6,
    pending: 3,
  },
];

export const goals: Goal[] = [
  {
    id: "g-001",
    ownerId: "u-emp-001",
    ownerName: "Aarav Sharma",
    thrustArea: "Innovation & R&D",
    title: "Ship Realtime Collaboration v2",
    description: "Deliver presence, multi-cursor and CRDT-based merge for the workspace editor.",
    uom: "Percentage",
    target: 100,
    unit: "%",
    weightage: 25,
    timeline: "FY26 Q1–Q4",
    progress: 68,
    status: "on-track",
    quarterly: mkQuarterly(100, 68),
    history: [
      { date: "2026-01-12", event: "Goal created", by: "Aarav Sharma" },
      { date: "2026-01-15", event: "Approved by manager", by: "Meera Iyer" },
      { date: "2026-04-02", event: "Q1 check-in submitted", by: "Aarav Sharma" },
    ],
  },
  {
    id: "g-002",
    ownerId: "u-emp-001",
    ownerName: "Aarav Sharma",
    thrustArea: "Operational Efficiency",
    title: "Reduce p95 API Latency",
    description: "Bring p95 latency on core endpoints below 180ms across all regions.",
    uom: "Numeric",
    target: 180,
    unit: "ms",
    weightage: 20,
    timeline: "FY26 H1",
    progress: 52,
    status: "on-track",
    quarterly: mkQuarterly(100, 52),
    history: [
      { date: "2026-01-14", event: "Goal created", by: "Aarav Sharma" },
      { date: "2026-01-16", event: "Approved by manager", by: "Meera Iyer" },
    ],
  },
  {
    id: "g-003",
    ownerId: "u-emp-001",
    ownerName: "Aarav Sharma",
    thrustArea: "Quality & Compliance",
    title: "Zero P0 Production Incidents",
    description: "Maintain zero priority-0 incidents through proactive observability.",
    uom: "Zero-based",
    target: 0,
    weightage: 15,
    timeline: "FY26",
    progress: 100,
    status: "completed",
    quarterly: mkQuarterly(100, 100),
    history: [
      { date: "2026-01-14", event: "Goal created", by: "Aarav Sharma" },
      { date: "2026-01-16", event: "Approved", by: "Meera Iyer" },
    ],
  },
  {
    id: "g-004",
    ownerId: "u-emp-001",
    ownerName: "Aarav Sharma",
    thrustArea: "People & Culture",
    title: "Mentor 2 Junior Engineers",
    description: "Run weekly 1:1s and ship a structured growth path.",
    uom: "Numeric",
    target: 2,
    unit: "engineers",
    weightage: 10,
    timeline: "FY26",
    progress: 75,
    status: "on-track",
    quarterly: mkQuarterly(100, 75),
    history: [{ date: "2026-01-14", event: "Goal created", by: "Aarav Sharma" }],
  },
  {
    id: "g-005",
    ownerId: "u-emp-001",
    ownerName: "Aarav Sharma",
    thrustArea: "Customer Excellence",
    title: "Lift NPS for Power Users",
    description: "Drive NPS for top 100 accounts above 55 through targeted UX research.",
    uom: "Numeric",
    target: 55,
    unit: "NPS",
    weightage: 15,
    timeline: "FY26 H2",
    progress: 30,
    status: "at-risk",
    quarterly: mkQuarterly(100, 30),
    history: [{ date: "2026-02-01", event: "Goal created", by: "Aarav Sharma" }],
  },
  {
    id: "g-006",
    ownerId: "u-emp-001",
    ownerName: "Aarav Sharma",
    thrustArea: "Digital Transformation",
    title: "Migrate Auth to Passkeys",
    description: "Roll out WebAuthn passkeys to 60% of weekly active users.",
    uom: "Percentage",
    target: 60,
    unit: "%",
    weightage: 15,
    timeline: "FY26 H2",
    progress: 12,
    status: "pending",
    quarterly: mkQuarterly(100, 12),
    history: [{ date: "2026-03-10", event: "Goal drafted", by: "Aarav Sharma" }],
  },
  // Goals for other employees (manager view)
  {
    id: "g-101",
    ownerId: "u-emp-002",
    ownerName: "Priya Nair",
    thrustArea: "Customer Excellence",
    title: "Redesign Onboarding Flow",
    description: "Cut time-to-first-value by 40%.",
    uom: "Percentage",
    target: 40,
    unit: "%",
    weightage: 30,
    timeline: "FY26 H1",
    progress: 92,
    status: "on-track",
    quarterly: mkQuarterly(100, 92),
    history: [
      { date: "2026-01-10", event: "Goal created", by: "Priya Nair" },
      { date: "2026-01-12", event: "Approved", by: "Meera Iyer" },
    ],
  },
  {
    id: "g-102",
    ownerId: "u-emp-003",
    ownerName: "Rohan Mehta",
    thrustArea: "Operational Efficiency",
    title: "Cut Infra Cost 20%",
    description: "Optimise compute spend across staging and prod.",
    uom: "Percentage",
    target: 20,
    unit: "%",
    weightage: 25,
    timeline: "FY26",
    progress: 18,
    status: "pending",
    quarterly: mkQuarterly(100, 18),
    history: [{ date: "2026-03-22", event: "Submitted for approval", by: "Rohan Mehta" }],
  },
  {
    id: "g-103",
    ownerId: "u-emp-004",
    ownerName: "Sneha Kapoor",
    thrustArea: "Quality & Compliance",
    title: "Automation Coverage 85%",
    description: "Lift end-to-end automation coverage to 85%.",
    uom: "Percentage",
    target: 85,
    unit: "%",
    weightage: 30,
    timeline: "FY26",
    progress: 64,
    status: "pending",
    quarterly: mkQuarterly(100, 64),
    history: [{ date: "2026-03-25", event: "Submitted for approval", by: "Sneha Kapoor" }],
  },
  {
    id: "g-104",
    ownerId: "u-emp-005",
    ownerName: "Karan Patel",
    thrustArea: "Digital Transformation",
    title: "Zero-Downtime Deploys",
    description: "Achieve zero-downtime deploys across 100% of services.",
    uom: "Percentage",
    target: 100,
    unit: "%",
    weightage: 25,
    timeline: "FY26 H1",
    progress: 100,
    status: "completed",
    quarterly: mkQuarterly(100, 100),
    history: [{ date: "2026-01-11", event: "Approved", by: "Meera Iyer" }],
  },
  // Shared org KPI
  {
    id: "g-200",
    ownerId: "u-emp-001",
    ownerName: "Aarav Sharma",
    thrustArea: "Financial Performance",
    title: "Org KPI: Quarterly ARR Growth",
    description: "Pushed by HR/Finance to all engineering ICs.",
    uom: "Percentage",
    target: 15,
    unit: "% QoQ",
    weightage: 10,
    timeline: "FY26",
    progress: 58,
    status: "approved",
    shared: true,
    quarterly: mkQuarterly(100, 58),
    history: [{ date: "2026-01-05", event: "Shared by HR", by: "Devika Rao" }],
  },
];

export function getGoalsFor(role: Role, userId: string): Goal[] {
  if (role === "employee") return goals.filter((g) => g.ownerId === userId);
  if (role === "manager") {
    const teamIds = employees.filter((e) => e.managerId === "u-mgr-001").map((e) => e.id);
    return goals.filter((g) => teamIds.includes(g.ownerId));
  }
  return goals;
}

export const auditLog: AuditEntry[] = [
  {
    id: "a1",
    ts: "2026-05-16T09:12:00Z",
    actor: "Meera Iyer",
    action: "APPROVED_GOAL",
    entity: "Goal g-001 (Aarav)",
    before: "pending",
    after: "approved",
  },
  {
    id: "a2",
    ts: "2026-05-16T10:02:00Z",
    actor: "Aarav Sharma",
    action: "UPDATED_CHECKIN",
    entity: "Goal g-002 Q1",
    before: "actual=40",
    after: "actual=52",
  },
  {
    id: "a3",
    ts: "2026-05-15T16:45:00Z",
    actor: "Devika Rao",
    action: "OPENED_CYCLE",
    entity: "FY26 Q2",
    before: "closed",
    after: "open",
  },
  {
    id: "a4",
    ts: "2026-05-15T11:20:00Z",
    actor: "Meera Iyer",
    action: "REJECTED_GOAL",
    entity: "Goal g-104 v1",
    before: "pending",
    after: "rejected",
  },
  {
    id: "a5",
    ts: "2026-05-14T08:55:00Z",
    actor: "Devika Rao",
    action: "PUSHED_SHARED_GOAL",
    entity: "Org KPI ARR Growth",
    after: "shared with 248 employees",
  },
  {
    id: "a6",
    ts: "2026-05-13T18:30:00Z",
    actor: "Rohan Mehta",
    action: "SUBMITTED_GOAL",
    entity: "Goal g-102",
    after: "pending",
  },
  {
    id: "a7",
    ts: "2026-05-13T14:05:00Z",
    actor: "System",
    action: "ESCALATION_RAISED",
    entity: "Aarav: Q1 check-in",
    after: "level 1",
  },
  {
    id: "a8",
    ts: "2026-05-12T09:15:00Z",
    actor: "Priya Nair",
    action: "UPDATED_GOAL",
    entity: "Goal g-101",
    before: "weight=25",
    after: "weight=30",
  },
];

export const notifications: Notification[] = [
  {
    id: "n1",
    ts: "2026-05-17T08:30:00Z",
    title: "Goal approved",
    body: "Your goal “Ship Realtime Collaboration v2” was approved.",
    type: "success",
    link: "/goals",
  },
  {
    id: "n2",
    ts: "2026-05-16T17:10:00Z",
    title: "Q2 check-in due",
    body: "Submit your Q2 check-in by Friday.",
    type: "warning",
    link: "/checkins",
  },
  {
    id: "n3",
    ts: "2026-05-16T12:45:00Z",
    title: "New shared goal",
    body: "HR pushed “Org KPI ARR Growth” to your plan.",
    type: "info",
    link: "/shared-goals",
  },
  {
    id: "n4",
    ts: "2026-05-15T09:05:00Z",
    title: "Approval pending",
    body: "3 goals from your team await review.",
    type: "approval",
    link: "/approvals",
  },
];

export const escalations: Escalation[] = [
  {
    id: "e1",
    employee: "Rohan Mehta",
    reason: "Q1 check-in missed",
    level: 2,
    raisedAt: "2026-05-13T14:05:00Z",
    status: "open",
  },
  {
    id: "e2",
    employee: "Ishita Verma",
    reason: "Goals not submitted (7 days overdue)",
    level: 1,
    raisedAt: "2026-05-12T11:00:00Z",
    status: "acknowledged",
  },
  {
    id: "e3",
    employee: "Sneha Kapoor",
    reason: "Approval pending > 5 days",
    level: 1,
    raisedAt: "2026-05-11T09:30:00Z",
    status: "resolved",
  },
];

export const quarterlyTrend = [
  { quarter: "Q1", planned: 100, actual: 92, team: 88 },
  { quarter: "Q2", planned: 100, actual: 78, team: 81 },
  { quarter: "Q3", planned: 100, actual: 65, team: 70 },
  { quarter: "Q4", planned: 100, actual: 0, team: 0 },
];

export const departmentPerf = DEPARTMENTS.slice(0, 6).map((d, i) => ({
  department: d,
  completion: 55 + ((i * 13) % 40),
  onTrack: 40 + ((i * 9) % 35),
  atRisk: 10 + ((i * 7) % 20),
}));

export const orgKpis = {
  totalEmployees: 248,
  goalsSet: 1496,
  completion: 71,
  pendingApprovals: 34,
  escalations: 7,
  cyclesOpen: 1,
};

export const activityFeed = [
  {
    id: "f1",
    who: "Priya Nair",
    what: "completed",
    target: "Redesign Onboarding Flow",
    when: "2h ago",
  },
  {
    id: "f2",
    who: "Meera Iyer",
    what: "approved 3 goals from",
    target: "Sneha Kapoor",
    when: "4h ago",
  },
  {
    id: "f3",
    who: "System",
    what: "escalated",
    target: "Rohan Mehta — Q1 check-in",
    when: "1d ago",
  },
  { id: "f4", who: "Devika Rao", what: "opened cycle", target: "FY26 Q2", when: "1d ago" },
  {
    id: "f5",
    who: "Karan Patel",
    what: "submitted Q1 check-in for",
    target: "Zero-Downtime Deploys",
    when: "2d ago",
  },
];
