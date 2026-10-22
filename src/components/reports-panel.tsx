"use client";

import { useEffect, useState } from "react";
import { Badge, Button, Card, Input, Label, Select } from "@/components/ui";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { reasonLabel } from "@/lib/constants";

type Report = {
  from: string;
  to: string;
  byType: Record<string, number>;
  top20: { sku: string; title: string; qty: number }[];
  waste: {
    sku: string;
    title: string;
    qty: number;
    reason: string;
    reasonCode: string | null;
    at: string;
  }[];
  valueByCategory: { name: string; qty: number; cost: number; sell: number }[];
  deadStock: {
    sku: string;
    title: string;
    qty: number;
    lastMovement: string | null;
  }[];
  trend: { day: string; delta: number }[];
  compare: {
    currentAbs: number;
    previousAbs: number;
    prevFrom: string;
    prevTo: string;
  };
  accuracy: { id: string; name: string; accuracyPct: number; exact: number; lines: number }[];
  movements: {
    id: string;
    type: string;
    sku: string;
    title: string;
    qty: number;
    reason: string;
    reasonCode: string | null;
    at: string;
  }[];
};

export function ReportsPanel() {
  const [period, setPeriod] = useState("today");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [deadDays, setDeadDays] = useState("30");
  const [data, setData] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const sp = new URLSearchParams({ period, deadDays });
    if (from) sp.set("from", from);
    if (to) sp.set("to", to);
    const res = await fetch(`/api/reports/summary?${sp}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const maxTrend = Math.max(...(data?.trend.map((t) => Math.abs(t.delta)) || [1]), 1);

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-end gap-3">
        <div>
          <Label>תקופה</Label>
          <Select value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="today">היום</option>
            <option value="week">שבוע</option>
            <option value="month">חודש</option>
          </Select>
        </div>
        <div>
          <Label>מ־תאריך</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <Label>עד תאריך</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div>
          <Label>מלאי מת (ימים)</Label>
          <Input value={deadDays} onChange={(e) => setDeadDays(e.target.value)} className="w-24" />
        </div>
        <Button onClick={load} disabled={loading}>
          {loading ? "טוען..." : "הצג"}
        </Button>
        <a
          href="/api/export/excel?type=transactions"
          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium hover:bg-[var(--surface-2)]"
        >
          Excel תנועות
        </a>
        <a
          href="/api/export/excel?type=catalog"
          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium hover:bg-[var(--surface-2)]"
        >
          Excel קטלוג
        </a>
      </Card>

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(data.byType).map(([type, qty]) => (
              <Card key={type}>
                <div className="text-sm text-[var(--muted)]">{type}</div>
                <div className="mt-1 text-2xl font-bold">{qty}</div>
              </Card>
            ))}
            <Card>
              <div className="text-sm text-[var(--muted)]">השוואת תקופות (נפח מוחלט)</div>
              <div className="mt-1 text-2xl font-bold">{data.compare.currentAbs}</div>
              <div className="text-xs text-[var(--muted)]">
                קודם: {data.compare.previousAbs} (
                {data.compare.previousAbs
                  ? `${Math.round(
                      ((data.compare.currentAbs - data.compare.previousAbs) /
                        data.compare.previousAbs) *
                        100
                    )}%`
                  : "—"}
                )
              </div>
            </Card>
          </div>

          <Card>
            <h2 className="mb-3 text-lg font-semibold">מגמת מלאי (שינוי יומי)</h2>
            <div className="flex h-40 items-end gap-1">
              {data.trend.length === 0 && (
                <p className="text-sm text-[var(--muted)]">אין נתונים בתקופה</p>
              )}
              {data.trend.map((t) => (
                <div key={t.day} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className={`w-full rounded-t ${
                      t.delta >= 0 ? "bg-teal-600" : "bg-[var(--danger-soft)]0"
                    }`}
                    style={{
                      height: `${Math.max(8, (Math.abs(t.delta) / maxTrend) * 120)}px`,
                    }}
                    title={`${t.day}: ${t.delta}`}
                  />
                  <span className="text-[9px] text-[var(--muted)]">{t.day.slice(5)}</span>
                </div>
              ))}
            </div>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <h2 className="mb-3 font-semibold">Top 20 ניפוקים</h2>
              <ul className="space-y-2 text-sm">
                {data.top20.map((t, i) => (
                  <li key={t.sku} className="flex justify-between gap-2 border-b border-[var(--border)] pb-2">
                    <span>
                      {i + 1}. {t.title}{" "}
                      <span className="font-mono text-xs text-[var(--muted)]">{t.sku}</span>
                    </span>
                    <strong>{t.qty}</strong>
                  </li>
                ))}
                {data.top20.length === 0 && (
                  <li className="text-[var(--muted)]">אין ניפוקים בתקופה</li>
                )}
              </ul>
            </Card>

            <Card>
              <h2 className="mb-3 font-semibold">שווי מלאי לפי קטגוריה</h2>
              <ul className="space-y-2 text-sm">
                {data.valueByCategory.map((c) => (
                  <li key={c.name} className="flex justify-between border-b border-[var(--border)] pb-2">
                    <span>
                      {c.name} · {c.qty} יח׳
                    </span>
                    <span>
                      {formatCurrency(c.cost)} / {formatCurrency(c.sell)}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card>
              <h2 className="mb-3 font-semibold">פחת ונזקים</h2>
              <ul className="space-y-2 text-sm">
                {data.waste.map((w, i) => (
                  <li key={i} className="border-b border-[var(--border)] pb-2">
                    {w.title} · {w.sku} · {w.qty} · {reasonLabel(w.reasonCode)} ·{" "}
                    {formatDateTime(w.at)}
                  </li>
                ))}
                {data.waste.length === 0 && (
                  <li className="text-[var(--muted)]">אין רשומות פחת/נזק</li>
                )}
              </ul>
            </Card>

            <Card>
              <h2 className="mb-3 font-semibold">מלאי מת</h2>
              <ul className="max-h-64 space-y-2 overflow-y-auto text-sm">
                {data.deadStock.map((d) => (
                  <li key={d.sku} className="flex justify-between border-b border-[var(--border)] pb-2">
                    <span>
                      {d.title} · {d.sku}
                    </span>
                    <span>{d.qty}</span>
                  </li>
                ))}
                {data.deadStock.length === 0 && (
                  <li className="text-[var(--muted)]">אין מלאי מת</li>
                )}
              </ul>
            </Card>

            <Card>
              <h2 className="mb-3 font-semibold">דיוק ספירות (%)</h2>
              <ul className="space-y-2 text-sm">
                {data.accuracy.map((a) => (
                  <li key={a.id} className="flex justify-between">
                    <span>{a.name}</span>
                    <Badge tone={a.accuracyPct >= 95 ? "ok" : "warn"}>
                      {a.accuracyPct}%
                    </Badge>
                  </li>
                ))}
                {data.accuracy.length === 0 && (
                  <li className="text-[var(--muted)]">אין ספירות סגורות</li>
                )}
              </ul>
            </Card>

            <Card className="lg:col-span-2 overflow-x-auto">
              <h2 className="mb-3 font-semibold">תנועות לפי תאריך/סוג</h2>
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="text-right text-[var(--muted)]">
                    <th className="pb-2">זמן</th>
                    <th className="pb-2">סוג</th>
                    <th className="pb-2">מוצר</th>
                    <th className="pb-2">שינוי</th>
                    <th className="pb-2">סיבה</th>
                  </tr>
                </thead>
                <tbody>
                  {data.movements.slice(0, 50).map((m) => (
                    <tr key={m.id} className="border-t border-[var(--border)]">
                      <td className="py-2">{formatDateTime(m.at)}</td>
                      <td className="py-2">
                        <Badge>{m.type}</Badge>
                      </td>
                      <td className="py-2">
                        {m.title} · {m.sku}
                      </td>
                      <td className="py-2 font-mono">{m.qty}</td>
                      <td className="py-2">
                        {m.reason}
                        {m.reasonCode ? ` (${reasonLabel(m.reasonCode)})` : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
