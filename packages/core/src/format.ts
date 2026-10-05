import YAML, { isScalar, isSeq, visit } from "yaml";
import { FIELD_ORDER, ItemFields, OMIT_WHEN_DEFAULT, type Item } from "./schema";

export class ItemFormatError extends Error {
  constructor(
    message: string,
    readonly issues: string[] = [],
  ) {
    super(issues.length ? `${message}: ${issues.join("; ")}` : message);
    this.name = "ItemFormatError";
  }
}

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

/** Split a file into its raw frontmatter object and body, without validating the fields. */
export function splitFile(text: string): { data: Record<string, unknown>; body: string } {
  const m = FRONTMATTER.exec(text);
  if (!m) throw new ItemFormatError("file has no frontmatter");
  // YAML 1.2 core schema: dates stay strings, which is what the schema expects.
  const data = YAML.parse(m[1] ?? "", { schema: "core" }) ?? {};
  if (typeof data !== "object" || Array.isArray(data)) {
    throw new ItemFormatError("frontmatter must be a set of fields");
  }
  const body = (m[2] ?? "").replace(/^\r?\n/, "");
  return { data: data as Record<string, unknown>, body };
}

/** Parse and validate an item file. `slug` is the file name without .md. */
export function parseItem(text: string, slug: string): Item {
  const { data, body } = splitFile(text);
  const result = ItemFields.safeParse(data);
  if (!result.success) {
    throw new ItemFormatError(
      `invalid item "${slug}"`,
      result.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`),
    );
  }
  return { fields: result.data, body: body.replace(/\s+$/, ""), slug };
}

function isEmpty(v: unknown): boolean {
  return v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
}

/** Order fields: known fields in FIELD_ORDER, then unknown ones as found. Drops empties and defaults. */
export function orderFields(fields: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const keep = (k: string) => {
    const v = fields[k];
    if (isEmpty(v)) return false;
    if (k in OMIT_WHEN_DEFAULT && OMIT_WHEN_DEFAULT[k] === v) return false;
    return true;
  };
  for (const k of FIELD_ORDER) if (k in fields && keep(k)) out[k] = fields[k];
  for (const k of Object.keys(fields)) if (!(k in out) && keep(k)) out[k] = fields[k];
  return out;
}

/** Write an item back to file text. Output is deterministic so git diffs stay small. */
export function serializeItem(item: Item): string {
  const doc = new YAML.Document(orderFields(item.fields as Record<string, unknown>));
  // Lists of plain values go on one line ([work, uni]); anything nested stays in block style.
  visit(doc, {
    Seq(_, node) {
      if (isSeq(node) && node.items.every((i) => isScalar(i))) node.flow = true;
    },
  });
  const yaml = doc.toString({ lineWidth: 0, flowCollectionPadding: false }).trimEnd();
  const body = item.body.trim();
  return `---\n${yaml}\n---\n${body ? `\n${body}\n` : ""}`;
}
