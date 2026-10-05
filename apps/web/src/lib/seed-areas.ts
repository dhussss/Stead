import "server-only";
import { slugify, type Vault } from "@stead/core";

interface AreaSeed {
  title: string;
  fields?: Record<string, unknown>;
}

/**
 * The six top-level areas and their known sub-areas (docs/status.md Decisions). Icons and Blend
 * colours are set where docs/design/README.md documents them — the four life-commitment rings
 * (Family, Faith, Uni, Health); everything else is left unstyled for Dan to decide later.
 *
 * Commitment hours aren't invented here: Family carries the 10h/week placeholder already used in
 * the Phase 0 sample vault, since docs/status.md calls out "the Family ring commitment" by name.
 * Faith, Uni and Health have no documented target yet, so their rings stay inactive until Dan
 * sets real numbers.
 */
export const AREA_SEEDS: AreaSeed[] = [
  { title: "Uni", fields: { icon: "mortarboard", colour: "#5689C4" } },
  { title: "Career", fields: { icon: "briefcase" } },
  { title: "Faith", fields: { icon: "cross", colour: "#A688C8" } },
  { title: "Health", fields: { icon: "dumbbell", colour: "#6AA59C" } },
  { title: "Personal", fields: { icon: "compass" } },
  { title: "People", fields: { icon: "users" } },
  { title: "UWAYE", fields: { parent: "uni" } },
  { title: "INPEX", fields: { parent: "career" } },
  { title: "Gyprocking", fields: { parent: "career" } },
  { title: "Training", fields: { parent: "health" } },
  { title: "Exercise", fields: { parent: "health" } },
  { title: "Diet", fields: { parent: "health" } },
  { title: "Sleep", fields: { parent: "health" } },
  { title: "Family", fields: { parent: "people", icon: "heart", colour: "#DE7D66", commitment: 10 } },
];

export interface SeedAreasReport {
  created: string[];
  updated: string[];
}

/** Idempotent: safe to run again, e.g. after adding a new sub-area to the list above. */
export async function seedAreas(vault: Vault): Promise<SeedAreasReport> {
  const created: string[] = [];
  const updated: string[] = [];
  for (const area of AREA_SEEDS) {
    const slug = slugify(area.title);
    const existing = await vault.get(slug);
    if (existing) {
      await vault.update(slug, { fields: area.fields ?? {} });
      updated.push(slug);
    } else {
      await vault.create({ type: "area", title: area.title, fields: area.fields });
      created.push(slug);
    }
  }
  return { created, updated };
}
