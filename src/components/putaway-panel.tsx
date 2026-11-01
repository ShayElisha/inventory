"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, Select } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";
import { MapPin } from "lucide-react";

type Loc = { id: string; code: string };
type Line = {
  id: string;
  qtyReceived: number;
  suggestedLocationId: string | null;
  variant: { sku: string; product: { title: string } };
  receipt: { number: string; receivedAt: string | null };
};

export function PutawayPanel() {
  const router = useRouter();
  const [pending, setPending] = useState<Line[]>([]);
  const [locations, setLocations] = useState<Loc[]>([]);
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/putaway");
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "שגיאה");
      return;
    }
    setPending(data.pending || []);
    setLocations(data.locations || []);
    const next: Record<string, string> = {};
    for (const line of data.pending || []) {
      next[line.id] = line.suggestedLocationId || "";
    }
    setChoices(next);
  }

  useEffect(() => {
    void load();
  }, []);

  async function confirm(lineId: string) {
    const toLocationId = choices[lineId];
    if (!toLocationId) {
      setError("בחרו מיקום יעד");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/putaway", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirm",
          receiptLineId: lineId,
          toLocationId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      await load();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  async function skip(lineId: string) {
    setLoading(true);
    try {
      await fetch("/api/putaway", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "skip", receiptLineId: lineId }),
      });
      await load();
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-3 flex items-center gap-2">
          <MapPin className="h-5 w-5 text-[var(--accent)]" />
          <div>
            <h2 className="font-display text-lg font-semibold">השמה למדף</h2>
            <p className="text-sm text-[var(--muted)]">
              אחרי קליטה בלי מיקום — אשרו מיקום מוצע או בחרו אחר
            </p>
          </div>
        </div>
        {error && <p className="mb-3 text-sm text-[var(--danger)]">{error}</p>}
        {pending.length === 0 ? (
          <p className="py-6 text-center text-sm text-[var(--muted)]">
            אין פריטים ממתינים להשמה
          </p>
        ) : (
          <ul className="space-y-3">
            {pending.map((line) => (
              <li
                key={line.id}
                className="rounded-xl border border-[var(--border)] p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-medium">
                      {line.variant.product.title}{" "}
                      <span className="font-mono text-sm text-[var(--muted)]">
                        {line.variant.sku}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--muted)]">
                      {line.receipt.number}
                      {line.receipt.receivedAt
                        ? ` · ${formatDateTime(line.receipt.receivedAt)}`
                        : ""}
                    </p>
                  </div>
                  <Badge tone="warn">{line.qtyReceived} יח׳</Badge>
                </div>
                <div className="mt-3 flex flex-wrap items-end gap-2">
                  <div className="min-w-[160px] flex-1">
                    <Select
                      value={choices[line.id] || ""}
                      onChange={(e) =>
                        setChoices({ ...choices, [line.id]: e.target.value })
                      }
                    >
                      <option value="">בחרו מיקום</option>
                      {locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.code}
                          {line.suggestedLocationId === loc.id ? " (מוצע)" : ""}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <Button
                    size="sm"
                    disabled={loading}
                    onClick={() => confirm(line.id)}
                  >
                    אשר השמה
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={loading}
                    onClick={() => skip(line.id)}
                  >
                    דלג
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
