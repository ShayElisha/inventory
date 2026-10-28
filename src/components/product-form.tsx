"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label, Select, Textarea } from "@/components/ui";
import { FirstRunTip } from "@/components/first-run-tip";
import {
  clearProductDraft,
  loadProductDraft,
  saveProductDraft,
  type ProductDraft,
} from "@/lib/product-draft";
import { buildVariantSku, generateMatrixCombinations } from "@/lib/sku";
import { parseJsonArray, parseJsonObject } from "@/lib/json";
import { UNIT_OF_MEASURE } from "@/lib/constants";
import { attributesLabel } from "@/lib/utils";
import { parseCustomData, parseFieldOptions } from "@/lib/custom-fields";
import { Check, ImagePlus, Plus, Trash2, X } from "lucide-react";

const MAX_IMAGE_DATA_URL_LENGTH = 350_000; // ~260KB

const WIZARD_STEPS = [
  { n: 1, label: "פרטי הדגם" },
  { n: 2, label: "מידות ומלאי" },
  { n: 3, label: "סיכום ושמירה" },
] as const;

type Category = {
  id: string;
  name: string;
  hasVariants: boolean;
  attributeSchema: string;
};

type CustomFieldDef = {
  id: string;
  key: string;
  label: string;
  fieldType: string;
  options: string;
  required: boolean;
  categoryId?: string | null;
};

