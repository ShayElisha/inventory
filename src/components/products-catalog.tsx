"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Card, Select } from "@/components/ui";
import { attributesLabel, formatDateTime } from "@/lib/utils";
import { ChevronDown, ChevronLeft, History } from "lucide-react";
import { unitLabel } from "@/lib/constants";

type Variant = {
  id: string;
  sku: string;
  barcode: string;
  attributes: string;
  quantityOnHand: number;
  quantityReserved: number;
  minAlertLevel: number;
  location: { code: string } | null;
};

type Product = {
  id: string;
  title: string;
  baseSku: string;
  costPrice: number;
  sellingPrice: number;
  unitOfMeasure?: string;
  category: { id: string; name: string; hasVariants: boolean };
  supplier: { id: string; name: string } | null;
  variants: Variant[];
};

type ChangeLog = {
  id: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
  user: { name: string } | null;
};

export function ProductsCatalog({
  products,
  categories,
  suppliers,
  filters,
}: {
  products: Product[];
  categories: { id: string; name: string }[];
  suppliers: { id: string; name: string }[];
  filters: { categoryId?: string; supplierId?: string; lowStock?: string };
}) {
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(products[0]?.id ?? null);
  const [history, setHistory] = useState<ChangeLog[]>([]);
  const [historyFor, setHistoryFor] = useState<string | null>(null);

  useEffect(() => {
    if (!historyFor) return;
    fetch(`/api/products/${historyFor}/history`)
      .then((r) => r.json())
      .then(setHistory)
      .catch(() => setHistory([]));
  }, [historyFor]);

  function updateFilter(key: string, value: string) {
    const sp = new URLSearchParams();
    const next = { ...filters, [key]: value || undefined };
    Object.entries(next).forEach(([k, v]) => {
      if (v) sp.set(k, v);
    });
    router.push(`/products?${sp.toString()}`);
  }

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap gap-3">
        <div className="min-w-[160px] flex-1">
          <Select
            value={filters.categoryId || ""}
            onChange={(e) => updateFilter("categoryId", e.target.value)}
          >
            <option value="">כל הקטגוריות</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="min-w-[160px] flex-1">
          <Select
            value={filters.supplierId || ""}
            onChange={(e) => updateFilter("supplierId", e.target.value)}
          >
            <option value="">כל הספקים</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="min-w-[160px] flex-1">
          <Select
            value={filters.lowStock || ""}
            onChange={(e) => updateFilter("lowStock", e.target.value)}
          >
            <option value="">כל מצבי המלאי</option>
            <option value="1">מלאי נמוך בלבד</option>
          </Select>
        </div>
      </Card>

      <div className="space-y-2">
        {products.length === 0 && (
          <Card>
            <p className="text-sm text-slate-500">לא נמצאו מוצרים</p>
          </Card>
        )}
        {products.map((p) => {
          const open = openId === p.id;
          const totalQty = p.variants.reduce((s, v) => s + v.quantityOnHand, 0);
          const hasLow = p.variants.some((v) => v.quantityOnHand <= v.minAlertLevel);
          return (
            <Card key={p.id} className="p-0 overflow-hidden">
              <button
                type="button"
                className="flex w-full items-center gap-3 px-5 py-4 text-right hover:bg-slate-50"
                onClick={() => setOpenId(open ? null : p.id)}
              >
                {open ? (
                  <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                ) : (
                  <ChevronLeft className="h-4 w-4 shrink-0 text-slate-400" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900">{p.title}</span>
                    <Badge>{p.category.name}</Badge>
                    {hasLow && <Badge tone="danger">מלאי נמוך</Badge>}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    מק״ט בסיס: {p.baseSku} · {p.variants.length} וריאציות · סה״כ{" "}
                    {totalQty} {unitLabel(p.unitOfMeasure || "UNIT")}
                    {p.supplier ? ` · ${p.supplier.name}` : ""}
                  </div>
                </div>
                <div className="hidden text-sm text-slate-600 sm:block">
                  ₪{p.sellingPrice}
                </div>
              </button>

              {open && (
                <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-3">
                  <button
                    type="button"
                    className="mb-3 inline-flex items-center gap-1 text-xs text-teal-700"
                    onClick={() =>
                      setHistoryFor(historyFor === p.id ? null : p.id)
                    }
                  >
                    <History className="h-3.5 w-3.5" />
                    היסטוריית שינויים
                  </button>
                  {historyFor === p.id && (
                    <ul className="mb-4 space-y-1 rounded-lg bg-white p-3 text-xs">
                      {history.length === 0 && (
                        <li className="text-slate-500">אין שינויים מתועדים</li>
                      )}
                      {history.map((h) => (
                        <li key={h.id}>
                          {formatDateTime(h.createdAt)} · {h.user?.name ?? "—"} ·{" "}
                          {h.field}: {h.oldValue ?? "—"} → {h.newValue ?? "—"}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px] text-sm">
                      <thead>
                        <tr className="text-right text-slate-500">
                          <th className="pb-2 font-medium">SKU</th>
                          <th className="pb-2 font-medium">ברקוד</th>
                          <th className="pb-2 font-medium">מאפיינים</th>
                          <th className="pb-2 font-medium">מלאי</th>
                          <th className="pb-2 font-medium">שמור</th>
                          <th className="pb-2 font-medium">מיקום</th>
                        </tr>
                      </thead>
                      <tbody>
                        {p.variants.map((v) => (
                          <tr key={v.id} className="border-t border-slate-100">
                            <td className="py-2 font-mono text-xs">{v.sku}</td>
                            <td className="py-2 font-mono text-xs">{v.barcode}</td>
                            <td className="py-2">{attributesLabel(v.attributes)}</td>
                            <td className="py-2">
                              <Badge
                                tone={
                                  v.quantityOnHand <= v.minAlertLevel ? "danger" : "ok"
                                }
                              >
                                {v.quantityOnHand}
                              </Badge>
                            </td>
                            <td className="py-2">{v.quantityReserved}</td>
                            <td className="py-2">{v.location?.code ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
