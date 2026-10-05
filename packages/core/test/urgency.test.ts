import { describe, expect, it } from "vitest";
import { isoWeek, needsYou, planStatus, urgency, type ItemFields } from "../src";

const base = {
  id: "01JA2ZQ8V4N5W6X7Y8Z9A0B1C2",
  type: "task",
  title: "t",
  state: "open",
  mode: "store",
  created: "2026-10-01T09:00:00+08:00",
  updated: "2026-10-01T09:00:00+08:00",
} as const;
const task = (extra: Record<string, unknown> = {}) => ({ ...base, ...extra }) as ItemFields;
// 5 Oct 2026, 3:53 pm in Perth
const now = new Date("2026-10-05T07:53:00Z");

describe("urgency", () => {
  it("is quiet with no due date or far off", () => {
    expect(urgency(task(), now).band).toBe("quiet");
    expect(urgency(task({ due: "2026-10-20" }), now).band).toBe("quiet");
  });
  it("warms up over the last 7 days", () => {
    const week = urgency(task({ due: "2026-10-12" }), now);
    const tomorrow = urgency(task({ due: "2026-10-06" }), now);
    expect(week.band).toBe("soon");
    expect(tomorrow.band).toBe("soon");
    expect(tomorrow.heat).toBeGreaterThan(week.heat);
    expect(urgency(task({ due: "2026-10-13" }), now).band).toBe("quiet");
  });
  it("is due today and overdue after", () => {
    expect(urgency(task({ due: "2026-10-05" }), now).band).toBe("due");
    expect(urgency(task({ due: "2026-10-04" }), now)).toMatchObject({ band: "overdue", daysLeft: -1 });
    expect(urgency(task({ due: "2026-10-05T15:00:00+08:00" }), now).band).toBe("overdue");
    expect(urgency(task({ due: "2026-10-05T17:00:00+08:00" }), now).band).toBe("due");
  });
  it("uses Perth's date, not UTC's", () => {
    // 11:30 pm UTC on the 4th is already the 5th in Perth
    const lateUtc = new Date("2026-10-04T23:30:00Z");
    expect(urgency(task({ due: "2026-10-05" }), lateUtc).band).toBe("due");
  });
  it("hides snoozed and closed tasks", () => {
    expect(urgency(task({ due: "2026-10-04", snoozed_until: "2026-10-06T09:00:00+08:00" }), now).band).toBe("snoozed");
    expect(urgency(task({ due: "2026-10-04", state: "closed", closed: "2026-10-04T10:00:00+08:00" }), now).band).toBe("none");
  });
  it("feeds Needs you only past the threshold", () => {
    expect(needsYou(task({ due: "2026-10-20" }), now)).toBe(false);
    expect(needsYou(task({ due: "2026-10-07" }), now)).toBe(true);
  });
});

describe("plan detection", () => {
  it("knows a plan when it sees one", () => {
    expect(planStatus(task({ when: "2026-10-05T16:00:00+08:00" }))).toBe("has-plan");
    expect(planStatus(task({ next_step: "Text Kristian" }))).toBe("has-plan");
    expect(planStatus(task({ due: "2026-10-06T16:00:00+08:00" }))).toBe("has-plan");
  });
  it("leaves the rest to Claude", () => {
    expect(planStatus(task())).toBe("needs-judgement");
    expect(planStatus(task({ due: "2026-10-06" }))).toBe("needs-judgement");
  });
});

describe("weeks", () => {
  it("labels ISO weeks", () => {
    expect(isoWeek("2026-10-05")).toBe("2026-W41");
    expect(isoWeek("2027-01-01")).toBe("2026-W53");
  });
});
