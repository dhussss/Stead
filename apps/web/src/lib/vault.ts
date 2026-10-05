import "server-only";
import path from "node:path";
import { MemoryIndex, Vault } from "@stead/core";
import { LocalFileStore } from "@stead/core/node";

/**
 * Phase 0 reads the sample vault from disk. Phase 1 swaps in the hosted file store
 * (Supabase Storage) and the Postgres index; nothing above this file changes.
 */
export async function openVault() {
  const root = process.env.STEAD_VAULT_DIR ?? path.join(process.cwd(), "..", "..", "sample-vault");
  const vault = new Vault(new LocalFileStore(root), new MemoryIndex());
  const report = await vault.rebuildIndex();
  return { vault, report };
}
