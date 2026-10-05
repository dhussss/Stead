"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface SaveResult {
  dateGuess?: { matched: string } | null;
}

export function CaptureBox() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [result, setResult] = useState<SaveResult | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });
      if (res.ok) {
        const data: SaveResult = await res.json();
        setResult(data);
        setText("");
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ marginBottom: 28 }}>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && save()}
        placeholder="Capture anything…"
        disabled={busy}
        style={{
          width: "100%",
          padding: "12px 16px",
          borderRadius: 12,
          border: "none",
          background: "var(--light)",
          fontSize: 15,
          color: "var(--ink)",
        }}
      />
      {result && (
        <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
          <span className="chip">Saves as capture</span>
          {result.dateGuess && <span className="chip">{result.dateGuess.matched}</span>}
        </div>
      )}
    </div>
  );
}
