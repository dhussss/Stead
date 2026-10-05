import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { FileStore } from "@stead/core";

const BUCKET = "vault";

/**
 * The hosted vault: Supabase Storage, scoped to one owner's folder. Paths in and out of this
 * class are vault-relative (e.g. "tasks/renew-rego.md"); the owner folder is an implementation
 * detail of where that file actually lives in the bucket.
 */
export class SupabaseFileStore implements FileStore {
  constructor(
    private readonly client: SupabaseClient,
    private readonly owner: string,
  ) {}

  private key(path: string) {
    return `${this.owner}/${path}`;
  }

  private folder(dir: string) {
    return dir ? `${this.owner}/${dir}` : this.owner;
  }

  async read(path: string) {
    const { data, error } = await this.client.storage.from(BUCKET).download(this.key(path));
    if (error) {
      if (isNotFound(error)) return null;
      throw new Error(`read ${path}: ${error.message}`);
    }
    return data.text();
  }

  async write(path: string, text: string) {
    const { error } = await this.client.storage.from(BUCKET).upload(this.key(path), text, {
      contentType: "text/markdown; charset=utf-8",
      upsert: true,
    });
    if (error) throw new Error(`write ${path}: ${error.message}`);
  }

  /** Fails if the destination exists, same contract as LocalFileStore. */
  async move(from: string, to: string) {
    if (await this.exists(to)) throw new Error(`${to} already exists`);
    const { error } = await this.client.storage.from(BUCKET).move(this.key(from), this.key(to));
    if (error) throw new Error(`move ${from} -> ${to}: ${error.message}`);
  }

  async exists(path: string) {
    const slash = path.lastIndexOf("/");
    const dir = slash === -1 ? "" : path.slice(0, slash);
    const name = slash === -1 ? path : path.slice(slash + 1);
    const { data, error } = await this.client.storage.from(BUCKET).list(this.folder(dir), { search: name });
    if (error) throw new Error(`exists ${path}: ${error.message}`);
    return (data ?? []).some((e) => e.name === name && e.id !== null);
  }

  async list(prefix = "") {
    const out: string[] = [];
    const walk = async (dir: string) => {
      let offset = 0;
      for (;;) {
        const { data, error } = await this.client.storage.from(BUCKET).list(this.folder(dir), {
          limit: 1000,
          offset,
          sortBy: { column: "name", order: "asc" },
        });
        if (error) throw new Error(`list ${dir}: ${error.message}`);
        for (const entry of data ?? []) {
          const full = dir ? `${dir}/${entry.name}` : entry.name;
          if (entry.id === null) await walk(full);
          else out.push(full);
        }
        if (!data || data.length < 1000) break;
        offset += 1000;
      }
    };
    await walk(prefix.replace(/\/$/, ""));
    return out.sort();
  }
}

function isNotFound(error: { message?: string }): boolean {
  return /not.?found/i.test(error.message ?? "");
}
