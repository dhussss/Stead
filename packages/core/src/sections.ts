/** Helpers for the fixed-meaning "## Heading" sections in an item body (see docs/item-format.md). */

function findSection(lines: string[], heading: string): { start: number; end: number } | null {
  const start = lines.findIndex((l) => l.trim() === `## ${heading}`);
  if (start < 0) return null;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^#{1,2} /.test(lines[i]!)) {
      end = i;
      break;
    }
  }
  return { start, end };
}

/** Text of a section, without its heading. Undefined when the section doesn't exist. */
export function getSection(body: string, heading: string): string | undefined {
  const lines = body.split("\n");
  const s = findSection(lines, heading);
  if (!s) return undefined;
  return lines
    .slice(s.start + 1, s.end)
    .join("\n")
    .trim();
}

/** Replace a section's text, or add the section at the end of the body. */
export function setSection(body: string, heading: string, content: string): string {
  const lines = body.split("\n");
  const s = findSection(lines, heading);
  const block = [`## ${heading}`, "", content.trim()];
  if (!s) return [body.trimEnd(), "", ...block].join("\n").trim();
  const before = lines.slice(0, s.start);
  const after = lines.slice(s.end);
  return [...before, ...block, ...(after.length ? ["", ...after] : [])].join("\n").trim();
}

/** Add a line to the end of a section, creating it if needed. Used for the Thread. */
export function appendToSection(body: string, heading: string, line: string): string {
  const existing = getSection(body, heading);
  return setSection(body, heading, existing ? `${existing}\n${line}` : line);
}
