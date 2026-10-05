import "server-only";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ItemFields, outgoingLinks, serializeItem, type IndexedItem, type ItemIndex } from "@stead/core";

/** The fast index: public.items + public.links. Always rebuildable from the files. */
export class SupabaseItemIndex implements ItemIndex {
  constructor(
    private readonly client: SupabaseClient,
    private readonly owner: string,
  ) {}

  async upsert({ item, path }: IndexedItem) {
    const f = item.fields as Record<string, unknown>;
    const row = {
      id: f.id,
      owner: this.owner,
      slug: item.slug,
      path,
      type: f.type,
      title: f.title,
      state: f.state,
      mode: f.mode,
      areas: f.areas ?? [],
      people: f.people ?? [],
      tags: f.tags ?? [],
      due: f.due ?? null,
      when: f.when ?? null,
      confidential: f.confidential ?? false,
      fields: f,
      body: item.body,
      created: f.created,
      updated: f.updated,
      closed: f.closed ?? null,
      file_hash: createHash("sha256").update(serializeItem(item)).digest("hex"),
    };
    const { error: itemError } = await this.client.from("items").upsert(row, { onConflict: "id" });
    if (itemError) throw new Error(`index upsert ${item.slug}: ${itemError.message}`);

    const { error: delError } = await this.client
      .from("links")
      .delete()
      .eq("owner", this.owner)
      .eq("from_slug", item.slug);
    if (delError) throw new Error(`index links clear ${item.slug}: ${delError.message}`);

    const links = outgoingLinks(item).map((l) => ({ owner: this.owner, from_slug: l.from, to_slug: l.to, kind: l.kind }));
    if (links.length) {
      const { error: insError } = await this.client.from("links").insert(links);
      if (insError) throw new Error(`index links insert ${item.slug}: ${insError.message}`);
    }
  }

  async getBySlug(slug: string): Promise<IndexedItem | null> {
    const { data, error } = await this.client
      .from("items")
      .select("path, fields, body, slug")
      .eq("owner", this.owner)
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw new Error(`index getBySlug ${slug}: ${error.message}`);
    return data ? toIndexedItem(data) : null;
  }

  async all(): Promise<IndexedItem[]> {
    const { data, error } = await this.client
      .from("items")
      .select("path, fields, body, slug")
      .eq("owner", this.owner);
    if (error) throw new Error(`index all: ${error.message}`);
    return (data ?? []).map(toIndexedItem);
  }

  async clear() {
    const { error: itemsError } = await this.client.from("items").delete().eq("owner", this.owner);
    if (itemsError) throw new Error(`index clear items: ${itemsError.message}`);
    const { error: linksError } = await this.client.from("links").delete().eq("owner", this.owner);
    if (linksError) throw new Error(`index clear links: ${linksError.message}`);
  }
}

function toIndexedItem(row: { path: string; fields: unknown; body: string; slug: string }): IndexedItem {
  return { item: { fields: ItemFields.parse(row.fields), body: row.body, slug: row.slug }, path: row.path };
}
