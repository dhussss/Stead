import { describe, expect, it } from "vitest";
import { parseNaturalDate } from "../src";

// Monday 5 Oct 2026, 3:53 pm in Perth
const now = new Date("2026-10-05T07:53:00Z");

describe("parseNaturalDate", () => {
  it("finds nothing in plain text", () => {
    expect(parseNaturalDate("grab onions from Coles", now)).toBeNull();
  });

  it("understands today and tomorrow", () => {
    expect(parseNaturalDate("renew rego today", now)?.value).toBe("2026-10-05");
    expect(parseNaturalDate("renew rego tomorrow", now)?.value).toBe("2026-10-06");
  });

  it("understands a bare weekday as the next occurrence", () => {
    // Said on Monday: "wednesday" is this week, "monday" with no "next" means today.
    expect(parseNaturalDate("team sync wednesday", now)?.value).toBe("2026-10-07");
    expect(parseNaturalDate("standup monday", now)?.value).toBe("2026-10-05");
  });

  it("\"next\" pushes a same-day weekday out a full week", () => {
    expect(parseNaturalDate("standup next monday", now)?.value).toBe("2026-10-12");
  });

  it("understands in N days/weeks", () => {
    expect(parseNaturalDate("follow up in 3 days", now)?.value).toBe("2026-10-08");
    expect(parseNaturalDate("check back in 2 weeks", now)?.value).toBe("2026-10-19");
  });

  it("combines a date with a time of day", () => {
    const r = parseNaturalDate("send the quote tomorrow 6pm", now);
    expect(r?.value).toBe("2026-10-06T18:00:00+08:00");
    expect(r?.matched).toContain("tomorrow");
    expect(r?.matched).toContain("6pm");
  });

  it("understands noon and midnight", () => {
    expect(parseNaturalDate("lunch today at noon", now)?.value).toBe("2026-10-05T12:00:00+08:00");
  });

  it("a bare time with no date means today, or tomorrow once that time has passed", () => {
    // now is 3:53pm Perth, so 6pm is still ahead today
    expect(parseNaturalDate("call back at 6pm", now)?.value).toBe("2026-10-05T18:00:00+08:00");
    // 9am has already passed today
    expect(parseNaturalDate("call back at 9am", now)?.value).toBe("2026-10-06T09:00:00+08:00");
  });

  it("understands 24-hour times", () => {
    expect(parseNaturalDate("meeting at 18:30", now)?.value).toBe("2026-10-05T18:30:00+08:00");
  });
});
