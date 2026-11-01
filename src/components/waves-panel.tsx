"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card } from "@/components/ui";
import { Layers } from "lucide-react";

type Wave = {
  id: string;
  number: string;
  status: string;
  pickLists: {
    id: string;
    reference: string;
    status: string;
    qcStatus: string;
    _count?: { items: number };
  }[];
};

const STATUS: Record<string, string> = {
  OPEN: "פתוח",
  IN_PROGRESS: "בתהליך",
  DONE: "הושלם",
  CANCELLED: "בוטל",
};

const QC: Record<string, string> = {
  NONE: "—",
  PENDING: "ממתין ל־QC",
  PASSED: "עבר QC",
  FAILED: "נכשל QC",
};

export function WavesPanel() {
  const router = useRouter();
  const [waves, setWaves] = useState<Wave[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/waves");
    if (!res.ok) return;
    setWaves(await res.json());
  }

  useEffect(() => {
    void load();
  }, []);

  async function createWave() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/waves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      await load();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  async function act(waveId: string, action: string, extra?: object) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/waves/${waveId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      await load();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-[var(--accent)]" />
          <div>
            <h2 className="font-display text-lg font-semibold">גלי ליקוט + QC</h2>
            <p className="text-sm text-[var(--muted)]">
              מאחד רשימות פתוחות לגל, ואז בקרת איכות לפני משלוח
            </p>
          </div>
        </div>
        <Button disabled={loading} onClick={() => createWave()}>
          צור גל מליקוטים פתוחים
        </Button>
      </Card>
      {error && (
        <p className="rounded-lg bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">
          {error}
        </p>
      )}
      {waves.length === 0 ? (
        <Card>
          <p className="py-8 text-center text-sm text-[var(--muted)]">
            אין גלים עדיין
          </p>
        </Card>
      ) : (
        waves.map((w) => (
          <Card key={w.id} className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-semibold">{w.number}</span>{" "}
                <Badge>{STATUS[w.status] || w.status}</Badge>
                <p className="text-xs text-[var(--muted)]">
                  {w.pickLists.length} רשימות
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {w.status === "OPEN" && (
                  <Button
                    size="sm"
                    disabled={loading}
                    onClick={() => act(w.id, "start")}
                  >
                    התחל
                  </Button>
                )}
                {w.status !== "DONE" && w.status !== "CANCELLED" && (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={loading}
                    onClick={() => act(w.id, "complete")}
                  >
                    סגור גל
                  </Button>
                )}
              </div>
            </div>
            <ul className="space-y-2">
              {w.pickLists.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                >
                  <div>
                    <a href={`/picks/${p.id}`} className="font-medium underline">
                      {p.reference}
                    </a>
                    <span className="ms-2 text-[var(--muted)]">
                      {STATUS[p.status] || p.status} ·{" "}
                      {QC[p.qcStatus] || p.qcStatus}
                    </span>
                  </div>
                  {p.qcStatus === "PENDING" && (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        disabled={loading}
                        onClick={() =>
                          act(w.id, "qc", {
                            pickListId: p.id,
                            result: "PASSED",
                          })
                        }
                      >
                        QC עבר
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={loading}
                        onClick={() =>
                          act(w.id, "qc", {
                            pickListId: p.id,
                            result: "FAILED",
                          })
                        }
                      >
                        נכשל
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        ))
      )}
    </div>
  );
}
