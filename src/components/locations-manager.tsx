"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, Input, Label, Select } from "@/components/ui";
import { Pencil, Trash2, Check, X, Warehouse } from "lucide-react";

type WarehouseRow = {
  id: string;
  name: string;
  code: string;
  address: string | null;
  isDefault: boolean;
  active: boolean;
  _count?: { locations: number };
};

type Location = {
  id: string;
  warehouseId: string | null;
  zone: string;
  aisle: string;
  shelf: string;
  bin: string;
  code: string;
  _count: { variants: number };
  warehouse?: { id: string; name: string; code: string } | null;
};

export function LocationsManager({
  locations,
  warehouses,
}: {
  locations: Location[];
  warehouses: WarehouseRow[];
}) {
  const router = useRouter();
  const defaultWh =
    warehouses.find((w) => w.isDefault)?.id || warehouses[0]?.id || "";
  const [warehouseId, setWarehouseId] = useState(defaultWh);
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

  const [whName, setWhName] = useState("");
  const [whCode, setWhCode] = useState("");
  const [whAddress, setWhAddress] = useState("");

  const filtered = useMemo(
    () =>
      warehouseId
        ? locations.filter((l) => l.warehouseId === warehouseId)
        : locations,
    [locations, warehouseId]
  );

  const activeWarehouse = warehouses.find((w) => w.id === warehouseId);

  async function createWarehouse(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/warehouses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: whName,
          code: whCode,
          address: whAddress || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      setWhName("");
      setWhCode("");
      setWhAddress("");
      setWarehouseId(data.id);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  async function setDefault() {
    if (!warehouseId) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/warehouses/${warehouseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
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

  async function deleteWarehouse() {
    if (!warehouseId || !activeWarehouse) return;
    if (!confirm(`למחוק את המחסן «${activeWarehouse.name}»?`)) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/warehouses/${warehouseId}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "שגיאה");
      setWarehouseId("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  async function createLocation(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zone, aisle, shelf, bin, warehouseId }),
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
    <div className="space-y-6">
      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            <Warehouse className="h-5 w-5 text-[var(--accent)]" />
            מחסנים
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.code})
                  {w.isDefault ? " · ברירת מחדל" : ""}
                </option>
              ))}
            </Select>
            {activeWarehouse && !activeWarehouse.isDefault && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={loading}
                onClick={setDefault}
              >
                הגדר כברירת מחדל
              </Button>
            )}
            {activeWarehouse && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={loading}
                onClick={deleteWarehouse}
              >
                מחק מחסן
              </Button>
            )}
          </div>
        </div>
        {activeWarehouse && (
          <p className="mb-4 text-sm text-[var(--muted)]">
            {activeWarehouse.address || "ללא כתובת"} ·{" "}
            {activeWarehouse._count?.locations ?? filtered.length} מיקומים
            {activeWarehouse.isDefault && (
              <>
                {" "}
                · <Badge tone="ok">ברירת מחדל</Badge>
              </>
            )}
          </p>
        )}
        <form
          onSubmit={createWarehouse}
          className="grid gap-3 sm:grid-cols-4 sm:items-end"
        >
          <div>
            <Label>שם מחסן חדש</Label>
            <Input
              value={whName}
              onChange={(e) => setWhName(e.target.value)}
              required
              placeholder="למשל: צפון"
            />
          </div>
          <div>
            <Label>קוד</Label>
            <Input
              value={whCode}
              onChange={(e) => setWhCode(e.target.value)}
              required
              placeholder="N1"
            />
          </div>
          <div>
            <Label>כתובת</Label>
            <Input
              value={whAddress}
              onChange={(e) => setWhAddress(e.target.value)}
              placeholder="אופציונלי"
            />
          </div>
          <Button type="submit" disabled={loading}>
            הוסף מחסן
          </Button>
        </form>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <h2 className="mb-4 text-lg font-semibold">מיקום חדש</h2>
          <form onSubmit={createLocation} className="space-y-3">
            <div>
              <Label>מחסן</Label>
              <Select
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                required
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>אזור (Zone)</Label>
              <Input
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>מעבר (Aisle)</Label>
              <Input
                value={aisle}
                onChange={(e) => setAisle(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>מדף (Shelf)</Label>
              <Input
                value={shelf}
                onChange={(e) => setShelf(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>תא (Bin)</Label>
              <Input
                value={bin}
                onChange={(e) => setBin(e.target.value)}
                required
              />
            </div>
            <p className="text-xs text-[var(--muted)]">
              קוד מלא: {(zone || "?").toUpperCase()}-{aisle}-{shelf}-{bin}
            </p>
            {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
            <Button type="submit" disabled={loading || !warehouseId}>
              {loading ? "שומר..." : "הוסף מיקום"}
            </Button>
          </form>
        </Card>

        <Card className="lg:col-span-2 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-right text-[var(--muted)]">
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
              {filtered.map((l) => (
                <tr key={l.id} className="border-b border-[var(--border)]">
                  {editId === l.id ? (
                    <>
                      <td className="py-2 font-mono text-xs text-[var(--muted)]">
                        {editZone.toUpperCase()}-{editAisle}-{editShelf}-
                        {editBin}
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
                            className="rounded-lg p-1.5 text-[var(--accent)] hover:bg-[var(--accent-soft)]"
                            title="שמור"
                            disabled={loading}
                            onClick={() => saveEdit(l.id)}
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--surface-2)]"
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
                            className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--surface-2)]"
                            title="עריכה"
                            onClick={() => startEdit(l)}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="rounded-lg p-1.5 text-[var(--danger)] hover:bg-[var(--danger-soft)]"
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
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="py-6 text-center text-[var(--muted)]"
                  >
                    אין מיקומים במחסן זה
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
