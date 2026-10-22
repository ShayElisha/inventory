"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label, Select, Textarea } from "@/components/ui";
import { buildVariantSku, generateMatrixCombinations } from "@/lib/sku";
import { parseJsonArray } from "@/lib/json";
import { UNIT_OF_MEASURE } from "@/lib/constants";
import { attributesLabel } from "@/lib/utils";

type Category = {
  id: string;
  name: string;
  hasVariants: boolean;
  attributeSchema: string;
};

type VariantRow = {
  attributes: Record<string, string>;
  sku: string;
  barcode: string;
  quantityOnHand: number;
  locationId: string;
};

type ExistingProduct = {
  id: string;
  title: string;
  baseSku: string;
  description: string | null;
  categoryId: string;
  supplierId: string | null;
  costPrice: number;
  sellingPrice: number;
  unitOfMeasure: string;
  unitsPerCarton: number;
  variants: {
    id: string;
    sku: string;
    barcode: string;
    attributes: string;
    quantityOnHand: number;
    minAlertLevel: number;
    locationId: string | null;
  }[];
};

export function ProductForm({
  categories,
  suppliers,
  locations,
  product,
}: {
  categories: Category[];
  suppliers: { id: string; name: string }[];
  locations: { id: string; code: string }[];
  product?: ExistingProduct;
}) {
  const router = useRouter();
  const isEdit = Boolean(product);
  const [title, setTitle] = useState(product?.title || "");
  const [baseSku, setBaseSku] = useState(product?.baseSku || "");
  const [description, setDescription] = useState(product?.description || "");
  const [categoryId, setCategoryId] = useState(
    product?.categoryId || categories[0]?.id || ""
  );
  const [supplierId, setSupplierId] = useState(product?.supplierId || "");
  const [costPrice, setCostPrice] = useState(String(product?.costPrice ?? 0));
  const [sellingPrice, setSellingPrice] = useState(
    String(product?.sellingPrice ?? 0)
  );
  const [unitOfMeasure, setUnitOfMeasure] = useState(
    product?.unitOfMeasure || "UNIT"
  );
  const [unitsPerCarton, setUnitsPerCarton] = useState(
    String(product?.unitsPerCarton ?? 1)
  );
  const [simpleBarcode, setSimpleBarcode] = useState(
    product?.variants[0]?.barcode || ""
  );
  const [simpleQty, setSimpleQty] = useState("0");
  const [simpleLocationId, setSimpleLocationId] = useState(
    product?.variants[0]?.locationId || ""
  );
  const [simpleMinAlert, setSimpleMinAlert] = useState(
    String(product?.variants[0]?.minAlertLevel ?? 5)
  );
  const [editVariants, setEditVariants] = useState(
    (product?.variants || []).map((v) => ({
      id: v.id,
      sku: v.sku,
      barcode: v.barcode,
      attributes: v.attributes,
      quantityOnHand: v.quantityOnHand,
      minAlertLevel: v.minAlertLevel,
      locationId: v.locationId || "",
    }))
  );
  const [attrOptions, setAttrOptions] = useState<Record<string, string>>({});
  const [matrixRows, setMatrixRows] = useState<VariantRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const category = categories.find((c) => c.id === categoryId);
  const schema = useMemo(
    () => (category ? parseJsonArray(category.attributeSchema) : []),
    [category]
  );

  if (categories.length === 0) {
    return (
      <Card>
        <p className="text-sm text-[var(--muted)]">
          אין קטגוריות במערכת. יש ליצור קטגוריה תחילה בעמוד{" "}
          <a href="/setup" className="font-medium text-[var(--accent)] underline">
            הגדרות
          </a>
          .
        </p>
      </Card>
    );
  }

  function generateMatrix() {
    if (!category || !baseSku) {
      setError("נא למלא מק״ט בסיס וקטגוריה");
      return;
    }
    const optionsByAttr: Record<string, string[]> = {};
    for (const key of schema) {
      optionsByAttr[key] = (attrOptions[key] || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    const combos = generateMatrixCombinations(schema, optionsByAttr);
    const rows: VariantRow[] = combos.map((attrs, i) => ({
      attributes: attrs,
      sku: buildVariantSku(baseSku.toUpperCase(), attrs, schema),
      barcode: `${baseSku.toUpperCase()}${String(i + 1).padStart(4, "0")}`,
      quantityOnHand: 0,
      locationId: "",
    }));
    setMatrixRows(rows);
    setError("");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (isEdit && product) {
        const payload: Record<string, unknown> = {
          title,
          baseSku: baseSku.toUpperCase(),
          description,
          categoryId,
          supplierId: supplierId || null,
          costPrice,
          sellingPrice,
          unitOfMeasure,
          unitsPerCarton: Number(unitsPerCarton) || 1,
        };

        if (editVariants.length === 1 && !category?.hasVariants) {
          payload.variants = [
            {
              id: editVariants[0].id,
              barcode: simpleBarcode || editVariants[0].barcode,
              locationId: simpleLocationId || null,
              minAlertLevel: Number(simpleMinAlert) || 0,
            },
          ];
        } else if (editVariants.length > 0) {
          payload.variants = editVariants.map((v) => ({
            id: v.id,
            barcode: v.barcode,
            locationId: v.locationId || null,
            minAlertLevel: v.minAlertLevel,
          }));
        }

        const res = await fetch(`/api/products/${product.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "שגיאה");
        router.push("/products");
        router.refresh();
        return;
      }

      const payload: Record<string, unknown> = {
        title,
        baseSku: baseSku.toUpperCase(),
        description,
        categoryId,
        supplierId: supplierId || null,
        costPrice,
        sellingPrice,
        unitOfMeasure,
        unitsPerCarton: Number(unitsPerCarton) || 1,
      };

      if (category?.hasVariants) {
        if (matrixRows.length === 0) {
          setError("יש ליצור מטריצת וריאציות לפני השמירה");
          setLoading(false);
          return;
        }
        payload.variants = matrixRows;
      } else {
        payload.simpleBarcode = simpleBarcode || `${baseSku.toUpperCase()}-1`;
        payload.simpleQty = simpleQty;
        payload.simpleLocationId = simpleLocationId || null;
      }

      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      router.push("/products");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Card className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>שם מוצר</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div>
          <Label>מק״ט בסיס</Label>
          <Input
            value={baseSku}
            onChange={(e) => setBaseSku(e.target.value)}
            placeholder="TS-100"
            required
          />
        </div>
        <div>
          <Label>קטגוריה</Label>
          <Select
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              if (!isEdit) setMatrixRows([]);
            }}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.hasVariants ? " (וריאציות)" : ""}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>ספק</Label>
          <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            <option value="">ללא</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>מחיר עלות</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={costPrice}
            onChange={(e) => setCostPrice(e.target.value)}
          />
        </div>
        <div>
          <Label>מחיר מכירה</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={sellingPrice}
            onChange={(e) => setSellingPrice(e.target.value)}
          />
        </div>
        <div>
          <Label>יחידת מידה</Label>
          <Select
            value={unitOfMeasure}
            onChange={(e) => setUnitOfMeasure(e.target.value)}
          >
            {UNIT_OF_MEASURE.map((u) => (
              <option key={u.code} value={u.code}>
                {u.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>יח׳ בקרטון</Label>
          <Input
            type="number"
            min="1"
            value={unitsPerCarton}
            onChange={(e) => setUnitsPerCarton(e.target.value)}
            disabled={unitOfMeasure !== "CARTON"}
          />
        </div>
        <div className="sm:col-span-2">
          <Label>תיאור</Label>
          <Textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </Card>

      {isEdit ? (
        <Card className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">וריאציות קיימות</h2>
            <p className="text-sm text-[var(--muted)]">
              ניתן לעדכן ברקוד, מיקום וסף התראה. כמות משתנה דרך קליטה/ניפוק.
            </p>
          </div>
          {editVariants.length === 1 && !category?.hasVariants ? (
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label>ברקוד</Label>
                <Input
                  value={simpleBarcode}
                  onChange={(e) => setSimpleBarcode(e.target.value)}
                />
              </div>
              <div>
                <Label>סף התראה</Label>
                <Input
                  type="number"
                  min="0"
                  value={simpleMinAlert}
                  onChange={(e) => setSimpleMinAlert(e.target.value)}
                />
              </div>
              <div>
                <Label>מיקום</Label>
                <Select
                  value={simpleLocationId}
                  onChange={(e) => setSimpleLocationId(e.target.value)}
                >
                  <option value="">ללא</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.code}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="text-right text-[var(--muted)]">
                    <th className="pb-2">SKU</th>
                    <th className="pb-2">מאפיינים</th>
                    <th className="pb-2">ברקוד</th>
                    <th className="pb-2">מלאי</th>
                    <th className="pb-2">סף</th>
                    <th className="pb-2">מיקום</th>
                  </tr>
                </thead>
                <tbody>
                  {editVariants.map((row, idx) => (
                    <tr key={row.id} className="border-t border-[var(--border)]">
                      <td className="py-2 font-mono text-xs">{row.sku}</td>
                      <td className="py-2">{attributesLabel(row.attributes)}</td>
                      <td className="py-2">
                        <Input
                          className="font-mono text-xs"
                          value={row.barcode}
                          onChange={(e) => {
                            const next = [...editVariants];
                            next[idx] = { ...row, barcode: e.target.value };
                            setEditVariants(next);
                          }}
                        />
                      </td>
                      <td className="py-2">{row.quantityOnHand}</td>
                      <td className="py-2 w-20">
                        <Input
                          type="number"
                          min="0"
                          value={row.minAlertLevel}
                          onChange={(e) => {
                            const next = [...editVariants];
                            next[idx] = {
                              ...row,
                              minAlertLevel: Number(e.target.value) || 0,
                            };
                            setEditVariants(next);
                          }}
                        />
                      </td>
                      <td className="py-2">
                        <Select
                          value={row.locationId}
                          onChange={(e) => {
                            const next = [...editVariants];
                            next[idx] = { ...row, locationId: e.target.value };
                            setEditVariants(next);
                          }}
                        >
                          <option value="">ללא</option>
                          {locations.map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.code}
                            </option>
                          ))}
                        </Select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : category?.hasVariants ? (
        <Card className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">מחולל מטריצת וריאציות</h2>
            <p className="text-sm text-[var(--muted)]">
              הזינו ערכים מופרדים בפסיק לכל מאפיין, ואז צרו את כל השילובים
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {schema.map((attr) => (
              <div key={attr}>
                <Label>{attr}</Label>
                <Input
                  placeholder={
                    attr === "Size"
                      ? "S, M, L, XL"
                      : attr === "Color"
                        ? "Black, White, Blue"
                        : "Regular, Slim"
                  }
                  value={attrOptions[attr] || ""}
                  onChange={(e) =>
                    setAttrOptions((prev) => ({ ...prev, [attr]: e.target.value }))
                  }
                />
              </div>
            ))}
          </div>
          <Button type="button" variant="secondary" onClick={generateMatrix}>
            צור וריאציות ({schema.join(" × ")})
          </Button>

          {matrixRows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="text-right text-[var(--muted)]">
                    <th className="pb-2">מאפיינים</th>
                    <th className="pb-2">SKU</th>
                    <th className="pb-2">ברקוד</th>
                    <th className="pb-2">כמות</th>
                    <th className="pb-2">מיקום</th>
                  </tr>
                </thead>
                <tbody>
                  {matrixRows.map((row, idx) => (
                    <tr key={idx} className="border-t border-[var(--border)]">
                      <td className="py-2">
                        {Object.entries(row.attributes)
                          .map(([k, v]) => `${k}:${v}`)
                          .join(" · ")}
                      </td>
                      <td className="py-2">
                        <Input
                          className="font-mono text-xs"
                          value={row.sku}
                          onChange={(e) => {
                            const next = [...matrixRows];
                            next[idx] = { ...row, sku: e.target.value };
                            setMatrixRows(next);
                          }}
                        />
                      </td>
                      <td className="py-2">
                        <Input
                          className="font-mono text-xs"
                          value={row.barcode}
                          onChange={(e) => {
                            const next = [...matrixRows];
                            next[idx] = { ...row, barcode: e.target.value };
                            setMatrixRows(next);
                          }}
                          required
                        />
                      </td>
                      <td className="py-2 w-24">
                        <Input
                          type="number"
                          min="0"
                          value={row.quantityOnHand}
                          onChange={(e) => {
                            const next = [...matrixRows];
                            next[idx] = {
                              ...row,
                              quantityOnHand: Number(e.target.value) || 0,
                            };
                            setMatrixRows(next);
                          }}
                        />
                      </td>
                      <td className="py-2">
                        <Select
                          value={row.locationId}
                          onChange={(e) => {
                            const next = [...matrixRows];
                            next[idx] = { ...row, locationId: e.target.value };
                            setMatrixRows(next);
                          }}
                        >
                          <option value="">ללא</option>
                          {locations.map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.code}
                            </option>
                          ))}
                        </Select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : (
        <Card className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label>ברקוד</Label>
            <Input
              value={simpleBarcode}
              onChange={(e) => setSimpleBarcode(e.target.value)}
              placeholder="יווצר אוטומטית אם ריק"
            />
          </div>
          <div>
            <Label>כמות התחלתית</Label>
            <Input
              type="number"
              min="0"
              value={simpleQty}
              onChange={(e) => setSimpleQty(e.target.value)}
            />
          </div>
          <div>
            <Label>מיקום</Label>
            <Select
              value={simpleLocationId}
              onChange={(e) => setSimpleLocationId(e.target.value)}
            >
              <option value="">ללא</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.code}
                </option>
              ))}
            </Select>
          </div>
        </Card>
      )}

      {error && (
        <div className="rounded-lg border border-[var(--danger)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "שומר..." : isEdit ? "שמור שינויים" : "שמור מוצר"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          ביטול
        </Button>
      </div>
    </form>
  );
}
