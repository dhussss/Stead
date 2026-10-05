import type { ItemFields } from "./schema";
import { DEFAULT_TZ, daysBetween, localDate } from "./time";

/**
 * Urgency bands from the constitution, section 7. Colour stays quiet until it matters,
 * because alarms that aren't actionable teach people to ignore all alarms.
 */
export type UrgencyBand = "none" | "snoozed" | "quiet" | "soon" | "due" | "overdue";

export interface Urgency {
  band: UrgencyBand;
  /** 0 to 1 within the "soon" band: how far the colour has moved from amber toward red. 1 for due and overdue. */
  heat: number;
  /** Whole days until due (negative when overdue). Undefined without a due date. */
  daysLeft?: number;
}

/** Days out at which colour starts. */
export const SOON_DAYS = 7;

export function urgency(fields: ItemFields, now: Date = new Date(), timeZone = DEFAULT_TZ): Urgency {
  if (fields.state === "closed") return { band: "none", heat: 0 };
  if (fields.type !== "task") return { band: "none", heat: 0 };

  if (fields.snoozed_until && Date.parse(fields.snoozed_until) > now.getTime()) {
    return { band: "snoozed", heat: 0 };
  }
  const due = fields.due;
  if (!due) return { band: "quiet", heat: 0 };

  const today = localDate(now, timeZone);
  const hasTime = due.includes("T");
  const dueDay = hasTime ? localDate(new Date(due), timeZone) : due;
  const daysLeft = daysBetween(today, dueDay);

  if (hasTime ? Date.parse(due) < now.getTime() : daysLeft < 0) return { band: "overdue", heat: 1, daysLeft };
  if (daysLeft === 0) return { band: "due", heat: 1, daysLeft };
  if (daysLeft <= SOON_DAYS) return { band: "soon", heat: (SOON_DAYS + 1 - daysLeft) / (SOON_DAYS + 1), daysLeft };
  return { band: "quiet", heat: 0, daysLeft };
}

/** Whether a task belongs in "Needs you" on Home: it has crossed the colour threshold. */
export function needsYou(fields: ItemFields, now?: Date, timeZone?: string): boolean {
  const b = urgency(fields, now, timeZone).band;
  return b === "soon" || b === "due" || b === "overdue";
}

/**
 * The deterministic half of plan detection. A task with a planned time, a timed due date or a
 * next step already carries its plan. Anything else goes to Claude to judge, because
 * "grocery shopping" with a Monday slot is a plan and "grab onions from Coles" isn't.
 */
export function planStatus(fields: ItemFields): "has-plan" | "needs-judgement" | "not-a-task" {
  if (fields.type !== "task" || fields.state === "closed") return "not-a-task";
  if (fields.when || fields.next_step || (fields.due && fields.due.includes("T"))) return "has-plan";
  return "needs-judgement";
}
