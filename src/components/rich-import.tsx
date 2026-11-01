"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Label } from "@/components/ui";
import { Download, FileSpreadsheet, Upload } from "lucide-react";

type ImportKind = "customers" | "sales-orders";

const META: Record<
  ImportKind,
  {
    title: string;
    description: string;
    endpoint: string;
    template: string;
    acceptHint: string;
    formatMsg: (data: Record<string, unknown>) => string;
  }
> = {
  customers: {
    title: "ייבוא לקוחות",
    description: "CSV עם שם, טלפון, אימייל, כתובת, ח.פ, תקרת אשראי. לקוח קיים מתעדכן לפי שם/טלפון/אימייל.",
    endpoint: "/api/import/customers",
    template: "/api/import/customers/template",
    acceptHint: "שם, טלפון, אימייל, כתובת, ח.פ, תקרת אשראי, הערות",
    formatMsg: (data) =>
      `לקוחות: נוצרו ${data.created ?? 0} · עודכנו ${data.updated ?? 0}${
        Array.isArray(data.errors) && data.errors.length
          ? ` · ${data.errors.length} שגיאות`
          : ""
      }`,
  },
  "sales-orders": {
    title: "ייבוא הזמנות מכירה",
    description:
      "CSV שורות: הזמנה, לקוח, SKU, כמות, מחיר, עדיפות. שורות עם אותו מספר הזמנה מתקבצות להזמנה אחת.",
    endpoint: "/api/import/sales-orders",
    template: "/api/import/sales-orders/template",
    acceptHint: "הזמנה, לקוח, SKU, כמות, מחיר, עדיפות",
    formatMsg: (data) =>
      `הזמנות: נוצרו ${data.created ?? 0} · שורות ${data.linesCreated ?? 0}${
        Array.isArray(data.errors) && data.errors.length
          ? ` · ${data.errors.length} שגיאות`
          : ""
      }`,
  },
};

function ImportCard({ kind }: { kind: ImportKind }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const meta = META[kind];
  const [fileName, setFileName] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function runImport(file: File) {
    setBusy(true);
    setError("");
    setMsg("");
    setFileName(file.name);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(meta.endpoint, { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      setMsg(meta.formatMsg(data));
      const errs = [
        ...(Array.isArray(data.errors) ? data.errors : []),
        ...(Array.isArray(data.parseErrors) ? data.parseErrors : []),
      ];
      if (errs.length) setError(errs.slice(0, 8).join(" | "));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <Card className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{meta.title}</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">{meta.description}</p>
      </div>

      <a href={meta.template} download>
        <Button type="button" variant="secondary">
          <Download className="h-4 w-4" />
          הורדת תבנית CSV
        </Button>
      </a>

      <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-2)] p-4">
        <Label>העלאת קובץ (.csv)</Label>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="mt-2 block w-full text-sm"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void runImport(f);
          }}
        />
        {fileName && (
          <p className="mt-2 flex items-center gap-2 text-xs text-[var(--muted)]">
            <FileSpreadsheet className="h-3.5 w-3.5" />
            {fileName}
          </p>
        )}
        <p className="mt-2 text-xs text-[var(--muted)]">
          עמודות: {meta.acceptHint}
        </p>
      </div>

      {(msg || error) && (
        <div className="space-y-2">
          {msg && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
              {msg}
            </div>
          )}
          {error && (
            <div className="rounded-lg border border-[var(--danger)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
              {error}
            </div>
          )}
        </div>
      )}

      {busy && (
        <p className="flex items-center gap-2 text-sm text-[var(--muted)]">
          <Upload className="h-4 w-4 animate-pulse" />
          מייבא…
        </p>
      )}
    </Card>
  );
}

export function RichImport() {
  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-2">
      <ImportCard kind="customers" />
      <ImportCard kind="sales-orders" />
    </div>
  );
}
