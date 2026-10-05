import { monotonicFactory } from "ulid";
import { ItemFormatError, parseItem, serializeItem } from "./format";
import { FOLDERS, itemPath, parseItemPath, slugify } from "./paths";
import { ITEM_TYPES, ItemFields, type Item, type ItemType } from "./schema";
import { appendToSection, setSection } from "./sections";
import type { FileStore, IndexedItem, ItemIndex } from "./store";
import { DEFAULT_TZ, isoLocal } from "./time";

export interface VaultOptions {
  timeZone?: string;
  /** Injected clock, for tests. */
  now?: () => Date;
}

export interface NewItem {
  type: ItemType;
  title: string;
  body?: string;
  /** Any other fields: areas, people, due, source … */
  fields?: Record<string, unknown>;
  /** Preferred slug; defaults to one made from the title. */
  slug?: string;
}

export interface Patch {
  fields?: Record<string, unknown>;
  body?: string;
}

export interface RebuildReport {
  indexed: number;
  /** Files that couldn't be read as items. They're left untouched and reported, never "fixed" silently. */
  errors: { path: string; message: string }[];
}

/** Fields only the vault sets. A patch can't change them. */
const PROTECTED = new Set(["id", "type", "created", "updated", "closed", "state"]);

/**
 * The headless core's entry point. Every write goes to the file first and the index second,
 * so the files are always the source of truth (constitution, ground rule 3).
 */
export class Vault {
  private readonly tz: string;
  private readonly now: () => Date;
  private readonly newId = monotonicFactory();
  /** Slugs whose index entry failed to update after the file was written. A rebuild clears these. */
  readonly staleIndex = new Set<string>();

  constructor(
    readonly files: FileStore,
    readonly index: ItemIndex,
    opts: VaultOptions = {},
  ) {
    this.tz = opts.timeZone ?? DEFAULT_TZ;
    this.now = opts.now ?? (() => new Date());
  }

  private stamp() {
    return isoLocal(this.now(), this.tz);
  }

  private async slugTaken(slug: string): Promise<boolean> {
    if (await this.index.getBySlug(slug)) return true;
    for (const t of ITEM_TYPES) if (await this.files.exists(itemPath(t, slug))) return true;
    return false;
  }

  private async findPath(slug: string): Promise<string | null> {
    const hit = await this.index.getBySlug(slug);
    if (hit && (await this.files.exists(hit.path))) return hit.path;
    for (const t of ITEM_TYPES) {
      const p = itemPath(t, slug);
      if (await this.files.exists(p)) return p;
    }
    return null;
  }

