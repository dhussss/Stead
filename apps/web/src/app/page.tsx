import { isoLocal, needsYou, urgency, type Item } from "@stead/core";
import { CaptureBox } from "./capture-box";
import { openVault } from "@/lib/vault";

export const dynamic = "force-dynamic";

function rowStyle(item: Item, now: Date): React.CSSProperties {
  const u = urgency(item.fields, now);
  if (u.band === "soon") {
    // Amber toward red as the due date nears.
    const pct = Math.round(u.heat * 100);
    return { background: `color-mix(in srgb, var(--urgent-red) ${pct}%, var(--urgent-amber))`, color: "#fff" };
  }
  if (u.band === "due" || u.band === "overdue") return { background: "var(--urgent-red)", color: "#fff" };
  return {};
}

function dueLabel(item: Item, now: Date): string {
  const u = urgency(item.fields, now);
  if (u.daysLeft === undefined) return "";
  if (u.band === "overdue") return `${-u.daysLeft || "<1"} day${u.daysLeft === -1 ? "" : "s"} overdue`;
  if (u.band === "due") return "Today";
  return u.daysLeft === 1 ? "Tomorrow" : `In ${u.daysLeft} days`;
}

export default async function Home() {
  const { vault, report } = await openVault();
  const items = (await vault.index.all()).map((e) => e.item);
  const now = new Date();
  const hour = Number(isoLocal(now).slice(11, 13));
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const titleOf = new Map(items.map((i) => [i.slug, i.fields.title]));

  const attention = items
    .filter((i) => needsYou(i.fields, now))
    .sort((a, b) => (urgency(a.fields, now).daysLeft ?? 99) - (urgency(b.fields, now).daysLeft ?? 99));
  const inbox = items.filter((i) => i.fields.type === "capture" && i.fields.state === "open");

  return (
    <div className="frame">
      <nav className="sidebar">Stead</nav>
      <main className="panel">
        <h1>{greeting}, Dan</h1>
        <p className="sub">
          Phase 0 skeleton: {report.indexed} items read from the sample vault
          {report.errors.length ? `, ${report.errors.length} files need attention` : ""}.
        </p>

        <CaptureBox />

        <h2>Needs you</h2>
        {attention.length === 0 && <p className="sub">Nothing has crossed the line.</p>}
        {attention.map((i) => (
          <div key={i.fields.id} className={`row ${urgency(i.fields, now).band === "overdue" ? "overdue" : ""}`} style={rowStyle(i, now)}>
            <span className="title">{i.fields.title}</span>
            {[...(i.fields.areas ?? []), ...(i.fields.people ?? [])].map((s) => (
              <span key={s} className="chip">{titleOf.get(s) ?? s}</span>
            ))}
            <span className="when" style={{ color: "inherit" }}>{dueLabel(i, now)}</span>
          </div>
        ))}

        <h2>Inbox</h2>
        {inbox.map((i) => (
          <div key={i.fields.id} className="row">
            <span className="title">{i.fields.title}</span>
          </div>
        ))}
      </main>
    </div>
  );
}
