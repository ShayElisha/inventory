"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label } from "@/components/ui";
import { parseJsonArray } from "@/lib/json";

type Category = {
  id: string;
  name: string;
  hasVariants: boolean;
  attributeSchema: string;
};

export function SetupPanel({
  categories,
  suppliers,
}: {
  categories: Category[];
  suppliers: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [catName, setCatName] = useState("");
  const [hasVariants, setHasVariants] = useState(false);
  const [attrs, setAttrs] = useState("");
  const [supName, setSupName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: catName,
          hasVariants,
          attributeSchema: attrs,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      setCatName("");
      setAttrs("");
      setHasVariants(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  async function addSupplier(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: supName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      setSupName("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-lg font-semibold">קטגוריה חדשה</h2>
          <form onSubmit={addCategory} className="space-y-3">
            <div>
              <Label>שם</Label>
              <Input
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                required
                placeholder="למשל: ביגוד / אביזרים"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={hasVariants}
                onChange={(e) => setHasVariants(e.target.checked)}
              />
              מוצרים בקטגוריה זו מתפצלים לוריאציות
            </label>
            {hasVariants && (
              <div>
                <Label>מאפיינים (מופרדים בפסיק)</Label>
                <Input
                  value={attrs}
                  onChange={(e) => setAttrs(e.target.value)}
                  placeholder="Size, Color, Fit"
                />
              </div>
            )}
            <Button type="submit" disabled={loading}>
              הוסף קטגוריה
            </Button>
          </form>

          <ul className="mt-6 space-y-2 border-t border-slate-100 pt-4">
            {categories.length === 0 && (
              <li className="text-sm text-slate-500">אין קטגוריות עדיין</li>
            )}
            {categories.map((c) => (
              <li key={c.id} className="text-sm">
                <span className="font-medium">{c.name}</span>
                {c.hasVariants && (
                  <span className="text-slate-500">
                    {" "}
                    · {parseJsonArray(c.attributeSchema).join(", ") || "וריאציות"}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold">ספק חדש</h2>
          <form onSubmit={addSupplier} className="space-y-3">
            <div>
              <Label>שם ספק</Label>
              <Input
                value={supName}
                onChange={(e) => setSupName(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={loading}>
              הוסף ספק
            </Button>
          </form>

          <ul className="mt-6 space-y-2 border-t border-slate-100 pt-4">
            {suppliers.length === 0 && (
              <li className="text-sm text-slate-500">אין ספקים עדיין</li>
            )}
            {suppliers.map((s) => (
              <li key={s.id} className="text-sm font-medium">
                {s.name}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