  private validate(slug: string, fields: Record<string, unknown>) {
    const r = ItemFields.safeParse(fields);
    if (!r.success) {
      throw new ItemFormatError(
        `invalid item "${slug}"`,
        r.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`),
      );
    }
    return r.data;
  }

  /** File first, then index. An index failure never loses the write. */
  private async persist(item: Item, path: string): Promise<Item> {
    await this.files.write(path, serializeItem(item));
    try {
      await this.index.upsert({ item, path });
      this.staleIndex.delete(item.slug);
    } catch {
      this.staleIndex.add(item.slug);
    }
    return item;
  }

  async get(slug: string): Promise<Item | null> {
    const path = await this.findPath(slug);
    if (!path) return null;
    const text = await this.files.read(path);
    return text === null ? null : parseItem(text, slug);
  }

  private async mustGet(slug: string): Promise<{ item: Item; path: string }> {
    const path = await this.findPath(slug);
    const text = path ? await this.files.read(path) : null;
    if (!path || text === null) throw new Error(`no item "${slug}"`);
    return { item: parseItem(text, slug), path };
  }

  async create(input: NewItem): Promise<Item> {
    const base = input.slug ? slugify(input.slug) : slugify(input.title);
    const slug = await uniqueSlugAsync(base, (s) => this.slugTaken(s));
    const ts = this.stamp();
    const extra = Object.fromEntries(Object.entries(input.fields ?? {}).filter(([k]) => !PROTECTED.has(k)));
    const fields = this.validate(slug, {
      ...extra,
      id: this.newId(this.now().getTime()),
      type: input.type,
      title: input.title,
      state: "open",
      created: ts,
      updated: ts,
    });
    return this.persist({ fields, body: (input.body ?? "").trim(), slug }, itemPath(input.type, slug));
  }

  /** Change fields or body. Setting a field to null removes it. */
  async update(slug: string, patch: Patch): Promise<Item> {
    const { item, path } = await this.mustGet(slug);
    const next: Record<string, unknown> = { ...item.fields };
    for (const [k, v] of Object.entries(patch.fields ?? {})) {
      if (PROTECTED.has(k)) throw new Error(`"${k}" can't be changed with update`);
      if (v === null) delete next[k];
      else next[k] = v;
    }
    next.updated = this.stamp();
    const fields = this.validate(slug, next);
    return this.persist({ fields, body: patch.body ?? item.body, slug }, path);
  }

  /** Close an item, keeping everything. A reflection, if given, goes in its ## Reflection section. */
  async close(slug: string, opts: { reflection?: string } = {}): Promise<Item> {
    const { item, path } = await this.mustGet(slug);
    const ts = this.stamp();
    const fields = this.validate(slug, { ...item.fields, state: "closed", closed: ts, updated: ts });
    const body = opts.reflection ? setSection(item.body, "Reflection", opts.reflection) : item.body;
    return this.persist({ fields, body, slug }, path);
  }

  async reopen(slug: string): Promise<Item> {
    const { item, path } = await this.mustGet(slug);
    const next: Record<string, unknown> = { ...item.fields, state: "open", updated: this.stamp() };
    delete next.closed;
    return this.persist({ fields: this.validate(slug, next), body: item.body, slug }, path);
  }

  /** Add a timestamped line to the item's ## Thread. */
  async comment(slug: string, author: string, text: string): Promise<Item> {
    const { item, path } = await this.mustGet(slug);
    const ts = this.stamp();
    const line = `- ${ts.slice(0, 10)} ${ts.slice(11, 16)} · ${author}: ${text.replace(/\s*\n\s*/g, " ").trim()}`;
    const fields = this.validate(slug, { ...item.fields, updated: ts });
    return this.persist({ fields, body: appendToSection(item.body, "Thread", line), slug }, path);
  }

  /** Turn a capture into a typed item. The only everyday case where a file changes folder. */
  async triage(slug: string, type: Exclude<ItemType, "capture">, fields: Record<string, unknown> = {}): Promise<Item> {
    const { item, path } = await this.mustGet(slug);
    if (item.fields.type !== "capture") throw new Error(`"${slug}" isn't a capture; retyping needs Dan's confirmation`);
    const extra = Object.fromEntries(Object.entries(fields).filter(([k]) => !PROTECTED.has(k)));
    const next = this.validate(slug, { ...item.fields, ...extra, type, updated: this.stamp() });
    const to = itemPath(type, slug);
    await this.files.move(path, to);
    return this.persist({ fields: next, body: item.body, slug }, to);
  }

  /** Throw the index away and rebuild it from the files. */
  async rebuildIndex(): Promise<RebuildReport> {
    const entries: IndexedItem[] = [];
    const errors: RebuildReport["errors"] = [];
    for (const folder of Object.values(FOLDERS)) {
      for (const path of await this.files.list(folder)) {
        const loc = parseItemPath(path);
        if (!loc) continue;
        const text = await this.files.read(path);
        if (text === null) continue;
        try {
          const item = parseItem(text, loc.slug);
          if (item.fields.type !== loc.type) {
            errors.push({ path, message: `type "${item.fields.type}" doesn't match folder` });
            continue;
          }
          entries.push({ item, path });
        } catch (e) {
          errors.push({ path, message: e instanceof Error ? e.message : String(e) });
        }
      }
    }
    await this.index.clear();
    for (const e of entries) await this.index.upsert(e);
    this.staleIndex.clear();
    return { indexed: entries.length, errors };
  }
}

async function uniqueSlugAsync(base: string, taken: (s: string) => Promise<boolean>): Promise<string> {
  if (!(await taken(base))) return base;
  for (let n = 2; ; n++) {
    const c = `${base}-${n}`;
    if (!(await taken(c))) return c;
  }
}

