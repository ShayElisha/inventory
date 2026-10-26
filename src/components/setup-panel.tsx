"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label } from "@/components/ui";
import { CategoryAttributesPicker } from "@/components/category-attributes-picker";
import { parseJsonArray } from "@/lib/json";
import { Pencil, Trash2, Check, X } from "lucide-react";

type Category = {
  id: string;
  name: string;
  hasVariants: boolean;
  attributeSchema: string;
};

function attrsFromSchema(raw: string): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (item && typeof item === "object") {
          const o = item as { label?: string; key?: string };
          return String(o.label || o.key || "").trim();
        }
        return "";
      })
      .filter(Boolean);
  } catch {
    return parseJsonArray(raw);
  }
}

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
  const [attrs, setAttrs] = useState<string[]>([]);
  const [supName, setSupName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [editCatId, setEditCatId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState("");
  const [editCatHasVariants, setEditCatHasVariants] = useState(false);
  const [editCatAttrs, setEditCatAttrs] = useState<string[]>([]);

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
      setAttrs([]);
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
    setEditCatAttrs(attrsFromSchema(c.attributeSchema));
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
        <div className="rounded-lg border border-[var(--danger)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
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
              מוצרים בקטגוריה זו מתפצלים לאפשרויות מוצר
            </label>
            {hasVariants && (
              <CategoryAttributesPicker
                value={attrs}
                onChange={setAttrs}
                idPrefix="new-cat"
              />
            )}
            <Button type="submit" disabled={loading}>
              הוסף קטגוריה
            </Button>
          </form>

          <ul className="mt-6 space-y-3 border-t border-[var(--border)] pt-4">
            {categories.length === 0 && (
              <li className="text-sm text-[var(--muted)]">אין קטגוריות עדיין</li>
            )}
            {categories.map((c) => (
              <li key={c.id} className="rounded-lg border border-[var(--border)] p-3">
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
                      אפשרויות מוצר
                    </label>
                    {editCatHasVariants && (
                      <CategoryAttributesPicker
                        value={editCatAttrs}
                        onChange={setEditCatAttrs}
                        idPrefix={`edit-${c.id}`}
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
                    <div className="min-w-0 text-sm">
                      <span className="font-medium">{c.name}</span>
                      {c.hasVariants && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {attrsFromSchema(c.attributeSchema).length ? (
                            attrsFromSchema(c.attributeSchema).map((a) => (
                              <span
                                key={a}
                                className="rounded-full bg-[var(--surface-2)] px-2.5 py-0.5 text-xs text-[var(--muted)] ring-1 ring-[var(--border)]"
                              >
                                {a}
                              </span>
                            ))
                          ) : (
                            <span className="text-[var(--muted)]">
                              אפשרויות מוצר
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--surface-2)]"
                        title="עריכה"
                        onClick={() => startEditCategory(c)}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="rounded-lg p-1.5 text-[var(--danger)] hover:bg-[var(--danger-soft)]"
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

          <ul className="mt-6 space-y-3 border-t border-[var(--border)] pt-4">
            {suppliers.length === 0 && (
              <li className="text-sm text-[var(--muted)]">אין ספקים עדיין</li>
            )}
            {suppliers.map((s) => (
              <li key={s.id} className="rounded-lg border border-[var(--border)] p-3">
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
                        className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--surface-2)]"
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
                        className="rounded-lg p-1.5 text-[var(--danger)] hover:bg-[var(--danger-soft)]"
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
