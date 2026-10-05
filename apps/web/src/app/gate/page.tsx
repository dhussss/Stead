"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

const DIGITS = 6;

export default function GatePage() {
  return (
    <Suspense fallback={null}>
      <GateForm />
    </Suspense>
  );
}

function GateForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(next: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: next }),
      });
      if (res.ok) {
        router.replace(params.get("from") || "/");
        router.refresh();
        return;
      }
      const data = await res.json().catch(() => ({}));
      setError(data.error === "locked" ? "Too many wrong tries. Wait 15 minutes." : "Wrong code.");
    } catch {
      setError("Couldn't reach the server. Try again.");
    } finally {
      setCode("");
      setBusy(false);
    }
  }

  function press(d: string) {
    if (busy) return;
    const next = (code + d).slice(0, DIGITS);
    setCode(next);
    if (next.length === DIGITS) submit(next);
  }

  function backspace() {
    if (busy) return;
    setCode(code.slice(0, -1));
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        background: "var(--tint)",
      }}
    >
      <div style={{ display: "flex", gap: 12 }}>
        {Array.from({ length: DIGITS }, (_, i) => (
          <div
            key={i}
            style={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: i < code.length ? "var(--main)" : "var(--light)",
              border: "1px solid var(--main)",
            }}
          />
        ))}
      </div>
      <p style={{ color: "var(--accent-ink)", minHeight: 20, margin: 0, fontSize: 14 }}>{error ?? " "}</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 64px)", gap: 14 }}>
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map((d, i) =>
          d === "" ? (
            <div key={i} />
          ) : (
            <button
              key={i}
              onClick={() => (d === "⌫" ? backspace() : press(d))}
              disabled={busy}
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                border: "none",
                background: "var(--panel)",
                color: "var(--ink)",
                fontSize: 22,
                cursor: busy ? "default" : "pointer",
              }}
            >
              {d}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
