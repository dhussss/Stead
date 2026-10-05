/** Builds sample-vault/ with a handful of items, using the core so every file is valid. */
import { rm } from "node:fs/promises";
import { MemoryIndex, Vault } from "../packages/core/src/index.ts";
import { LocalFileStore } from "../packages/core/src/node.ts";

const root = new URL("../sample-vault", import.meta.url).pathname;
// Fixed clock so the sample is reproducible: Mon 5 Oct 2026, 9am Perth.
let t = Date.parse("2026-10-05T01:00:00Z");
const vault = new Vault(new LocalFileStore(root), new MemoryIndex(), { now: () => new Date((t += 60_000)) });

await rm(root, { recursive: true, force: true });
await vault.create({ type: "area", title: "Family", fields: { icon: "heart", colour: "#DE7D66", commitment: 10 }, body: "## Goals & Vision\n\nBe present for Sunday dinners." });
await vault.create({ type: "area", title: "Faith", fields: { icon: "cross", colour: "#A688C8", commitment: 4 } });
await vault.create({ type: "area", title: "Uni", fields: { icon: "mortarboard", colour: "#5689C4", commitment: 25 } });
await vault.create({ type: "area", title: "CHPR5522", fields: { parent: "uni", icon: "book" } });
await vault.create({ type: "area", title: "Body", fields: { icon: "dumbbell", colour: "#6AA59C", commitment: 6 } });
await vault.create({ type: "area", title: "Work", fields: { icon: "hammer" } });
await vault.create({ type: "person", title: "Kristian McElhinney", fields: { aliases: ["Kristian"], relation: "Main builder Dan subcontracts for (K MAC E)" } });
await vault.create({ type: "task", title: "CHPR5522 assignment 2", fields: { areas: ["uni", "chpr5522"], due: "2026-10-09" } });
await vault.create({ type: "task", title: "Send Kristian the Applecross quote", fields: { areas: ["work"], people: ["kristian-mcelhinney"], due: "2026-10-06", when: "2026-10-05T18:00:00+08:00", source: "voice" } });
await vault.create({ type: "task", title: "Renew rego", fields: { due: "2026-11-02" } });
await vault.create({ type: "task", title: "Grab onions from Coles", fields: { areas: ["family"] } });
await vault.create({ type: "question", title: "Who signs off P&IDs on the vacation program?", fields: { areas: ["work"] } });
await vault.create({ type: "capture", title: "idea: keep a list of MMA drills Ryan likes", fields: { source: "phone" } });
console.log("sample vault written to", root);
