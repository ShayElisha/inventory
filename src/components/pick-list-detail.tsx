"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge, Button, Card } from "@/components/ui";
import { attributesLabel } from "@/lib/utils";

type List = {
  id: string;
  status: string;
  items: {
    id: string;
    quantity: number;
    pickedQty: number;
    status: string;
    variant: {
      sku: string;
      quantityOnHand: number;
      attributes: string;
      product: { title: string };
      location: { code: string } | null;
    };
  }[];
};

export function PickListDetail({ list }: { list: List }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function pickItem(itemId: string) {
    setBusy(itemId);
    setError("");
    try {
      const res = await fetch(`/api/picks/${list.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pick_item", itemId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg border border-[var(--danger)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
          {error}
        </div>
      )}
      {list.items.map((it) => (
        <Card key={it.id} className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-semibold">{it.variant.product.title}</div>
            <div className="text-xs text-[var(--muted)]">
              {it.variant.sku} · {attributesLabel(it.variant.attributes)} · מדף{" "}
              {it.variant.location?.code ?? "—"} · במלאי {it.variant.quantityOnHand}
            </div>
            <div className="mt-1 text-sm">
              נדרש {it.quantity} · נלקט {it.pickedQty}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={it.status === "DONE" ? "ok" : "warn"}>{it.status}</Badge>
            {it.status !== "DONE" && list.status !== "CANCELLED" && (
              <Button
                size="sm"
                disabled={busy === it.id}
                onClick={() => pickItem(it.id)}
              >
                {busy === it.id ? "..." : "לקט"}
              </Button>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
