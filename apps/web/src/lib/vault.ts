import "server-only";
import path from "node:path";
import { MemoryIndex, Vault } from "@stead/core";
import { LocalFileStore } from "@stead/core/node";
import { createServiceClient, steadOwnerId } from "./supabase/client";
import { SupabaseFileStore } from "./supabase/file-store";
import { SupabaseItemIndex } from "./supabase/item-index";

/**
 * Until SUPABASE_SECRET_KEY and STEAD_OWNER_ID are set, this reads the sample vault from disk
 * (Phase 0). Once they're set, it reads Dan's real vault from Supabase Storage with a Postgres
 * index. Nothing above this file changes either way.
 */
export async function openVault() {
  if (process.env.SUPABASE_SECRET_KEY && process.env.STEAD_OWNER_ID) {
    const owner = steadOwnerId();
    const vault = new Vault(
      new SupabaseFileStore(createServiceClient(), owner),
      new SupabaseItemIndex(createServiceClient(), owner),
    );
    // The Postgres index is persistent and kept current by every write, so it's read as-is
    // rather than rebuilt from storage on every request. Rebuilding is a maintenance operation.
    const indexed = (await vault.index.all()).length;
    return { vault, report: { indexed, errors: [] as { path: string; message: string }[] } };
  }
  const root = process.env.STEAD_VAULT_DIR ?? path.join(process.cwd(), "..", "..", "sample-vault");
  const vault = new Vault(new LocalFileStore(root), new MemoryIndex());
  const report = await vault.rebuildIndex();
  return { vault, report };
}
