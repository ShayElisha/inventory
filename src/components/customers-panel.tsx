"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, Input, Label, Select } from "@/components/ui";
import { Contact } from "lucide-react";

type PriceListOpt = { id: string; name: string };

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  taxId: string | null;
  creditLimit: number | null;
  notes: string | null;
  active: boolean;
  priceList: PriceListOpt | null;
  _count: { salesOrders: number; waitlistItems: number };
};

export function CustomersPanel({
  customers,
  priceLists,
}: {
  customers: Customer[];
  priceLists: PriceListOpt[];
}) {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [taxId, setTaxId] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [priceListId, setPriceListId] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function createCustomer(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          email,
          address,
          taxId,
          creditLimit: creditLimit || null,
          priceListId: priceListId || null,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      setShow(false);
      setName("");
      setPhone("");
      setEmail("");
      setAddress("");
      setTaxId("");
      setCreditLimit("");
      setPriceListId("");
      setNotes("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(c: Customer) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/customers/${c.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !c.active }),
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--muted)]">
          {customers.length} לקוחות · מחירון ברירת מחדל ומסגרת אשראי
        </p>
        <Button type="button" onClick={() => setShow((v) => !v)}>
          <Contact className="h-4 w-4" />
          לקוח חדש
        </Button>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      {show && (
        <Card>
          <form onSubmit={createCustomer} className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>שם</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <Label>טלפון</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <Label>אימייל</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <Label>ח.פ / עוסק</Label>
              <Input value={taxId} onChange={(e) => setTaxId(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label>כתובת</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div>
              <Label>מסגרת אשראי</Label>
              <Input
                type="number"
                step="0.01"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
              />
            </div>
            <div>
              <Label>מחירון</Label>
              <Select
                value={priceListId}
                onChange={(e) => setPriceListId(e.target.value)}
              >
                <option value="">ללא</option>
                {priceLists.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label>הערות</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit" disabled={loading}>
                שמור
              </Button>
              <Button type="button" variant="secondary" onClick={() => setShow(false)}>
                ביטול
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-[var(--surface-2)] text-right text-[var(--muted)]">
            <tr>
              <th className="px-3 py-2 font-medium">לקוח</th>
              <th className="px-3 py-2 font-medium">טלפון</th>
              <th className="px-3 py-2 font-medium">מחירון</th>
              <th className="px-3 py-2 font-medium">אשראי</th>
              <th className="px-3 py-2 font-medium">הזמנות</th>
              <th className="px-3 py-2 font-medium">סטטוס</th>
              <th className="px-3 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="border-t border-[var(--border)]">
                <td className="px-3 py-2">
                  <div className="font-medium">{c.name}</div>
                  {c.email && (
                    <div className="text-xs text-[var(--muted)]">{c.email}</div>
                  )}
                </td>
                <td className="px-3 py-2">{c.phone || "—"}</td>
                <td className="px-3 py-2">{c.priceList?.name || "—"}</td>
                <td className="px-3 py-2">
                  {c.creditLimit != null ? c.creditLimit.toLocaleString() : "—"}
                </td>
                <td className="px-3 py-2">{c._count.salesOrders}</td>
                <td className="px-3 py-2">
                  <Badge tone={c.active ? "ok" : "neutral"}>
                    {c.active ? "פעיל" : "מושבת"}
                  </Badge>
                </td>
                <td className="px-3 py-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={loading}
                    onClick={() => toggleActive(c)}
                  >
                    {c.active ? "השבת" : "הפעל"}
                  </Button>
                </td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-3 py-8 text-center text-[var(--muted)]"
                >
                  אין לקוחות עדיין
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
