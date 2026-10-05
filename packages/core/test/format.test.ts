import { describe, expect, it } from "vitest";
import { ItemFormatError, parseItem, serializeItem } from "../src";

const EXAMPLE = `---
id: 01JA2ZQ8V4N5W6X7Y8Z9A0B1C2
type: task
title: Send Kristian the quote for the Applecross job
state: open
created: 2026-10-05T15:53:00+08:00
updated: 2026-10-05T15:53:00+08:00
areas: [work]
people: [kristian-mcelhinney]
source: voice
due: 2026-10-08
when: 2026-10-07T18:00:00+08:00
---

Measure-up done Saturday. Needs the cornice line items from [[applecross-measure-up]].

## Thread

- 2026-10-05 15:53 · Dan: He wants it before Thursday
`;

describe("item files", () => {
  it("parses the documented example", () => {
    const item = parseItem(EXAMPLE, "send-kristian-the-quote");
    expect(item.fields.type).toBe("task");
    expect(item.fields.state).toBe("open");
    expect(item.fields.mode).toBe("store");
    if (item.fields.type !== "task") throw new Error();
    expect(item.fields.due).toBe("2026-10-08");
    expect(item.fields.people).toEqual(["kristian-mcelhinney"]);
    expect(item.body.startsWith("Measure-up")).toBe(true);
  });

  it("round-trips byte for byte", () => {
    const item = parseItem(EXAMPLE, "x");
    expect(serializeItem(item)).toBe(EXAMPLE);
  });

  it("keeps unknown fields in place", () => {
    const text = EXAMPLE.replace("source: voice\n", "source: voice\nenergy: low\n");
    const item = parseItem(text, "x");
    expect((item.fields as Record<string, unknown>).energy).toBe("low");
    expect(serializeItem(item)).toContain("energy: low");
  });

  it("orders fields and drops empties and defaults", () => {
    const item = parseItem(EXAMPLE, "x");
    const f = item.fields as Record<string, unknown>;
    const shuffled = { tags: [], title: f.title, due: f.due, ...f, mode: "store", confidential: false };
    const out = serializeItem({ ...item, fields: shuffled as unknown as typeof item.fields });
    expect(out).toBe(EXAMPLE);
  });

  it("writes nested fields in block style", () => {
    const text = `---
id: 01JA2ZQ8V4N5W6X7Y8Z9A0B1C3
type: learn
title: What sets the hydrate formation temperature?
state: open
created: 2026-10-05T15:53:00+08:00
updated: 2026-10-05T15:53:00+08:00
mode: learn
deck: chpr5522
srs:
  due: 2026-10-06T09:00:00+08:00
  stability: 2.3
  difficulty: 5.1
  reps: 1
  lapses: 0
  state: learning
---

## Prompt

What sets the hydrate formation temperature?
`;
    expect(serializeItem(parseItem(text, "x"))).toBe(text);
  });

  it("rejects bad items with readable reasons", () => {
    const bad = EXAMPLE.replace("type: task", "type: chore");
    expect(() => parseItem(bad, "x")).toThrow(ItemFormatError);
    const closedNoStamp = EXAMPLE.replace("state: open", "state: closed");
    expect(() => parseItem(closedNoStamp, "x")).toThrow(/closed timestamp/);
    expect(() => parseItem("no frontmatter here", "x")).toThrow(/no frontmatter/);
    const naiveTime = EXAMPLE.replace("updated: 2026-10-05T15:53:00+08:00", "updated: 2026-10-05T15:53:00");
    expect(() => parseItem(naiveTime, "x")).toThrow(/updated/);
  });

  it("writes items with no body as frontmatter only", () => {
    const item = parseItem(EXAMPLE, "x");
    expect(serializeItem({ ...item, body: "" }).endsWith("---\n")).toBe(true);
  });
});