type VariantRow = {
  attributes: Record<string, string>;
  sku: string;
  barcode: string;
  quantityOnHand: number;
  minAlertLevel: number;
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
  customData?: string;
  imageUrl?: string | null;
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
  customFields = [],
  product,
}: {
  categories: Category[];
  suppliers: { id: string; name: string }[];
  locations: { id: string; code: string }[];
  customFields?: CustomFieldDef[];
  product?: ExistingProduct;
}) {
  const router = useRouter();
  const isEdit = Boolean(product);
  const initialCustom = parseCustomData(product?.customData);
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
  const [weightKg, setWeightKg] = useState(
    String((product as { weightKg?: number | null })?.weightKg ?? "")
  );
  const [volumeLiters, setVolumeLiters] = useState(
    String((product as { volumeLiters?: number | null })?.volumeLiters ?? "")
  );
  const [trackLots, setTrackLots] = useState(
    Boolean((product as { trackLots?: boolean })?.trackLots)
  );
  const [trackSerials, setTrackSerials] = useState(
    Boolean((product as { trackSerials?: boolean })?.trackSerials)
  );
  const [isKit, setIsKit] = useState(
    Boolean((product as { isKit?: boolean })?.isKit)
  );
  const [customValues, setCustomValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const f of customFields) {
      const v = initialCustom[f.key];
      if (f.fieldType === "BOOLEAN") {
        init[f.key] = v === true || v === "true" ? "true" : "false";
      } else if (v === undefined || v === null) {
        init[f.key] = "";
      } else {
        init[f.key] = String(v);
      }
    }
    return init;
  });
  const [simpleBarcode, setSimpleBarcode] = useState(
    product?.variants[0]?.barcode || ""
  );
  const [simpleQty, setSimpleQty] = useState(
    String(product?.variants[0]?.quantityOnHand ?? 0)
  );
  const [simpleLocationId, setSimpleLocationId] = useState(
    product?.variants[0]?.locationId || ""
  );
  const [simpleMinAlert, setSimpleMinAlert] = useState(
    String(product?.variants[0]?.minAlertLevel ?? 5)
  );
  const [editVariants, setEditVariants] = useState(
    (product?.variants || []).map((v) => ({
      id: v.id,
      isNew: false,
      remove: false,
      sku: v.sku,
      barcode: v.barcode,
      attributes: v.attributes,
      quantityOnHand: v.quantityOnHand,
      minAlertLevel: v.minAlertLevel,
      locationId: v.locationId || "",
    }))
  );
  const [newSizeValue, setNewSizeValue] = useState("");
  const [newSizeQty, setNewSizeQty] = useState("");
  const [attrOptions, setAttrOptions] = useState<Record<string, string>>({});
  const [matrixRows, setMatrixRows] = useState<VariantRow[]>([]);
  const [multiSizes, setMultiSizes] = useState(false);
  const [defaultVariantQty, setDefaultVariantQty] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [imageUrl, setImageUrl] = useState<string>(product?.imageUrl || "");
  const [step, setStep] = useState(1);
  const [pendingDraft, setPendingDraft] = useState<ProductDraft | null>(null);
  const [draftChecked, setDraftChecked] = useState(false);
  const skipDraftSaveRef = useRef(false);

  // טעינת טיוטה בעת כניסה (יצירה בלבד)
  useEffect(() => {
    if (isEdit) return;
    const draft = loadProductDraft();
    if (draft) setPendingDraft(draft);
    setDraftChecked(true);
  }, [isEdit]);

  // שמירת טיוטה אוטומטית (debounce)
  useEffect(() => {
    if (isEdit || !draftChecked || pendingDraft) return;
    const hasContent =
      title.trim() !== "" ||
      baseSku.trim() !== "" ||
      description.trim() !== "" ||
      imageUrl !== "";
    if (!hasContent) return;
    const t = setTimeout(() => {
      if (skipDraftSaveRef.current) return;
      saveProductDraft({
        step,
        title,
        baseSku,
        description,
        categoryId,
        supplierId,
        costPrice,
        sellingPrice,
        unitOfMeasure,
        unitsPerCarton,
        weightKg,
        volumeLiters,
        trackLots,
        trackSerials,
        isKit,
        multiSizes,
        attrOptions,
        defaultVariantQty,
        simpleBarcode,
        simpleQty,
        simpleLocationId,
        simpleMinAlert,
        imageUrl,
        customValues,
      });
    }, 600);
    return () => clearTimeout(t);
  }, [
    isEdit,
    draftChecked,
    pendingDraft,
    step,
    title,
    baseSku,
    description,
    categoryId,
    supplierId,
    costPrice,
    sellingPrice,
    unitOfMeasure,
    unitsPerCarton,
    weightKg,
    volumeLiters,
    trackLots,
    trackSerials,
    isKit,
    multiSizes,
    attrOptions,
    defaultVariantQty,
    simpleBarcode,
    simpleQty,
    simpleLocationId,
    simpleMinAlert,
    imageUrl,
    customValues,
  ]);

  function restoreDraft() {
    const d = pendingDraft;
    if (!d) return;
    setTitle(d.title || "");
    setBaseSku(d.baseSku || "");
    setDescription(d.description || "");
    if (d.categoryId && categories.some((c) => c.id === d.categoryId)) {
      setCategoryId(d.categoryId);
    }
    setSupplierId(
      d.supplierId && suppliers.some((s) => s.id === d.supplierId)
        ? d.supplierId
        : ""
    );
    setCostPrice(d.costPrice ?? "0");
    setSellingPrice(d.sellingPrice ?? "0");
    setUnitOfMeasure(d.unitOfMeasure || "UNIT");
    setUnitsPerCarton(d.unitsPerCarton || "1");
    setWeightKg(d.weightKg ?? "");
    setVolumeLiters(d.volumeLiters ?? "");
    setTrackLots(Boolean(d.trackLots));
    setTrackSerials(Boolean(d.trackSerials));
    setIsKit(Boolean(d.isKit));
    setMultiSizes(Boolean(d.multiSizes));
    setAttrOptions(d.attrOptions || {});
    setDefaultVariantQty(d.defaultVariantQty || "");
    setSimpleBarcode(d.simpleBarcode || "");
    setSimpleQty(d.simpleQty || "0");
    setSimpleLocationId(
      d.simpleLocationId && locations.some((l) => l.id === d.simpleLocationId)
        ? d.simpleLocationId
        : ""
    );
    setSimpleMinAlert(d.simpleMinAlert || "5");
    setImageUrl(d.imageUrl || "");
    setCustomValues((prev) => ({ ...prev, ...(d.customValues || {}) }));
    setMatrixRows([]);
    // מטריצת המידות לא נשמרת בטיוטה — חוזרים לכל היותר לשלב 2
    setStep(Math.min(Math.max(Number(d.step) || 1, 1), 2));
    setPendingDraft(null);
  }

  function discardDraft() {
    clearProductDraft();
    setPendingDraft(null);
  }

  function onImageSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("נא לבחור קובץ תמונה");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (result.length > MAX_IMAGE_DATA_URL_LENGTH) {
        setError("התמונה גדולה מדי (עד כ־260KB). נסו תמונה קטנה יותר.");
        return;
      }
      setImageUrl(result);
      setError("");
    };
    reader.onerror = () => setError("לא הצלחנו לקרוא את התמונה");
    reader.readAsDataURL(file);
  }

  const category = categories.find((c) => c.id === categoryId);
  const categorySchema = useMemo(
    () => (category ? parseJsonArray(category.attributeSchema) : []),
    [category]
  );
  const useMulti = Boolean(category?.hasVariants || multiSizes);
  const schema = useMemo(() => {
    if (category?.hasVariants && categorySchema.length > 0) return categorySchema;
    if (useMulti) return categorySchema.length > 0 ? categorySchema : ["מידה"];
    return [];
  }, [category?.hasVariants, categorySchema, useMulti]);
  const visibleCustomFields = useMemo(
    () =>
      customFields.filter(
        (f) => !f.categoryId || f.categoryId === categoryId
      ),
    [customFields, categoryId]
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

  function attrKey(attrs: Record<string, string>) {
    return Object.entries(attrs)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join("|");
  }

  function generateMatrix() {
    if (!category || !baseSku) {
      setError("נא למלא קוד דגם וקבוצה (בשלב הראשון)");
      return;
    }
    const optionsByAttr: Record<string, string[]> = {};
    for (const key of schema) {
      optionsByAttr[key] = (attrOptions[key] || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    if (!Object.values(optionsByAttr).some((arr) => arr.length > 0)) {
      setError("הזינו לפחות ערך אחד (למשל מידות: S, M, L)");
      return;
    }
    const prevByAttr = new Map(
      matrixRows.map((r) => [attrKey(r.attributes), r] as const)
    );
    const fallbackQty = Math.max(0, Math.floor(Number(defaultVariantQty) || 0));
    const fallbackMin = Math.max(0, Math.floor(Number(simpleMinAlert) || 0));
    const combos = generateMatrixCombinations(schema, optionsByAttr);
    const rows: VariantRow[] = combos.map((attrs, i) => {
      const prev = prevByAttr.get(attrKey(attrs));
      return {
        attributes: attrs,
        sku:
          prev?.sku ||
          buildVariantSku(baseSku.toUpperCase(), attrs, schema),
        barcode:
          prev?.barcode ||
          `${baseSku.toUpperCase()}${String(i + 1).padStart(4, "0")}`,
        quantityOnHand: prev?.quantityOnHand ?? fallbackQty,
        minAlertLevel: prev?.minAlertLevel ?? fallbackMin,
        locationId: prev?.locationId || "",
      };
    });
    setMatrixRows(rows);
    setError("");
  }

  function parsedMinAlert() {
    return Math.max(0, Math.floor(Number(simpleMinAlert) || 0));
  }

  function applyMinToAllEditVariants() {
    const min = parsedMinAlert();
    setEditVariants((prev) =>
      prev.map((v) => (v.remove ? v : { ...v, minAlertLevel: min }))
    );
  }

  function buildCustomDataPayload(): Record<string, unknown> | null {
    // שומרים ערכים של שדות מקטגוריות אחרות (אם עברו קטגוריה)
    const out: Record<string, unknown> = { ...initialCustom };
    for (const f of visibleCustomFields) {
      const raw = customValues[f.key] ?? "";
      if (f.required) {
        if (f.fieldType === "BOOLEAN") {
          // always has value
        } else if (String(raw).trim() === "") {
          setError(`שדה חובה: ${f.label}`);
          return null;
        }
      }
      if (f.fieldType === "BOOLEAN") {
        out[f.key] = raw === "true";
      } else if (f.fieldType === "NUMBER") {
        if (String(raw).trim() === "") {
          if (f.required) {
            setError(`שדה חובה: ${f.label}`);
            return null;
          }
          out[f.key] = null;
        } else {
          const n = Number(raw);
          if (Number.isNaN(n)) {
            setError(`ערך לא תקין ב־${f.label}`);
            return null;
          }
          out[f.key] = n;
        }
      } else {
        out[f.key] = String(raw).trim();
      }
    }
    return out;
  }

  function validateStep(s: number): boolean {
    if (s === 1) {
      if (!title.trim()) {
        setError("נא למלא שם מוצר");
        return false;
      }
      if (!baseSku.trim()) {
        setError("נא למלא קוד דגם");
        return false;
      }
      if (!categoryId) {
        setError("נא לבחור קבוצה");
        return false;
      }
      if (buildCustomDataPayload() === null) return false;
    }
    if (s === 2) {
      if (useMulti) {
        if (matrixRows.length === 0) {
          setError("לחצו «צור מידות» אחרי הזנת המידות, ואז המשיכו");
          return false;
        }
        if (matrixRows.some((r) => !r.barcode.trim())) {
          setError("חסר ברקוד באחת השורות");
          return false;
        }
      }
    }
    setError("");
    return true;
  }

  function goNext() {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(3, s + 1));
  }

  function goBack() {
    setError("");
    setStep((s) => Math.max(1, s - 1));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isEdit && step < 3) {
      goNext();
      return;
    }
    if (!isEdit && (!validateStep(1) || !validateStep(2))) return;
    setLoading(true);
    setError("");
    try {
      const customData = buildCustomDataPayload();
      if (customData === null) {
        setLoading(false);
        return;
      }

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
          weightKg: weightKg === "" ? null : Number(weightKg),
          volumeLiters: volumeLiters === "" ? null : Number(volumeLiters),
          trackLots,
          trackSerials,
          isKit,
          customData,
          imageUrl: imageUrl || null,
        };

        const kept = editVariants.filter((v) => !v.remove);
        if (kept.length === 0) {
          setError("חייבת להישאר לפחות אפשרות אחת");
          setLoading(false);
          return;
        }
        payload.variants = editVariants
          .filter((v) => !(v.isNew && v.remove))
          .map((v) => {
            if (v.remove) {
              return { id: v.id, remove: true };
            }
            const attrs = parseJsonObject(
              typeof v.attributes === "string"
                ? v.attributes
                : JSON.stringify(v.attributes || {})
            );
            return {
              id: v.isNew ? undefined : v.id,
              sku: v.sku,
              barcode: v.barcode,
              attributes: attrs,
              quantityOnHand: Math.max(
                0,
                Math.floor(Number(v.quantityOnHand) || 0)
              ),
              locationId: v.locationId || null,
              minAlertLevel: Number(v.minAlertLevel) || 0,
            };
          });

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
        weightKg: weightKg === "" ? null : Number(weightKg),
        volumeLiters: volumeLiters === "" ? null : Number(volumeLiters),
        trackLots,
        trackSerials,
        isKit,
        customData,
        imageUrl: imageUrl || null,
      };

      if (useMulti) {
        if (matrixRows.length === 0) {
          setError("לחצו «צור מידות» אחרי הזנת המידות, ואז שמרו");
          setLoading(false);
          return;
        }
        payload.variants = matrixRows.map((r) => ({
          attributes: r.attributes,
          sku: r.sku,
          barcode: r.barcode,
          quantityOnHand: Math.max(
            0,
            Math.floor(Number(r.quantityOnHand) || 0)
          ),
          locationId: r.locationId || null,
          minAlertLevel:
            r.minAlertLevel != null
              ? Math.max(0, Math.floor(Number(r.minAlertLevel) || 0))
              : parsedMinAlert(),
        }));
        payload.defaultMinAlert = parsedMinAlert();
      } else {
        payload.simpleBarcode = simpleBarcode || `${baseSku.toUpperCase()}-1`;
        payload.simpleQty = simpleQty;
        payload.simpleLocationId = simpleLocationId || null;
        payload.simpleMinAlert = parsedMinAlert();
        payload.defaultMinAlert = parsedMinAlert();
      }

      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      skipDraftSaveRef.current = true;
      clearProductDraft();
      router.push("/products");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  const imageBlock = (
    <div className="sm:col-span-2">
      <Label>תמונה (אופציונלי)</Label>
      <div className="flex flex-wrap items-center gap-3">
        {imageUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt="תצוגה מקדימה"
              className="h-20 w-20 rounded-lg border border-[var(--border)] object-cover"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => setImageUrl("")}
            >
              <X className="h-4 w-4" />
              הסר תמונה
            </Button>
          </>
        ) : (
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm hover:border-[var(--accent)]">
            <ImagePlus className="h-4 w-4" />
            בחירת תמונה
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onImageSelected}
            />
          </label>
        )}
        <span className="text-xs text-[var(--muted)]">עד כ־260KB</span>
      </div>
    </div>
  );

  const totalQty = useMulti
    ? matrixRows.reduce((s, r) => s + (Number(r.quantityOnHand) || 0), 0)
    : Math.max(0, Math.floor(Number(simpleQty) || 0));
  const sizesCount = useMulti ? matrixRows.length : 1;
  const showFields = isEdit || step === 1;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {!isEdit && (
        <>
          <FirstRunTip tipId="product-wizard" title="הוספת מוצר ב־3 שלבים">
            <p>
              <strong>1. פרטי הדגם</strong> — שם, קוד דגם, קבוצה, מחירים
              ותמונה.
            </p>
            <p>
              <strong>2. מידות ומלאי</strong> — אם יש כמה מידות (S / M / L)
              מזינים אותן פעם אחת, וקובעים כמות לכל מידה.
            </p>
            <p>
              <strong>3. סיכום ושמירה</strong> — בודקים שהכול נכון ולוחצים
              «שמור מוצר». ההקלדה נשמרת אוטומטית כטיוטה.
            </p>
          </FirstRunTip>

          {pendingDraft && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/5 px-4 py-3 text-sm">
              <span>
                נמצאה טיוטה שלא נשמרה
                {pendingDraft.title ? ` («${pendingDraft.title}»)` : ""}. לשחזר
                אותה?
              </span>
              <span className="flex gap-2">
                <Button type="button" onClick={restoreDraft}>
                  שחזר טיוטה
                </Button>
                <Button type="button" variant="secondary" onClick={discardDraft}>
                  התחל מחדש
                </Button>
              </span>
            </div>
          )}

          <ol className="flex items-center gap-2" aria-label="שלבי יצירת מוצר">
            {WIZARD_STEPS.map((s) => {
              const active = step === s.n;
              const done = step > s.n;
              return (
                <li
                  key={s.n}
                  className="flex flex-1 items-center gap-2"
                  aria-current={active ? "step" : undefined}
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                      active
                        ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                        : done
                          ? "border-[var(--accent)] text-[var(--accent)]"
                          : "border-[var(--border)] text-[var(--muted)]"
                    }`}
                  >
                    {done ? <Check className="h-4 w-4" /> : s.n}
                  </span>
                  <span
                    className={`text-sm ${
                      active ? "font-semibold" : "text-[var(--muted)]"
                    }`}
                  >
                    {s.n}/3 · {s.label}
                  </span>
                </li>
              );
            })}
          </ol>
        </>
      )}

      {showFields && (
      <Card className="grid gap-4 sm:grid-cols-2">
        {isEdit && imageBlock}
        <div>
          <Label>שם המוצר</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div>
          <Label>קוד דגם</Label>
          <Input
            value={baseSku}
            onChange={(e) => setBaseSku(e.target.value)}
            placeholder="TS-100"
            required
          />
        </div>
        <div>
          <Label>קבוצה</Label>
          <Select
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              if (!isEdit) {
                setMatrixRows([]);
                setMultiSizes(false);
              }
            }}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.hasVariants ? " (מידות / גרסאות)" : ""}
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
          <Label>מחיר קנייה</Label>
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
        <div className="sm:col-span-2">
          <Label>תיאור</Label>
          <Textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
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
        <div>
          <Label>משקל (ק״ג)</Label>
          <Input
            type="number"
            min="0"
            step="0.001"
            value={weightKg}
            onChange={(e) => setWeightKg(e.target.value)}
          />
        </div>
        <div>
          <Label>נפח (ליטר)</Label>
          <Input
            type="number"
            min="0"
            step="0.001"
            value={volumeLiters}
            onChange={(e) => setVolumeLiters(e.target.value)}
          />
        </div>
        {!isEdit && imageBlock}
        <div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={trackLots}
              onChange={(e) => setTrackLots(e.target.checked)}
            />
            יש תאריך תוקף / אצוות
          </label>
          {trackLots && (
            <p className="mt-1 text-xs text-[var(--muted)]">
              אפשר לרשום תאריך תוקף בקליטה / במסך אצוות
            </p>
          )}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={trackSerials}
            onChange={(e) => setTrackSerials(e.target.checked)}
          />
          מעקב מספר סידורי
        </label>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input
            type="checkbox"
            checked={isKit}
            onChange={(e) => setIsKit(e.target.checked)}
          />
          מוצר קיט / BOM (הרכבה מרכיבים)
        </label>
        <div className="sm:col-span-2">
          <Label>כמות מינימום להתראה</Label>
          <Input
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            value={simpleMinAlert}
            onChange={(e) => setSimpleMinAlert(e.target.value)}
            placeholder="למשל 5"
          />
          <p className="mt-1 text-xs text-[var(--muted)]">
            כשהמלאי יורד לערך הזה או מתחתיו — תופיע התראת מלאי נמוך. אפשר גם
            לשנות לכל מידה בנפרד בהמשך.
          </p>
        </div>
      </Card>
      )}

      {showFields && visibleCustomFields.length > 0 && (
        <Card className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <h2 className="text-lg font-semibold">שדות מותאמים</h2>
            <p className="text-sm text-[var(--muted)]">
              שדות גלובליים + שדות לקטגוריה הנבחרת (מוגדרים בהגדרות)
            </p>
          </div>
          {visibleCustomFields.map((f) => {
            const opts = parseFieldOptions(f.options);
            return (
              <div key={f.id}>
                <Label>
                  {f.label}
                  {f.required ? " *" : ""}
                </Label>
                {f.fieldType === "SELECT" ? (
                  <Select
                    value={customValues[f.key] || ""}
                    onChange={(e) =>
                      setCustomValues((prev) => ({
                        ...prev,
                        [f.key]: e.target.value,
                      }))
                    }
                    required={f.required}
                  >
                    <option value="">בחרו…</option>
                    {opts.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </Select>
                ) : f.fieldType === "BOOLEAN" ? (
                  <Select
                    value={customValues[f.key] || "false"}
                    onChange={(e) =>
                      setCustomValues((prev) => ({
                        ...prev,
                        [f.key]: e.target.value,
                      }))
                    }
                  >
                    <option value="false">לא</option>
                    <option value="true">כן</option>
                  </Select>
                ) : (
                  <Input
                    type={
                      f.fieldType === "NUMBER"
                        ? "number"
                        : f.fieldType === "DATE"
                          ? "date"
                          : "text"
                    }
                    value={customValues[f.key] || ""}
                    onChange={(e) =>
                      setCustomValues((prev) => ({
                        ...prev,
                        [f.key]: e.target.value,
                      }))
                    }
                    required={f.required}
                  />
                )}
              </div>
            );
          })}
        </Card>
      )}

      {isEdit ? (
        <Card className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">מלאי ואפשרויות</h2>
            <p className="text-sm text-[var(--muted)]">
              עדכנו כמויות, מינימום להתראה, ברקודים ומיקומים. אפשר גם להוסיף
              מידה חדשה לאותו דגם.
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
            <div className="min-w-[140px] flex-1">
              <Label>כמות מינימום לדגם</Label>
              <Input
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={simpleMinAlert}
                onChange={(e) => setSimpleMinAlert(e.target.value)}
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={applyMinToAllEditVariants}
            >
              החל על כל המידות
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead>
                <tr className="text-right text-[var(--muted)]">
                  <th className="pb-2">קוד פריט</th>
                  <th className="pb-2">מאפיינים</th>
                  <th className="pb-2">ברקוד</th>
                  <th className="pb-2">כמות במלאי</th>
                  <th className="pb-2">מינימום</th>
                  <th className="pb-2">מיקום</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {editVariants
                  .map((row, idx) => ({ row, idx }))
                  .filter(({ row }) => !row.remove)
                  .map(({ row, idx }) => (
                    <tr key={row.id} className="border-t border-[var(--border)]">
                      <td className="py-2">
                        <Input
                          className="font-mono text-xs"
                          value={row.sku}
                          onChange={(e) => {
                            const value = e.target.value;
                            setEditVariants((prev) => {
                              const next = [...prev];
                              next[idx] = { ...next[idx], sku: value };
                              return next;
                            });
                          }}
                        />
                      </td>
                      <td className="py-2 text-xs">
                        {attributesLabel(row.attributes)}
                      </td>
                      <td className="py-2">
                        <Input
                          className="font-mono text-xs"
                          value={row.barcode}
                          onChange={(e) => {
                            const value = e.target.value;
                            setEditVariants((prev) => {
                              const next = [...prev];
                              next[idx] = { ...next[idx], barcode: value };
                              return next;
                            });
                          }}
                        />
                      </td>
                      <td className="py-2 w-28">
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          inputMode="numeric"
                          className="font-semibold"
                          value={
                            row.quantityOnHand === 0 ? "" : row.quantityOnHand
                          }
                          placeholder="0"
                          onChange={(e) => {
                            const raw = e.target.value;
                            const qty =
                              raw === ""
                                ? 0
                                : Math.max(0, Math.floor(Number(raw) || 0));
                            setEditVariants((prev) => {
                              const next = [...prev];
                              next[idx] = {
                                ...next[idx],
                                quantityOnHand: qty,
                              };
                              return next;
                            });
                            if (
                              editVariants.filter((x) => !x.remove).length ===
                                1 &&
                              !row.isNew
                            ) {
                              setSimpleQty(String(qty));
                            }
                          }}
                        />
                      </td>
                      <td className="py-2 w-20">
                        <Input
                          type="number"
                          min="0"
                          value={row.minAlertLevel}
                          onChange={(e) => {
                            const value = Number(e.target.value) || 0;
                            setEditVariants((prev) => {
                              const next = [...prev];
                              next[idx] = {
                                ...next[idx],
                                minAlertLevel: value,
                              };
                              return next;
                            });
                          }}
                        />
                      </td>
                      <td className="py-2">
                        <Select
                          value={row.locationId}
                          onChange={(e) => {
                            const value = e.target.value;
                            setEditVariants((prev) => {
                              const next = [...prev];
                              next[idx] = {
                                ...next[idx],
                                locationId: value,
                              };
                              return next;
                            });
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
                      <td className="py-2">
                        <button
                          type="button"
                          className="rounded-lg p-1.5 text-[var(--danger)] hover:bg-[var(--danger-soft)] disabled:opacity-40"
                          title="הסר מידה / גרסה"
                          disabled={
                            editVariants.filter((x) => !x.remove).length <= 1
                          }
                          onClick={() => {
                            setEditVariants((prev) => {
                              const next = [...prev];
                              if (next[idx].isNew) {
                                return prev.filter((_, i) => i !== idx);
                              }
                              next[idx] = { ...next[idx], remove: true };
                              return next;
                            });
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-2)] p-3">
            <p className="mb-2 text-sm font-medium">הוספת מידה / אפשרות</p>
            <div className="grid gap-3 sm:grid-cols-[1fr_100px_auto]">
              <div>
                <Label>מידה (או ערך מאפיין)</Label>
                <Input
                  value={newSizeValue}
                  onChange={(e) => setNewSizeValue(e.target.value)}
                  placeholder="למשל XL"
                />
              </div>
              <div>
                <Label>כמות</Label>
                <Input
                  type="number"
                  min="0"
                  value={newSizeQty}
                  onChange={(e) => setNewSizeQty(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    const size = newSizeValue.trim();
                    if (!size) {
                      setError("הזינו ערך מידה לפני הוספה");
                      return;
                    }
                    const attrName =
                      schema[0] ||
                      (categorySchema[0] ? categorySchema[0] : "מידה");
                    const attrs = { [attrName]: size };
                    const sku = buildVariantSku(
                      baseSku.toUpperCase() || "SKU",
                      attrs,
                      [attrName]
                    );
                    setEditVariants((prev) => [
                      ...prev,
                      {
                        id: `new-${Date.now()}`,
                        isNew: true,
                        remove: false,
                        sku,
                        barcode: `${sku}-${prev.length + 1}`,
                        attributes: JSON.stringify(attrs),
                        quantityOnHand: Math.max(
                          0,
                          Math.floor(Number(newSizeQty) || 0)
                        ),
                        minAlertLevel: parsedMinAlert(),
                        locationId: "",
                      },
                    ]);
                    setNewSizeValue("");
                    setNewSizeQty("");
                    setError("");
                  }}
                >
                  <Plus className="h-4 w-4" />
                  הוסף
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ) : step === 2 ? (
        <Card className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">מידות וכמויות</h2>
            <p className="text-sm text-[var(--muted)]">
              אותו דגם עם כמה מידות = מוצר אחד. סמנו למטה והזינו את כל המידות.
            </p>
          </div>

          {!category?.hasVariants && (
            <label className="flex items-start gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={multiSizes}
                onChange={(e) => {
                  setMultiSizes(e.target.checked);
                  setMatrixRows([]);
                  if (e.target.checked && !attrOptions["מידה"]) {
                    setAttrOptions((prev) => ({ ...prev, מידה: "" }));
                  }
                }}
              />
              <span>
                <span className="font-medium">יש כמה מידות לאותו דגם</span>
                <span className="mt-0.5 block text-[var(--muted)]">
                  למשל S / M / L — נוצרות כמה מידות / גרסאות בתוך אותו מוצר
                </span>
              </span>
            </label>
          )}

          {useMulti ? (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                {schema.map((attr) => (
                  <div key={attr}>
                    <Label>{attr}</Label>
                    <Input
                      placeholder={
                        attr === "מידה" || attr === "Size"
                          ? "S, M, L, XL"
                          : attr === "צבע" || attr === "Color"
                            ? "שחור, לבן, כחול"
                            : "ערך1, ערך2, ערך3"
                      }
                      value={attrOptions[attr] || ""}
                      onChange={(e) =>
                        setAttrOptions((prev) => ({
                          ...prev,
                          [attr]: e.target.value,
                        }))
                      }
                    />
                  </div>
                ))}
                <div>
                  <Label>כמות התחלתית לכולן (אופציונלי)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    inputMode="numeric"
                    placeholder="למשל 10"
                    value={defaultVariantQty}
                    onChange={(e) => setDefaultVariantQty(e.target.value)}
                  />
                </div>
                <div>
                  <Label>כמות מינימום לכולן</Label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    inputMode="numeric"
                    value={simpleMinAlert}
                    onChange={(e) => setSimpleMinAlert(e.target.value)}
                  />
                </div>
              </div>
              <Button type="button" variant="secondary" onClick={generateMatrix}>
                צור מידות ({schema.join(" × ") || "מידה"})
              </Button>

              {matrixRows.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-[var(--muted)]">
                    הזינו כמות ומינימום לכל שורה, ואז המשיכו לשלב הבא —{" "}
                    {matrixRows.reduce((s, r) => s + (r.quantityOnHand || 0), 0)}{" "}
                    יח׳ בסך הכל
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px] text-sm">
                      <thead>
                        <tr className="text-right text-[var(--muted)]">
                          <th className="pb-2">מאפיינים</th>
                          <th className="pb-2">קוד פריט</th>
                          <th className="pb-2">ברקוד</th>
                          <th className="pb-2">כמות במלאי</th>
                          <th className="pb-2">מינימום</th>
                          <th className="pb-2">מיקום</th>
                        </tr>
                      </thead>
                      <tbody>
                        {matrixRows.map((row, idx) => (
                          <tr
                            key={idx}
                            className="border-t border-[var(--border)]"
                          >
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
                                  const value = e.target.value;
                                  setMatrixRows((prev) => {
                                    const next = [...prev];
                                    next[idx] = { ...next[idx], sku: value };
                                    return next;
                                  });
                                }}
                              />
                            </td>
                            <td className="py-2">
                              <Input
                                className="font-mono text-xs"
                                value={row.barcode}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setMatrixRows((prev) => {
                                    const next = [...prev];
                                    next[idx] = {
                                      ...next[idx],
                                      barcode: value,
                                    };
                                    return next;
                                  });
                                }}
                                required
                              />
                            </td>
                            <td className="py-2 w-28">
                              <Input
                                type="number"
                                min="0"
                                step="1"
                                inputMode="numeric"
                                className="font-semibold"
                                value={
                                  row.quantityOnHand === 0
                                    ? ""
                                    : row.quantityOnHand
                                }
                                placeholder="0"
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  const qty =
                                    raw === ""
                                      ? 0
                                      : Math.max(
                                          0,
                                          Math.floor(Number(raw) || 0)
                                        );
                                  setMatrixRows((prev) => {
                                    const next = [...prev];
                                    next[idx] = {
                                      ...next[idx],
                                      quantityOnHand: qty,
                                    };
                                    return next;
                                  });
                                }}
                              />
                            </td>
                            <td className="py-2 w-24">
                              <Input
                                type="number"
                                min="0"
                                step="1"
                                inputMode="numeric"
                                value={row.minAlertLevel}
                                onChange={(e) => {
                                  const min = Math.max(
                                    0,
                                    Math.floor(Number(e.target.value) || 0)
                                  );
                                  setMatrixRows((prev) => {
                                    const next = [...prev];
                                    next[idx] = {
                                      ...next[idx],
                                      minAlertLevel: min,
                                    };
                                    return next;
                                  });
                                }}
                              />
                            </td>
                            <td className="py-2">
                              <Select
                                value={row.locationId}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setMatrixRows((prev) => {
                                    const next = [...prev];
                                    next[idx] = {
                                      ...next[idx],
                                      locationId: value,
                                    };
                                    return next;
                                  });
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
                </div>
              )}
            </>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <Label>ברקוד (אופציונלי)</Label>
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
                <Label>כמות מינימום</Label>
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
          )}
        </Card>
      ) : (
        <Card className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">סיכום ושמירה</h2>
            <p className="text-sm text-[var(--muted)]">
              בדקו שהכול נכון ולחצו «שמור מוצר».
            </p>
          </div>
          <div className="flex flex-wrap items-start gap-4">
            {imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt={title}
                className="h-24 w-24 rounded-lg border border-[var(--border)] object-cover"
              />
            )}
            <dl className="grid flex-1 grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-[var(--muted)]">שם המוצר</dt>
              <dd className="font-semibold">{title}</dd>
              <dt className="text-[var(--muted)]">קוד דגם</dt>
              <dd className="font-mono">{baseSku.toUpperCase()}</dd>
              <dt className="text-[var(--muted)]">קבוצה</dt>
              <dd>{category?.name || "—"}</dd>
              <dt className="text-[var(--muted)]">מספר מידות / גרסאות</dt>
              <dd>{sizesCount}</dd>
              <dt className="text-[var(--muted)]">סה״כ כמות</dt>
              <dd className="font-semibold">{totalQty} יח׳</dd>
            </dl>
          </div>
        </Card>
      )}

      {error && (
        <div className="rounded-lg border border-[var(--danger)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
          {error}
        </div>
      )}

      {isEdit ? (
        <div className="flex gap-3">
          <Button key="save-edit" type="submit" disabled={loading}>
            {loading ? "שומר..." : "שמור שינויים"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            ביטול
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          {step > 1 && (
            <Button
              key="wizard-back"
              type="button"
              variant="secondary"
              onClick={goBack}
              disabled={loading}
            >
              חזרה
            </Button>
          )}
          {step < 3 ? (
            <Button key="wizard-next" type="button" onClick={goNext}>
              הבא
            </Button>
          ) : (
            <Button key="wizard-submit" type="submit" disabled={loading}>
              {loading ? "שומר..." : "שמור מוצר"}
            </Button>
          )}
          <Button
            key="wizard-cancel"
            type="button"
            variant="secondary"
            onClick={() => router.back()}
          >
            ביטול
          </Button>
        </div>
      )}
    </form>
  );
}
