export type QuarterPeriod = "GOAL_SETTING" | "Q1" | "Q2" | "Q3" | "Q4";

export interface QuarterWindowInfo {
  quarter: QuarterPeriod;
  label: string;
  isOpenByDefault: boolean;
  monthsDescription: string;
}

export const QUARTER_WINDOWS: Record<QuarterPeriod, QuarterWindowInfo> = {
  GOAL_SETTING: {
    quarter: "GOAL_SETTING",
    label: "Goal Setting Window",
    isOpenByDefault: false,
    monthsDescription: "Opens May 1",
  },
  Q1: {
    quarter: "Q1",
    label: "Q1 Check-in Window",
    isOpenByDefault: false,
    monthsDescription: "July",
  },
  Q2: {
    quarter: "Q2",
    label: "Q2 Check-in Window",
    isOpenByDefault: false,
    monthsDescription: "October",
  },
  Q3: {
    quarter: "Q3",
    label: "Q3 Check-in Window",
    isOpenByDefault: false,
    monthsDescription: "January",
  },
  Q4: {
    quarter: "Q4",
    label: "Q4 / Annual Review Window",
    isOpenByDefault: false,
    monthsDescription: "March & April",
  },
};

/**
 * Evaluates whether a given date is within the default opening window for a quarter.
 */
export function isDefaultWindowOpen(quarter: QuarterPeriod, date: Date = new Date()): boolean {
  const month = date.getMonth(); // 0-11

  switch (quarter) {
    case "GOAL_SETTING":
      return month === 4; // May (4)
    case "Q1":
      return month === 6; // July (6)
    case "Q2":
      return month === 9; // October (9)
    case "Q3":
      return month === 0; // January (0)
    case "Q4":
      return month === 2 || month === 3; // March (2) or April (3)
    default:
      return false;
  }
}

/**
 * Returns the currently active quarter period based on the current calendar month.
 */
export function getCurrentActiveQuarter(date: Date = new Date()): QuarterPeriod {
  const month = date.getMonth();
  if (month === 4) return "GOAL_SETTING";
  if (month === 6) return "Q1";
  if (month === 9) return "Q2";
  if (month === 0) return "Q3";
  if (month === 2 || month === 3) return "Q4";

  // Fallbacks: find the closest upcoming quarter
  if (month === 5) return "Q1";
  if (month === 7 || month === 8) return "Q2";
  if (month === 10 || month === 11) return "Q3";
  return "GOAL_SETTING"; // default fallback
}

/**
 * Server-side function to check if a specific quarter window is open.
 * Evaluates calendar logic first, and then falls back to admin database overrides.
 */
export async function isQuarterWindowOpen(
  db: any,
  quarterOverridesTable: any,
  eq: any,
  quarter: QuarterPeriod,
  date: Date = new Date(),
): Promise<boolean> {
  // 1. Check calendar window
  const calendarOpen = isDefaultWindowOpen(quarter, date);
  if (calendarOpen) return true;

  // 2. Check admin database override
  try {
    const list = await db
      .select()
      .from(quarterOverridesTable)
      .where(eq(quarterOverridesTable.quarter, quarter));

    if (list && list.length > 0) {
      return Boolean(list[0].isOpen);
    }
  } catch (err) {
    // Fail-safe: ignore DB error and rely on calendar
  }

  return false;
}
