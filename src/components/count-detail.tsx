"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge, Button, Card, Input } from "@/components/ui";

type Session = {
  id: string;
  status: string;
  lines: {
    id: string;
    systemQty: number;
    countedQty: number | null;
    variance: number | null;
    variant: {
      sku: string;
      product: { title: string };
      location: { code: string } | null;
    };
  }[];
};

export function CountDetail({ session }: { session: Session }) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(
      session.lines.map((l) => [l.id, l.countedQty != null ? String(l.countedQty) : ""])
    )
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function saveLine(lineId: string) {
    const countedQty = Number(values[lineId]);
    if (Number.isNaN(countedQty)) return;
    await fetch(`/api/counts/${session.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set_count", lineId, countedQty }),
    });
    router.refresh();
  }

  async function closeAndAdjust() {
    setBusy(true);
    setMsg("");
    try {
      for (const line of session.lines) {
        if (values[line.id] === "") continue;
        await fetch(`/api/counts/${session.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "set_count",
            lineId: line.id,
            countedQty: Number(values[line.id]),
          }),
        });
      }
      const res = await fetch(`/api/counts/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "close_and_adjust" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      setMsg("הספירה נסגרה והמלאי עודכן לפי ההפרשים");
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setBusy(false);
    }
  }

  const counted = session.lines.filter((l) => l.countedQty != null);
  const exact = counted.filter((l) => (l.variance ?? 0) === 0).length;
  const accuracy =
    counted.length > 0 ? Math.round((exact / counted.length) * 100) : null;

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center gap-4">
        <div>
          דיוק ספירה:{" "}
          <strong>{accuracy == null ? "—" : `${accuracy}%`}</strong>
          {counted.length > 0 && (
            <span className="text-sm text-[var(--muted)]">
              {" "}
              ({exact}/{counted.length} מדויקים)
            </span>
          )}
        </div>
        {session.status === "OPEN" && (
          <Button onClick={closeAndAdjust} disabled={busy}>
            סגור ספירה ועדכן מלאי
          </Button>
        )}
        {msg && <p className="text-sm text-[var(--muted)]">{msg}</p>}
      </Card>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b bg-[var(--surface-2)] text-right text-[var(--muted)]">
              <th className="p-3">SKU</th>
              <th className="p-3">מוצר</th>
              <th className="p-3">מיקום</th>
              <th className="p-3">מערכת</th>
              <th className="p-3">נספר</th>
              <th className="p-3">הפרש</th>
            </tr>
          </thead>
          <tbody>
            {session.lines.map((l) => {
              const countedVal = values[l.id];
              const variance =
                countedVal === ""
                  ? null
                  : Number(countedVal) - l.systemQty;
              return (
                <tr key={l.id} className="border-b border-[var(--border)]">
                  <td className="p-3 font-mono text-xs">{l.variant.sku}</td>
                  <td className="p-3">{l.variant.product.title}</td>
                  <td className="p-3">{l.variant.location?.code ?? "—"}</td>
                  <td className="p-3">{l.systemQty}</td>
                  <td className="p-3">
                    {session.status === "OPEN" ? (
                      <Input
                        className="w-24"
                        type="number"
                        min={0}
                        value={countedVal}
                        onChange={(e) =>
                          setValues({ ...values, [l.id]: e.target.value })
                        }
                        onBlur={() => saveLine(l.id)}
                      />
                    ) : (
                      l.countedQty ?? "—"
                    )}
                  </td>
                  <td className="p-3">
                    {variance == null ? (
                      "—"
                    ) : (
                      <Badge tone={variance === 0 ? "ok" : "danger"}>
                        {variance > 0 ? `+${variance}` : variance}
                      </Badge>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
