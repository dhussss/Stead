import { DEFAULT_TZ, localDate, offsetMinutes } from "./time";

export interface ParsedDate {
  /** A date or datetime in the same shape the `due` field expects. */
  value: string;
  /** The substring that was understood, so the UI can show what it matched. */
  matched: string;
}

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function nextWeekday(fromDate: string, target: number, forceNextWeek: boolean): string {
  const current = new Date(`${fromDate}T00:00:00Z`).getUTCDay();
  let diff = (target - current + 7) % 7;
  if (diff === 0 && forceNextWeek) diff = 7;
  return addDays(fromDate, diff);
}

function offsetSuffix(date: Date, timeZone: string): string {
  const off = offsetMinutes(date, timeZone);
  const sign = off >= 0 ? "+" : "-";
  const abs = Math.abs(off);
  return `${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
}

/** A time of day like "3pm", "3:30pm", "15:00", "noon", "midnight". Returns 24h "HH:MM". */
function matchTime(text: string): { time: string; matched: string } | null {
  const noon = /\bnoon\b/i.exec(text);
  if (noon) return { time: "12:00", matched: noon[0] };
  const midnight = /\bmidnight\b/i.exec(text);
  if (midnight) return { time: "00:00", matched: midnight[0] };
  const ampm = /\b(\d{1,2})(?::([0-5]\d))?\s*(am|pm)\b/i.exec(text);
  if (ampm) {
    let h = Number(ampm[1]) % 12;
    if (/pm/i.test(ampm[3]!)) h += 12;
    return { time: `${String(h).padStart(2, "0")}:${ampm[2] ?? "00"}`, matched: ampm[0] };
  }
  const h24 = /\b([01]?\d|2[0-3]):([0-5]\d)\b/.exec(text);
  if (h24) return { time: `${h24[1]!.padStart(2, "0")}:${h24[2]}`, matched: h24[0] };
  return null;
}

/**
 * A deliberately small local parser for the common ways Dan phrases a date while capturing:
 * today/tomorrow, a weekday (optionally "next"), "in N days/weeks", and a time of day. Claude
 * only gets involved for type, area and people — dates are cheap enough to do without it.
 * Returns null when nothing recognisable is found.
 */
export function parseNaturalDate(text: string, now: Date = new Date(), timeZone: string = DEFAULT_TZ): ParsedDate | null {
  const today = localDate(now, timeZone);
  let date: string | null = null;
  let dateMatch = "";

  const inWeeks = /\bin\s+(\d+)\s+weeks?\b/i.exec(text);
  const inDays = /\bin\s+(\d+)\s+days?\b/i.exec(text);
  const tomorrow = /\btomorrow\b/i.exec(text);
  const todayWord = /\btoday\b/i.exec(text);
  const weekday = /\b(next\s+|this\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i.exec(text);

  if (inWeeks) {
    date = addDays(today, Number(inWeeks[1]) * 7);
    dateMatch = inWeeks[0];
  } else if (inDays) {
    date = addDays(today, Number(inDays[1]));
    dateMatch = inDays[0];
  } else if (tomorrow) {
    date = addDays(today, 1);
    dateMatch = tomorrow[0];
  } else if (todayWord) {
    date = today;
    dateMatch = todayWord[0];
  } else if (weekday) {
    const target = WEEKDAYS.indexOf(weekday[2]!.toLowerCase());
    date = nextWeekday(today, target, /next/i.test(weekday[1] ?? ""));
    dateMatch = weekday[0];
  }

  const time = matchTime(text);
  if (!date && !time) return null;
  if (date && time) {
    return { value: `${date}T${time.time}:00${offsetSuffix(now, timeZone)}`, matched: `${dateMatch} ${time.matched}`.trim() };
  }
  if (date) return { value: date, matched: dateMatch };

  // A bare time with no date means today, or tomorrow if that time has already passed.
  const todayCandidate = `${today}T${time!.time}:00${offsetSuffix(now, timeZone)}`;
  const value = Date.parse(todayCandidate) < now.getTime() ? `${addDays(today, 1)}T${time!.time}:00${offsetSuffix(now, timeZone)}` : todayCandidate;
  return { value, matched: time!.matched };
}
