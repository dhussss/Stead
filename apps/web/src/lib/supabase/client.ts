import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client for server-side use only. It bypasses row-level security, so every
 * query in the adapters below must scope itself to `steadOwnerId()` by hand.
 */
export function createServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

/** The one fixed owner id every row and every vault file is written under (see docs/status.md). */
export function steadOwnerId(): string {
  const id = process.env.STEAD_OWNER_ID;
  if (!id) throw new Error("STEAD_OWNER_ID must be set");
  return id;
}
