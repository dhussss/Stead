import type { ItemType } from "./schema";

/** Folder for each item type. Decided by type alone, so an item's home never moves when its links change. */
export const FOLDERS: Record<ItemType, string> = {
  area: "areas",
  person: "people",
  task: "tasks",
  note: "notes",
  question: "questions",
  decision: "decisions",
  reflection: "reflections",
  learn: "learn",
  capture: "inbox",
};

const TYPE_BY_FOLDER = Object.fromEntries(Object.entries(FOLDERS).map(([t, f]) => [f, t as ItemType]));

export function itemPath(type: ItemType, slug: string): string {
  return `${FOLDERS[type]}/${slug}.md`;
}

/** Read a vault path back into type and slug. Returns null for anything that isn't an item file. */
export function parseItemPath(path: string): { type: ItemType; slug: string } | null {
  const m = /^([a-z]+)\/([a-z0-9-]+)\.md$/.exec(path);
  if (!m) return null;
  const type = TYPE_BY_FOLDER[m[1]!];
  return type ? { type, slug: m[2]! } : null;
}

/** Turn a title into a slug: lowercase ASCII words joined by hyphens, capped at 60 characters. */
export function slugify(title: string): string {
  const s = title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const capped = s.length > 60 ? s.slice(0, 60).replace(/-[^-]*$/, "") || s.slice(0, 60) : s;
  return capped.replace(/-+$/, "") || "untitled";
}

/** First free slug: the base, then base-2, base-3 … Slugs are unique across the whole vault. */
export function uniqueSlug(base: string, taken: (slug: string) => boolean): string {
  if (!taken(base)) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base}-${n}`;
    if (!taken(candidate)) return candidate;
  }
}
