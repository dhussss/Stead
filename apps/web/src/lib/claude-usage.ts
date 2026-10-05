import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_TZ, localDate } from "@stead/core";

/** docs/status.md Decisions: warn at $25, refuse in-app Claude calls once the month hits $50. */
export const WARN_USD = 25;
export const CAP_USD = 50;

export interface UsageStatus {
  spentUSD: number;
  status: "ok" | "warn" | "blocked";
}

/** This calendar month's Claude spend in Perth time. */
export async function monthlyUsageStatus(client: SupabaseClient, owner: string, now: Date = new Date()): Promise<UsageStatus> {
  const monthStart = `${localDate(now, DEFAULT_TZ).slice(0, 7)}-01T00:00:00+08:00`;
  const { data, error } = await client.from("claude_usage").select("cost_usd").eq("owner", owner).gte("at", monthStart);
  if (error) throw new Error(`claude usage lookup: ${error.message}`);
  const spentUSD = (data ?? []).reduce((sum, row) => sum + Number(row.cost_usd), 0);
  const status: UsageStatus["status"] = spentUSD >= CAP_USD ? "blocked" : spentUSD >= WARN_USD ? "warn" : "ok";
  return { spentUSD, status };
}

export interface LogUsageInput {
  job: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cachedTokens?: number;
  costUSD: number;
}

/** Every in-app Claude call logs here first, so the cap in monthlyUsageStatus() stays accurate. */
export async function logClaudeUsage(client: SupabaseClient, owner: string, usage: LogUsageInput): Promise<void> {
  const { error } = await client.from("claude_usage").insert({
    owner,
    job: usage.job,
    model: usage.model,
    input_tokens: usage.inputTokens,
    output_tokens: usage.outputTokens,
    cached_tokens: usage.cachedTokens ?? 0,
    cost_usd: usage.costUSD,
  });
  if (error) throw new Error(`claude usage log: ${error.message}`);
}
