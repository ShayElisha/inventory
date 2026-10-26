"use client";

import { useEffect, useState } from "react";
import { Button, Card } from "@/components/ui";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";

type PresetCard = {
  id: string;
  name: string;
  tagline: string;
  description: string;
};

export function IndustryPresetsPanel({
  canManage,
  initialProfile,
}: {
  canManage: boolean;
  initialProfile: string | null;
}) {
  const [presets, setPresets] = useState<PresetCard[]>([]);
  const [current, setCurrent] = useState<string | null>(initialProfile);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/setup/industry")
      .then((r) => r.json())
      .then((d) => {
        if (d.presets) setPresets(d.presets);
        if (d.industryProfile) setCurrent(d.industryProfile);
      })
      .catch(() => {});
  }, []);

  async function apply(id: string) {
    if (!canManage) return;
    setBusy(id);
    setError("");
    setMsg("");
    try {
      const res = await fetch("/api/setup/industry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ industryId: id, withSamples: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      setCurrent(id);
      setMsg(
        `הוחלה תבנית ${data.name}: ${data.categoriesCreated} קטגוריות, ${data.locationsCreated} מדפים, ${data.productsCreated} דוגמאות`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="space-y-4">
      <div className="flex items-start gap-3">
        <Sparkles className="mt-0.5 h-5 w-5 text-[var(--accent)]" />
        <div>
          <h2 className="text-lg font-semibold">תבנית ענף</h2>
          <p className="text-sm text-[var(--muted)]">
            בחרו ענף — נגדיר קטגוריות, מדפים ומודולים מתאימים לעסק קטן.
            {current ? (
              <>
                {" "}
                פעיל כעת: <strong>{current}</strong>
              </>
            ) : null}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {presets.map((p) => {
          const active = current === p.id;
          return (
            <div
              key={p.id}
              className={`rounded-xl border p-4 ${
                active
                  ? "border-[var(--accent)] bg-[var(--accent)]/5"
                  : "border-[var(--border)] bg-[var(--surface-2)]"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold">{p.name}</h3>
                {active && (
                  <CheckCircle2 className="h-4 w-4 text-[var(--accent)]" />
                )}
              </div>
              <p className="mt-1 text-sm font-medium text-[var(--muted)]">
                {p.tagline}
              </p>
              <p className="mt-2 text-sm text-[var(--muted)]">{p.description}</p>
              {canManage && (
                <Button
                  className="mt-3 w-full"
                  variant={active ? "secondary" : "primary"}
                  disabled={busy !== null}
                  onClick={() => apply(p.id)}
                >
                  {busy === p.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : active ? (
                    "החל מחדש"
                  ) : (
                    "החל תבנית"
                  )}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {msg && (
        <p className="text-sm text-emerald-700 dark:text-emerald-400">{msg}</p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </Card>
  );
}
