import "server-only";
import { parseNaturalDate } from "@stead/core";
import { openVault } from "@/lib/vault";

/**
 * Always files to the inbox as a capture for now. Claude (Haiku) will later turn a confident
 * guess into filing straight to the right type/area/people; until then every capture is
 * "genuinely unclear" by definition (constitution §5), so the inbox is the correct default.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text) return Response.json({ error: "empty" }, { status: 400 });

  const { vault } = await openVault();
  const item = await vault.create({ type: "capture", title: text, fields: { source: "app" } });
  const dateGuess = parseNaturalDate(text);

  return Response.json({ slug: item.slug, title: item.fields.title, dateGuess });
}
