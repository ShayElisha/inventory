"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";
import { Paperclip, Trash2, Upload } from "lucide-react";

type Attachment = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  url: string | null;
  createdAt: string;
  uploadedBy?: { name: string } | null;
};

export function AttachmentsPanel({
  entityType,
  entityId,
  title = "צרופות",
}: {
  entityType: string;
  entityId: string;
  title?: string;
}) {
  const [items, setItems] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(
      `/api/attachments?entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}`
    );
    if (!res.ok) return;
    setItems(await res.json());
  }, [entityType, entityId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onFile(file: File | null) {
    if (!file) return;
    setLoading(true);
    setError("");
    try {
      const dataUrl = await readAsDataUrl(file);
      const res = await fetch("/api/attachments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType,
          entityId,
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
          dataUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה בהעלאה");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  async function remove(id: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/attachments?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "שגיאה");
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-display text-base font-semibold">
          <Paperclip className="h-4 w-4" />
          {title}
        </h3>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-[var(--surface-2)]">
          <Upload className="h-3.5 w-3.5" />
          העלאה
          <input
            type="file"
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
            disabled={loading}
            onChange={(e) => onFile(e.target.files?.[0] || null)}
          />
        </label>
      </div>
      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
      {items.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">
          אין צרופות עדיין — חשבונית ספק, תעודת משלוח או תמונת נזק.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
            >
              <div className="min-w-0 flex-1">
                {a.url ? (
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-[var(--accent)] underline"
                  >
                    {a.fileName}
                  </a>
                ) : (
                  <span className="font-medium">{a.fileName}</span>
                )}
                <p className="text-xs text-[var(--muted)]">
                  {formatDateTime(a.createdAt)}
                  {a.uploadedBy?.name ? ` · ${a.uploadedBy.name}` : ""}
                  {a.sizeBytes ? ` · ${Math.round(a.sizeBytes / 1024)}KB` : ""}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={loading}
                onClick={() => remove(a.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("קריאת קובץ נכשלה"));
    reader.readAsDataURL(file);
  });
}
