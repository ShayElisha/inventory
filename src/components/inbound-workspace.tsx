"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Badge,
  Button,
  Card,
  Input,
  Label,
  Select,
  Textarea,
} from "@/components/ui";
import { formatDateTime } from "@/lib/utils";
import { PO_STATUSES } from "@/lib/constants";
import { QuickInbound } from "@/components/quick-inbound";
import { PurchaseOrdersPanel } from "@/components/purchase-orders-panel";
import {
  ClipboardList,
  PackagePlus,
  Plus,
  Trash2,
  Zap,
  History,
  FileSpreadsheet,
} from "lucide-react";

type Variant = {
  id: string;
  sku: string;
  barcode: string;
  quantityOnHand: number;
  product: { title: string; trackLots?: boolean; trackSerials?: boolean };
};

type Location = { id: string; code: string };
type Supplier = { id: string; name: string };

type PO = {
  id: string;
  number: string;
  status: string;
  invoiceNumber: string | null;
  supplier: { name: string } | null;
  lines: {
    id: string;
    qtyOrdered: number;
    qtyReceived: number;
    variant: { sku: string; product: { title: string } };
  }[];
};

type RecentTxn = {
  id: string;
  quantityChanged: number;
  reason: string;
  timestamp: string;
  variant: { sku: string; product: { title: string } };
  toLocationId: string | null;
};

type Line = {
  key: string;
  variantId: string;
  quantity: number;
  locationId: string;
  lotCode: string;
  expiryDate: string;
  serialsText: string;
};

const TABS = [
  { id: "full", label: "קליטה מלאה", icon: ClipboardList },
  { id: "po", label: "מול PO", icon: FileSpreadsheet },
  { id: "quick", label: "קליטה מהירה", icon: Zap },
  { id: "history", label: "היסטוריה", icon: History },
] as const;

function newLine(variants: Variant[], locations: Location[]): Line {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    variantId: variants[0]?.id || "",
    quantity: 1,
    locationId: locations[0]?.id || "",
    lotCode: "",
    expiryDate: "",
    serialsText: "",
  };
}

