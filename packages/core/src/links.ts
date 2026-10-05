import type { Item } from "./schema";

const WIKILINK = /\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]*))?\]\]/g;

/** Slugs linked from the body with [[slug]] or [[slug|text]]. Duplicates removed, order kept. */
export function bodyLinks(body: string): string[] {
  const seen = new Set<string>();
  for (const m of body.matchAll(WIKILINK)) {
    const target = m[1]!.trim();
    if (target) seen.add(target);
  }
  return [...seen];
}

export type LinkKind = "area" | "person" | "link" | "body" | "ask" | "on" | "deck" | "parent" | "supersedes";

export interface Link {
  from: string;
  to: string;
  kind: LinkKind;
}

/** Every outgoing link an item makes, from its fields and its body. */
export function outgoingLinks(item: Item): Link[] {
  const f = item.fields as Record<string, unknown>;
  const out: Link[] = [];
  const add = (to: unknown, kind: LinkKind) => {
    if (typeof to === "string" && to && to !== item.slug) out.push({ from: item.slug, to, kind });
  };
  const addAll = (v: unknown, kind: LinkKind) => Array.isArray(v) && v.forEach((s) => add(s, kind));
  addAll(f.areas, "area");
  addAll(f.people, "person");
  addAll(f.links, "link");
  addAll(f.on, "on");
  add(f.ask, "ask");
  add(f.deck, "deck");
  add(f.parent, "parent");
  add(f.supersedes, "supersedes");
  for (const s of bodyLinks(item.body)) add(s, "body");
  return out;
}

/** Links pointing at a slug that no item has. The Janitor pass reports these. */
export function brokenLinks(items: Item[]): Link[] {
  const known = new Set(items.map((i) => i.slug));
  return items.flatMap(outgoingLinks).filter((l) => !known.has(l.to));
}

/** Map from slug to the links pointing at it. A person's page uses this to show everywhere they appear. */
export function backlinks(items: Item[]): Map<string, Link[]> {
  const map = new Map<string, Link[]>();
  for (const l of items.flatMap(outgoingLinks)) {
    const list = map.get(l.to) ?? [];
    list.push(l);
    map.set(l.to, list);
  }
  return map;
}
