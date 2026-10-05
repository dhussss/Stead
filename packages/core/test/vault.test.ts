import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { backlinks, brokenLinks, getSection, MemoryFileStore, MemoryIndex, Vault, type ItemIndex } from "../src";
import { LocalFileStore } from "../src/node";

let t = Date.parse("2026-10-05T07:53:00Z");
const clock = () => new Date((t += 60_000));

function setup() {
  const files = new MemoryFileStore();
  const index = new MemoryIndex();
  return { files, index, vault: new Vault(files, index, { now: clock }) };
}

describe("vault", () => {
  it("writes the file first, in the type's folder, with Perth timestamps", async () => {
    const { files, vault } = setup();
    const item = await vault.create({ type: "person", title: "Kristian McElhinney", fields: { relation: "Boss, K MAC E" } });
    expect(item.slug).toBe("kristian-mcelhinney");
    const text = files.files.get("people/kristian-mcelhinney.md")!;
    expect(text).toMatch(/created: 2026-10-05T\d\d:\d\d:00\+08:00/);
    expect(text).toContain("relation: Boss, K MAC E");
  });

  it("keeps slugs unique across folders", async () => {
    const { vault } = setup();
    await vault.create({ type: "area", title: "Faith" });
    const note = await vault.create({ type: "note", title: "Faith" });
    expect(note.slug).toBe("faith-2");
  });

  it("refuses to change protected fields and validates patches", async () => {
    const { vault } = setup();
    await vault.create({ type: "task", title: "Log hours" });
    await expect(vault.update("log-hours", { fields: { id: "x" } })).rejects.toThrow(/can't be changed/);
    await expect(vault.update("log-hours", { fields: { due: "next tuesday" } })).rejects.toThrow(/due/);
    const ok = await vault.update("log-hours", { fields: { due: "2026-10-06" } });
    expect(ok.fields.updated > ok.fields.created).toBe(true);
    const cleared = await vault.update("log-hours", { fields: { due: null } });
    expect("due" in cleared.fields).toBe(false);
  });

  it("closes without losing anything, records the reflection, and reopens", async () => {
    const { vault } = setup();
    await vault.create({ type: "task", title: "Book exec dinner", body: "Venue options in the thread." });
    const closed = await vault.close("book-exec-dinner", { reflection: "Booking early made it easy." });
    expect(closed.fields.state).toBe("closed");
    expect(closed.body).toContain("Venue options");
    expect(getSection(closed.body, "Reflection")).toBe("Booking early made it easy.");
    const reopened = await vault.reopen("book-exec-dinner");
    expect(reopened.fields.state).toBe("open");
    expect("closed" in reopened.fields).toBe(false);
  });

  it("appends to the thread", async () => {
    const { vault } = setup();
    await vault.create({ type: "question", title: "Who signs off the P&ID?" });
    await vault.comment("who-signs-off-the-p-and-id", "Dan", "Ask the lead on Monday");
    const item = await vault.comment("who-signs-off-the-p-and-id", "Claude", "Added to Monday's list");
    const thread = getSection(item.body, "Thread")!.split("\n");
    expect(thread).toHaveLength(2);
    expect(thread[0]).toMatch(/^- 2026-10-05 \d\d:\d\d · Dan: Ask the lead on Monday$/);
  });

  it("triages a capture out of the inbox and refuses to retype anything else", async () => {
    const { files, vault } = setup();
    await vault.create({ type: "capture", title: "grab onions from coles" });
    const task = await vault.triage("grab-onions-from-coles", "task", { areas: ["home"] });
    expect(task.fields.type).toBe("task");
    expect(files.files.has("inbox/grab-onions-from-coles.md")).toBe(false);
    expect(files.files.has("tasks/grab-onions-from-coles.md")).toBe(true);
    await expect(vault.triage("grab-onions-from-coles", "note")).rejects.toThrow(/confirmation/);
  });

  it("keeps the write when the index fails, then heals on rebuild", async () => {
    const files = new MemoryFileStore();
    const real = new MemoryIndex();
    let fail = true;
    const flaky: ItemIndex = {
      upsert: async (e) => (fail ? Promise.reject(new Error("db down")) : real.upsert(e)),
      getBySlug: (s) => real.getBySlug(s),
      all: () => real.all(),
      clear: () => real.clear(),
    };
    const vault = new Vault(files, flaky, { now: clock });
    await vault.create({ type: "note", title: "Survives an outage" });
    expect(files.files.has("notes/survives-an-outage.md")).toBe(true);
    expect(vault.staleIndex.has("survives-an-outage")).toBe(true);
    fail = false;
    const report = await vault.rebuildIndex();
    expect(report).toEqual({ indexed: 1, errors: [] });
    expect(vault.staleIndex.size).toBe(0);
  });

  it("rebuilds the index from files and reports bad ones without touching them", async () => {
    const { files, index, vault } = setup();
    await vault.create({ type: "area", title: "Uni" });
    await vault.create({ type: "task", title: "CHPR5522 assignment", fields: { areas: ["uni"] } });
    files.files.set("notes/broken.md", "---\ntype: note\n---\n");
    files.files.set("system/settings.json", "{}");
    await index.clear();
    const report = await vault.rebuildIndex();
    expect(report.indexed).toBe(2);
    expect(report.errors.map((e) => e.path)).toEqual(["notes/broken.md"]);
    expect(files.files.get("notes/broken.md")).toBe("---\ntype: note\n---\n");
  });

  it("finds backlinks and broken links from fields and body", async () => {
    const { index, vault } = setup();
    await vault.create({ type: "person", title: "Kristian McElhinney" });
    await vault.create({
      type: "task",
      title: "Quote Applecross",
      fields: { people: ["kristian-mcelhinney"] },
      body: "See [[applecross-measure-up|the measure-up]].",
    });
    const items = (await index.all()).map((e) => e.item);
    expect(backlinks(items).get("kristian-mcelhinney")).toEqual([
      { from: "quote-applecross", to: "kristian-mcelhinney", kind: "person" },
    ]);
    expect(brokenLinks(items)).toEqual([{ from: "quote-applecross", to: "applecross-measure-up", kind: "body" }]);
  });

  it("has no way to delete", () => {
    const { files } = setup();
    expect("delete" in files).toBe(false);
  });
});

describe("local disk vault", () => {
  it("writes real files and rebuilds from them", async () => {
    const root = await mkdtemp(join(tmpdir(), "stead-"));
    const vault = new Vault(new LocalFileStore(root), new MemoryIndex(), { now: clock });
    await vault.create({ type: "area", title: "Family", fields: { icon: "heart", colour: "#DE7D66", commitment: 10 } });
    const text = await readFile(join(root, "areas", "family.md"), "utf8");
    expect(text).toContain("colour: \"#DE7D66\"");
    const fresh = new Vault(new LocalFileStore(root), new MemoryIndex());
    expect(await fresh.rebuildIndex()).toEqual({ indexed: 1, errors: [] });
    await expect(new LocalFileStore(root).read("../etc/passwd")).rejects.toThrow(/escapes/);
  });
});
