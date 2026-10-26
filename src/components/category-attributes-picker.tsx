"use client";

import { useMemo, useState } from "react";
import { Button, Input, Label, Select } from "@/components/ui";
import {
  GLOBAL_CATEGORY_ATTRIBUTES,
  availableAttributes,
  normalizeAttributeLabel,
} from "@/lib/category-attributes";
import { Plus, X } from "lucide-react";

export function CategoryAttributesPicker({
  value,
  onChange,
  idPrefix = "cat-attrs",
}: {
  value: string[];
  onChange: (next: string[]) => void;
  idPrefix?: string;
}) {
  const [custom, setCustom] = useState("");
  const [selectValue, setSelectValue] = useState("");

  const options = useMemo(
    () => availableAttributes(value, GLOBAL_CATEGORY_ATTRIBUTES),
    [value]
  );

  function addAttr(raw: string) {
    const label = normalizeAttributeLabel(raw);
    if (!label) return;
    const exists = value.some(
      (v) => v.toLowerCase() === label.toLowerCase()
    );
    if (exists) return;
    onChange([...value, label]);
  }

  function removeAttr(label: string) {
    onChange(value.filter((v) => v !== label));
  }

  function onSelectChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const v = e.target.value;
    setSelectValue("");
    if (v) addAttr(v);
  }

  function addCustom(e?: React.FormEvent) {
    e?.preventDefault();
    addAttr(custom);
    setCustom("");
  }

  return (
    <div className="space-y-3">
      <Label>מאפיינים</Label>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((attr) => (
            <span
              key={attr}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-3 py-1 text-sm font-medium text-[var(--foreground)]"
            >
              {attr}
              <button
                type="button"
                onClick={() => removeAttr(attr)}
                className="rounded-full p-0.5 text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--danger)]"
                title={`הסר ${attr}`}
                aria-label={`הסר ${attr}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      <Select
        id={`${idPrefix}-select`}
        value={selectValue}
        onChange={onSelectChange}
        aria-label="בחירת מאפיין מהרשימה"
      >
        <option value="">
          {options.length
            ? "בחרו מאפיין מהרשימה…"
            : "כל המאפיינים מהרשימה כבר נבחרו"}
        </option>
        {options.map((attr) => (
          <option key={attr} value={attr}>
            {attr}
          </option>
        ))}
      </Select>

      <div className="flex gap-2">
        <Input
          id={`${idPrefix}-custom`}
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="או הקלידו מאפיין חדש"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustom();
            }
          }}
        />
        <Button
          type="button"
          variant="secondary"
          onClick={() => addCustom()}
          disabled={!normalizeAttributeLabel(custom)}
          title="הוסף מאפיין מותאם"
        >
          <Plus className="h-4 w-4" />
          הוסף
        </Button>
      </div>

      <p className="text-xs text-[var(--muted)]">
        בחירה מהרשימה מוסיפה בועה מעל. אפשר גם להוסיף מאפיין חופשי בטקסט.
      </p>
    </div>
  );
}
