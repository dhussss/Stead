import type { Item } from "./schema";

/**
 * Where the files live. This is the source of truth.
 *
 * There is deliberately no delete. Stead never deletes; it closes and archives. A delete, when
 * Dan explicitly asks for one, will be its own audited operation, not part of everyday storage.
 */
export interface FileStore {
  read(path: string): Promise<string | null>;
  write(path: string, text: string): Promise<void>;
  /** Used when a capture is triaged out of the inbox. Fails if the destination exists. */
  move(from: string, to: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  /** Every file path under a folder ("" for the whole vault), relative to the vault root. */
  list(prefix?: string): Promise<string[]>;
}

export interface IndexedItem {
  item: Item;
  path: string;
}

/**
 * The fast index (Postgres in production). Always rebuildable from the files, so it may be
 * thrown away at any time. Keyed by item id; slugs are unique too.
 */
export interface ItemIndex {
  upsert(entry: IndexedItem): Promise<void>;
  getBySlug(slug: string): Promise<IndexedItem | null>;
  all(): Promise<IndexedItem[]>;
  clear(): Promise<void>;
}

/** In-memory file store for tests and local experiments. */
export class MemoryFileStore implements FileStore {
  readonly files = new Map<string, string>();

  async read(path: string) {
    return this.files.get(path) ?? null;
  }
  async write(path: string, text: string) {
    this.files.set(path, text);
  }
  async move(from: string, to: string) {
    const text = this.files.get(from);
    if (text === undefined) throw new Error(`no file at ${from}`);
    if (this.files.has(to)) throw new Error(`${to} already exists`);
    this.files.set(to, text);
    this.files.delete(from);
  }
  async exists(path: string) {
    return this.files.has(path);
  }
  async list(prefix = "") {
    const p = prefix && !prefix.endsWith("/") ? `${prefix}/` : prefix;
    return [...this.files.keys()].filter((k) => k.startsWith(p)).sort();
  }
}

/** In-memory index for tests, and the shape the Postgres index follows. */
export class MemoryIndex implements ItemIndex {
  private byId = new Map<string, IndexedItem>();

  async upsert(entry: IndexedItem) {
    this.byId.set(entry.item.fields.id, entry);
  }
  async getBySlug(slug: string) {
    for (const e of this.byId.values()) if (e.item.slug === slug) return e;
    return null;
  }
  async all() {
    return [...this.byId.values()];
  }
  async clear() {
    this.byId.clear();
  }
}
