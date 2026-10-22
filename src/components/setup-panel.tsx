"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label } from "@/components/ui";
import { parseJsonArray } from "@/lib/json";
import { Pencil, Trash2, Check, X } from "lucide-react";

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

  const [editCatId, setEditCatId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState("");
  const [editCatHasVariants, setEditCatHasVariants] = useState(false);
  const [editCatAttrs, setEditCatAttrs] = useState("");

  const [editSupId, setEditSupId] = useState<string | null>(null);
  const [editSupName, setEditSupName] = useState("");

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

  function startEditCategory(c: Category) {
    setEditCatId(c.id);
    setEditCatName(c.name);
    setEditCatHasVariants(c.hasVariants);
    setEditCatAttrs(parseJsonArray(c.attributeSchema).join(", "));
  }

  async function saveCategory(id: string) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editCatName,
          hasVariants: editCatHasVariants,
          attributeSchema: editCatAttrs,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      setEditCatId(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  async function deleteCategory(c: Category) {
    if (!confirm(`למחוק את הקטגוריה "${c.name}"?`)) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/categories/${c.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "שגיאה במחיקה");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  async function saveSupplier(id: string) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/suppliers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editSupName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      setEditSupId(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  async function deleteSupplier(s: { id: string; name: string }) {
    if (
      !confirm(
        `למחוק את הספק "${s.name}"? מוצרים מקושרים יישארו ללא ספק.`
      )
    ) {
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/suppliers/${s.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "שגיאה במחיקה");
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

          <ul className="mt-6 space-y-3 border-t border-slate-100 pt-4">
            {categories.length === 0 && (
              <li className="text-sm text-slate-500">אין קטגוריות עדיין</li>
            )}
            {categories.map((c) => (
              <li key={c.id} className="rounded-lg border border-slate-100 p-3">
                {editCatId === c.id ? (
                  <div className="space-y-2">
                    <Input
                      value={editCatName}
                      onChange={(e) => setEditCatName(e.target.value)}
                    />
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={editCatHasVariants}
                        onChange={(e) => setEditCatHasVariants(e.target.checked)}
                      />
                      וריאציות
                    </label>
                    {editCatHasVariants && (
                      <Input
                        value={editCatAttrs}
                        onChange={(e) => setEditCatAttrs(e.target.value)}
                        placeholder="Size, Color"
                      />
                    )}
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={loading}
                        onClick={() => saveCategory(c.id)}
                      >
                        <Check className="h-3.5 w-3.5" />
                        שמור
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => setEditCatId(null)}
                      >
                        <X className="h-3.5 w-3.5" />
                        ביטול
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm">
                      <span className="font-medium">{c.name}</span>
                      {c.hasVariants && (
                        <span className="text-slate-500">
                          {" "}
                          ·{" "}
                          {parseJsonArray(c.attributeSchema).join(", ") ||
                            "וריאציות"}
                        </span>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100"
                        title="עריכה"
                        onClick={() => startEditCategory(c)}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50"
                        title="מחיקה"
                        disabled={loading}
                        onClick={() => deleteCategory(c)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
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

          <ul className="mt-6 space-y-3 border-t border-slate-100 pt-4">
            {suppliers.length === 0 && (
              <li className="text-sm text-slate-500">אין ספקים עדיין</li>
            )}
            {suppliers.map((s) => (
              <li key={s.id} className="rounded-lg border border-slate-100 p-3">
                {editSupId === s.id ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      className="min-w-[140px] flex-1"
                      value={editSupName}
                      onChange={(e) => setEditSupName(e.target.value)}
                    />
                    <Button
                      type="button"
                      size="sm"
                      disabled={loading}
                      onClick={() => saveSupplier(s.id)}
                    >
                      <Check className="h-3.5 w-3.5" />
                      שמור
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => setEditSupId(null)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{s.name}</span>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100"
                        title="עריכה"
                        onClick={() => {
                          setEditSupId(s.id);
                          setEditSupName(s.name);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50"
                        title="מחיקה"
                        disabled={loading}
                        onClick={() => deleteSupplier(s)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
