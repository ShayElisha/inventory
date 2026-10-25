"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, Input, Select } from "@/components/ui";

type Serial = {
  id: string;
  serial: string;
  status: string;
  variant: { sku: string; product: { title: string } };
  location: { code: string } | null;
  lot: { lotCode: string } | null;
};

const STATUS: Record<string, string> = {
  IN_STOCK: "במלאי",
  SOLD: "נמכר",
  RETURNED: "הוחזר",
  DAMAGED: "פגום",
};

export function SerialsPanel({ serials }: { serials: Serial[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");

  function filter() {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (status) sp.set("status", status);
    router.push(`/serials?${sp.toString()}`);
  }

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-end gap-3">
        <Input
          placeholder="חיפוש סריאלי / מק״ט"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs"
        />
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">כל הסטטוסים</option>
          {Object.entries(STATUS).map(([code, label]) => (
            <option key={code} value={code}>{label}</option>
          ))}
        </Select>
        <Button type="button" onClick={filter}>סנן</Button>
      </Card>
      <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-[var(--surface-2)] text-right text-[var(--muted)]">
            <tr>
              <th className="px-3 py-2 font-medium">סריאלי</th>
              <th className="px-3 py-2 font-medium">מוצר</th>
              <th className="px-3 py-2 font-medium">סטטוס</th>
              <th className="px-3 py-2 font-medium">מיקום</th>
              <th className="px-3 py-2 font-medium">אצווה</th>
            </tr>
          </thead>
          <tbody>
            {serials.map((s) => (
              <tr key={s.id} className="border-t border-[var(--border)]">
                <td className="px-3 py-2 font-mono">{s.serial}</td>
                <td className="px-3 py-2">
                  {s.variant.product.title}{" "}
                  <span className="font-mono text-xs text-[var(--muted)]">{s.variant.sku}</span>
                </td>
                <td className="px-3 py-2">
                  <Badge tone={s.status === "IN_STOCK" ? "ok" : "neutral"}>
                    {STATUS[s.status] || s.status}
                  </Badge>
                </td>
                <td className="px-3 py-2">{s.location?.code || "—"}</td>
                <td className="px-3 py-2">{s.lot?.lotCode || "—"}</td>
              </tr>
            ))}
            {serials.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-[var(--muted)]">
                  אין סריאליים
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
