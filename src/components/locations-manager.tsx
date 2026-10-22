"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label } from "@/components/ui";
import { Pencil, Trash2, Check, X } from "lucide-react";

type Location = {
  id: string;
  zone: string;
  aisle: string;
  shelf: string;
  bin: string;
  code: string;
  _count: { variants: number };
};

export function LocationsManager({ locations }: { locations: Location[] }) {
  const router = useRouter();
  const [zone, setZone] = useState("A");
  const [aisle, setAisle] = useState("01");
  const [shelf, setShelf] = useState("01");
  const [bin, setBin] = useState("01");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editZone, setEditZone] = useState("");
  const [editAisle, setEditAisle] = useState("");
  const [editShelf, setEditShelf] = useState("");
  const [editBin, setEditBin] = useState("");

  async function createLocation(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zone, aisle, shelf, bin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  function startEdit(l: Location) {
    setEditId(l.id);
    setEditZone(l.zone);
    setEditAisle(l.aisle);
    setEditShelf(l.shelf);
    setEditBin(l.bin);
  }

  async function saveEdit(id: string) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/locations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zone: editZone,
          aisle: editAisle,
          shelf: editShelf,
          bin: editBin,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      setEditId(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  async function deleteLocation(l: Location) {
    if (!confirm(`למחוק את המיקום ${l.code}?`)) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/locations/${l.id}`, { method: "DELETE" });
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
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <h2 className="mb-4 text-lg font-semibold">מיקום חדש</h2>
        <form onSubmit={createLocation} className="space-y-3">
          <div>
            <Label>אזור (Zone)</Label>
            <Input value={zone} onChange={(e) => setZone(e.target.value)} required />
          </div>
          <div>
            <Label>מעבר (Aisle)</Label>
            <Input value={aisle} onChange={(e) => setAisle(e.target.value)} required />
          </div>
          <div>
            <Label>מדף (Shelf)</Label>
            <Input value={shelf} onChange={(e) => setShelf(e.target.value)} required />
          </div>
          <div>
            <Label>תא (Bin)</Label>
            <Input value={bin} onChange={(e) => setBin(e.target.value)} required />
          </div>
          <p className="text-xs text-slate-500">
            קוד מלא: {(zone || "?").toUpperCase()}-{aisle}-{shelf}-{bin}
          </p>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? "שומר..." : "הוסף מיקום"}
          </Button>
        </form>
      </Card>

      <Card className="lg:col-span-2 overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-right text-slate-500">
              <th className="pb-2 font-medium">קוד</th>
              <th className="pb-2 font-medium">אזור</th>
              <th className="pb-2 font-medium">מעבר</th>
              <th className="pb-2 font-medium">מדף</th>
              <th className="pb-2 font-medium">תא</th>
              <th className="pb-2 font-medium">SKU</th>
              <th className="pb-2 font-medium">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {locations.map((l) => (
              <tr key={l.id} className="border-b border-slate-50">
                {editId === l.id ? (
                  <>
                    <td className="py-2 font-mono text-xs text-slate-500">
                      {editZone.toUpperCase()}-{editAisle}-{editShelf}-{editBin}
                    </td>
                    <td className="py-2">
                      <Input
                        className="w-16"
                        value={editZone}
                        onChange={(e) => setEditZone(e.target.value)}
                      />
                    </td>
                    <td className="py-2">
                      <Input
                        className="w-16"
                        value={editAisle}
                        onChange={(e) => setEditAisle(e.target.value)}
                      />
                    </td>
                    <td className="py-2">
                      <Input
                        className="w-16"
                        value={editShelf}
                        onChange={(e) => setEditShelf(e.target.value)}
                      />
                    </td>
                    <td className="py-2">
                      <Input
                        className="w-16"
                        value={editBin}
                        onChange={(e) => setEditBin(e.target.value)}
                      />
                    </td>
                    <td className="py-2">{l._count.variants}</td>
                    <td className="py-2">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          className="rounded-lg p-1.5 text-teal-700 hover:bg-teal-50"
                          title="שמור"
                          disabled={loading}
                          onClick={() => saveEdit(l.id)}
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100"
                          title="ביטול"
                          onClick={() => setEditId(null)}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="py-2.5 font-mono font-medium">{l.code}</td>
                    <td className="py-2.5">{l.zone}</td>
                    <td className="py-2.5">{l.aisle}</td>
                    <td className="py-2.5">{l.shelf}</td>
                    <td className="py-2.5">{l.bin}</td>
                    <td className="py-2.5">{l._count.variants}</td>
                    <td className="py-2.5">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100"
                          title="עריכה"
                          onClick={() => startEdit(l)}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50"
                          title="מחיקה"
                          disabled={loading}
                          onClick={() => deleteLocation(l)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {locations.length === 0 && (
              <tr>
                <td colSpan={7} className="py-6 text-center text-slate-500">
                  אין מיקומים עדיין
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