export function InboundWorkspace({
  variants,
  locations,
  suppliers,
  orders,
  recent,
}: {
  variants: Variant[];
  locations: Location[];
  suppliers: Supplier[];
  orders: PO[];
  recent: RecentTxn[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("full");
  const [lines, setLines] = useState<Line[]>([newLine(variants, locations)]);
  const [supplierId, setSupplierId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [reason, setReason] = useState("קליטת סחורה");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");

  const filteredVariants = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return variants;
    return variants.filter(
      (v) =>
        v.sku.toLowerCase().includes(q) ||
        v.barcode.toLowerCase().includes(q) ||
        v.product.title.toLowerCase().includes(q)
    );
  }, [variants, filter]);

  const openPos = orders.filter(
    (o) => o.status === "ORDERED" || o.status === "PARTIAL"
  );

  function updateLine(key: string, patch: Partial<Line>) {
    setLines((prev) =>
      prev.map((l) => (l.key === key ? { ...l, ...patch } : l))
    );
  }

  async function submitFull(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setToast("");
    try {
      const payloadLines = lines
        .filter((l) => l.variantId && l.quantity > 0)
        .map((l) => ({
          variantId: l.variantId,
          quantity: l.quantity,
          locationId: l.locationId || null,
          lotCode: l.lotCode || null,
          expiryDate: l.expiryDate || null,
          serials: l.serialsText
            .split(/[\n,]+/)
            .map((s) => s.trim())
            .filter(Boolean),
        }));
      if (!payloadLines.length) throw new Error("הוסיפו לפחות שורה אחת");

      const res = await fetch("/api/stock/inbound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: payloadLines,
          supplierId: supplierId || null,
          invoiceNumber: invoiceNumber || null,
          notes,
          reason,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");

      const fail = data.failCount || 0;
      setToast(
        fail
          ? `נקלטו ${data.totalQty} יח׳ · ${fail} שורות נכשלו`
          : `נקלטו ${data.totalQty} יח׳ בהצלחה (${data.okCount} שורות)`
      );
      setLines([newLine(variants, locations)]);
      setInvoiceNumber("");
      setNotes("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  const locationCode = (id: string | null) =>
    locations.find((l) => l.id === id)?.code || "—";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition ${
              tab === id
                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
            {id === "po" && openPos.length > 0 && (
              <Badge tone="warn">{openPos.length}</Badge>
            )}
          </button>
        ))}
        <Link
          href="/purchases"
          className="ms-auto inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          ניהול הזמנות רכש ←
        </Link>
      </div>

      {error && (
        <div className="rounded-lg border border-[var(--danger)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
          {error}
        </div>
      )}
      {toast && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-[var(--ok-soft)] dark:text-[var(--ok)]">
          {toast}
        </div>
      )}

      {tab === "full" && (
        <form onSubmit={submitFull} className="space-y-4">
          <Card className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label>ספק</Label>
              <Select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
              >
                <option value="">ללא / לא ידוע</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>מס׳ חשבונית ספק</Label>
              <Input
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="סריקה או הקלדה"
              />
            </div>
            <div>
              <Label>סיבת קליטה</Label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
            <div>
              <Label>הערות</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="משלוח / רציף / הערה"
              />
            </div>
          </Card>

          <Card className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold">
                  שורות קליטה
                </h2>
                <p className="text-sm text-[var(--muted)]">
                  מספר פריטים, מיקומים שונים, אצווה ותוקף לכל שורה
                </p>
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <div>
                  <Label>סינון פריטים</Label>
                  <Input
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    placeholder="שם / מק״ט / ברקוד"
                    className="w-48"
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    setLines((prev) => [...prev, newLine(variants, locations)])
                  }
                >
                  <Plus className="h-4 w-4" />
                  שורה
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {lines.map((line, idx) => {
                const v = variants.find((x) => x.id === line.variantId);
                const showLot = v?.product.trackLots || line.lotCode;
                const showSerial =
                  v?.product.trackSerials || line.serialsText;
                return (
                  <div
                    key={line.key}
                    className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3"
                  >
                    <div className="mb-2 flex items-center justify-between text-xs text-[var(--muted)]">
                      <span>שורה {idx + 1}</span>
                      <button
                        type="button"
                        className="rounded p-1 text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                        onClick={() =>
                          setLines((prev) =>
                            prev.length === 1
                              ? prev
                              : prev.filter((l) => l.key !== line.key)
                          )
                        }
                        title="הסר"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid gap-2 lg:grid-cols-[1.5fr_90px_140px]">
                      <Select
                        value={line.variantId}
                        onChange={(e) =>
                          updateLine(line.key, { variantId: e.target.value })
                        }
                        required
                      >
                        {(filter ? filteredVariants : variants).map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.sku} — {opt.product.title} (מלאי{" "}
                            {opt.quantityOnHand})
                          </option>
                        ))}
                        {/* ensure current selection visible even if filtered out */}
                        {filter &&
                          v &&
                          !filteredVariants.some((x) => x.id === v.id) && (
                            <option value={v.id}>
                              {v.sku} — {v.product.title}
                            </option>
                          )}
                      </Select>
                      <Input
                        type="number"
                        min={1}
                        value={line.quantity}
                        onChange={(e) =>
                          updateLine(line.key, {
                            quantity: Number(e.target.value) || 1,
                          })
                        }
                        required
                      />
                      <Select
                        value={line.locationId}
                        onChange={(e) =>
                          updateLine(line.key, { locationId: e.target.value })
                        }
                      >
                        <option value="">ללא מיקום</option>
                        {locations.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.code}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-3">
                      <div>
                        <Label>אצווה / לוט</Label>
                        <Input
                          value={line.lotCode}
                          onChange={(e) =>
                            updateLine(line.key, { lotCode: e.target.value })
                          }
                          placeholder={showLot ? "חובה למוצר זה" : "אופציונלי"}
                        />
                      </div>
                      <div>
                        <Label>תוקף</Label>
                        <Input
                          type="date"
                          value={line.expiryDate}
                          onChange={(e) =>
                            updateLine(line.key, {
                              expiryDate: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div>
                        <Label>מס׳ סידורי (פסיק / שורה)</Label>
                        <Textarea
                          rows={1}
                          value={line.serialsText}
                          onChange={(e) =>
                            updateLine(line.key, {
                              serialsText: e.target.value,
                            })
                          }
                          placeholder={
                            showSerial ? "כמספר הכמות" : "אופציונלי"
                          }
                          className="min-h-[40px]"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
              <p className="text-sm text-[var(--muted)]">
                {lines.length} שורות · סה״כ{" "}
                {lines.reduce((s, l) => s + (Number(l.quantity) || 0), 0)} יח׳
              </p>
              <Button type="submit" size="lg" disabled={loading || !variants.length}>
                <PackagePlus className="h-5 w-5" />
                {loading ? "קולט..." : "אשר קליטה מלאה"}
              </Button>
            </div>
          </Card>

          {openPos.length > 0 && (
            <Card className="border-[var(--accent)]/25 bg-[var(--accent-soft)]/20">
              <p className="text-sm">
                יש {openPos.length} הזמנות רכש פתוחות לקליטה.{" "}
                <button
                  type="button"
                  className="font-medium text-[var(--accent)] underline"
                  onClick={() => setTab("po")}
                >
                  עבור לקליטה מול PO
                </button>
              </p>
            </Card>
          )}
        </form>
      )}

      {tab === "po" && (
        <PurchaseOrdersPanel
          orders={orders}
          variants={variants}
          locations={locations}
          suppliers={suppliers}
        />
      )}

      {tab === "quick" && <QuickInbound locations={locations} />}

      {tab === "history" && (
        <Card>
          <h2 className="mb-1 font-display text-lg font-semibold">
            קליטות אחרונות
          </h2>
          <p className="mb-4 text-sm text-[var(--muted)]">
            40 תנועות INBOUND אחרונות בחברה
          </p>
          {recent.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">אין קליטות עדיין</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="text-right text-[var(--muted)]">
                    <th className="pb-2 font-medium">זמן</th>
                    <th className="pb-2 font-medium">פריט</th>
                    <th className="pb-2 font-medium">כמות</th>
                    <th className="pb-2 font-medium">מיקום</th>
                    <th className="pb-2 font-medium">סיבה</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((t) => (
                    <tr
                      key={t.id}
                      className="border-t border-[var(--border)]"
                    >
                      <td className="py-2.5 text-xs text-[var(--muted)]">
                        {formatDateTime(t.timestamp)}
                      </td>
                      <td className="py-2.5">
                        <div className="font-medium">
                          {t.variant.product.title}
                        </div>
                        <div className="font-mono text-xs text-[var(--muted)]">
                          {t.variant.sku}
                        </div>
                      </td>
                      <td className="py-2.5 font-semibold text-[var(--ok)]">
                        +{t.quantityChanged}
                      </td>
                      <td className="py-2.5 text-xs">
                        {locationCode(t.toLocationId)}
                      </td>
                      <td className="py-2.5 text-xs text-[var(--muted)]">
                        {t.reason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === "po" && openPos.length > 0 && (
        <p className="text-xs text-[var(--muted)]">
          סטטוסים:{" "}
          {PO_STATUSES.map((s) => s.label).join(" · ")}
        </p>
      )}
    </div>
  );
}
