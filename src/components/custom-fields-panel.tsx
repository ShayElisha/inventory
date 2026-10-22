"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label, Select } from "@/components/ui";
import { CUSTOM_FIELD_TYPES } from "@/lib/custom-fields";
import { ListPlus, Trash2 } from "lucide-react";

type Field = {
  id: string;
  key: string;
  label: string;
  fieldType: string;
  options: string;
  required: boolean;
};

export function CustomFieldsPanel({
  fields,
  canManage,
}: {
  fields: Field[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [fieldType, setFieldType] = useState("TEXT");
  const [optionsText, setOptionsText] = useState("");
  const [required, setRequired] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function addField(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/custom-fields", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label,
          fieldType,
          optionsText,
          required,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      setLabel("");
      setOptionsText("");
      setRequired(false);
      setFieldType("TEXT");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  async function removeField(id: string, name: string) {
    if (!confirm(`להסיר את השדה "${name}"?`)) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/custom-fields/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "שגיאה");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  const typeLabel = (code: string) =>
    CUSTOM_FIELD_TYPES.find((t) => t.code === code)?.label || code;

  return (
    <Card>
      <h2 className="mb-1 flex items-center gap-2 font-display text-lg font-semibold">
        <ListPlus className="h-5 w-5 text-[var(--accent)]" />
        שדות מותאמים למוצרים
      </h2>
      <p className="mb-4 text-sm text-[var(--muted)]">
        הוסיפו שדות כמו «מותג», «ארץ ייצור» או «מס׳ קטלוג ספק» — יופיעו בטופס
        המוצר.
      </p>

      {error && (
        <div className="mb-3 rounded-lg border border-[var(--danger)] bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">
          {error}
        </div>
      )}

      {canManage && (
        <form
          onSubmit={addField}
          className="mb-5 grid gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 sm:grid-cols-2"
        >
          <div>
            <Label>שם השדה</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              required
              placeholder="למשל: מותג"
            />
          </div>
          <div>
            <Label>סוג</Label>
            <Select
              value={fieldType}
              onChange={(e) => setFieldType(e.target.value)}
            >
              {CUSTOM_FIELD_TYPES.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.label}
                </option>
              ))}
            </Select>
          </div>
          {fieldType === "SELECT" && (
            <div className="sm:col-span-2">
              <Label>אפשרויות (מופרדות בפסיק)</Label>
              <Input
                value={optionsText}
                onChange={(e) => setOptionsText(e.target.value)}
                placeholder="אדום, כחול, ירוק"
                required
              />
            </div>
          )}
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={required}
              onChange={(e) => setRequired(e.target.checked)}
            />
            שדה חובה
          </label>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={loading}>
              הוסף שדה
            </Button>
          </div>
        </form>
      )}

      {fields.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">אין שדות מותאמים עדיין</p>
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          {fields.map((f) => (
            <li
              key={f.id}
              className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
            >
              <div>
                <div className="font-medium">
                  {f.label}
                  {f.required && (
                    <span className="ms-1 text-xs text-[var(--danger)]">*</span>
                  )}
                </div>
                <div className="text-xs text-[var(--muted)]">
                  {typeLabel(f.fieldType)} · מפתח: {f.key}
                </div>
              </div>
              {canManage && (
                <button
                  type="button"
                  className="rounded-lg p-1.5 text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                  disabled={loading}
                  onClick={() => removeField(f.id, f.label)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
