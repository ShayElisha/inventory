"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, Input, Label, Select } from "@/components/ui";
import { Combine } from "lucide-react";

type Variant = { id: string; sku: string; quantityOnHand: number; product: { title: string } };
type Kit = {
  id: string;
  title: string;
  baseSku: string;
  variants: Variant[];
  kitComponents: {
    id: string;
    quantity: number;
    componentVariant: { id: string; sku: string; quantityOnHand: number; product: { title: string } };
  }[];
};

export function KitsPanel({
  kits,
  variants,
}: {
  kits: Kit[];
  variants: Variant[];
}) {
  const router = useRouter();
  const [kitVariantId, setKitVariantId] = useState(
    kits[0]?.variants[0]?.id || ""
  );
  const [qty, setQty] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function run(action: "assemble" | "disassemble") {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/kits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, kitVariantId, quantity: qty }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  const kitOptions = kits.flatMap((k) =>
    k.variants.map((v) => ({
      id: v.id,
      label: `${k.title} (${v.sku}) · מלאי ${v.quantityOnHand}`,
    }))
  );

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <h2 className="flex items-center gap-2 font-semibold">
          <Combine className="h-4 w-4" />
          הרכבה / פירוק
        </h2>
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <Label>קיט</Label>
            <Select value={kitVariantId} onChange={(e) => setKitVariantId(e.target.value)}>
              {kitOptions.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>כמות</Label>
            <Input
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="button" disabled={loading || !kitVariantId} onClick={() => run("assemble")}>
            הרכב
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={loading || !kitVariantId}
            onClick={() => run("disassemble")}
          >
            פרק
          </Button>
        </div>
      </Card>

      <div className="space-y-3">
        {kits.map((k) => (
          <Card key={k.id}>
            <div className="mb-2 flex items-center gap-2">
              <span className="font-semibold">{k.title}</span>
              <Badge>{k.baseSku}</Badge>
            </div>
            <ul className="text-sm">
              {k.kitComponents.map((c) => (
                <li key={c.id} className="flex justify-between border-t border-[var(--border)] py-1">
                  <span>
                    {c.componentVariant.sku} — {c.componentVariant.product.title}
                  </span>
                  <span className="text-[var(--muted)]">
                    ×{c.quantity} · מלאי {c.componentVariant.quantityOnHand}
                  </span>
                </li>
              ))}
              {k.kitComponents.length === 0 && (
                <li className="text-[var(--muted)]">אין רכיבים — הגדירו במוצר</li>
              )}
            </ul>
          </Card>
        ))}
        {kits.length === 0 && (
          <Card>
            <p className="py-6 text-center text-sm text-[var(--muted)]">
              אין קיטים. סמנו מוצר כקיט והוסיפו רכיבים.
            </p>
            {variants.length === 0 && null}
          </Card>
        )}
      </div>
    </div>
  );
}
