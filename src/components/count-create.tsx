"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label, Select } from "@/components/ui";

export function CountCreate({
  zones,
  shelves,
}: {
  zones: string[];
  shelves: string[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [zone, setZone] = useState("");
  const [shelf, setShelf] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/counts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, zone: zone || null, shelf: shelf || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      router.push(`/counts/${data.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-4">
        <div className="sm:col-span-2">
          <Label>שם ספירה</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="ספירת אזור A"
          />
        </div>
        <div>
          <Label>אזור</Label>
          <Select value={zone} onChange={(e) => setZone(e.target.value)}>
            <option value="">הכל</option>
            {zones.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>מדף</Label>
          <Select value={shelf} onChange={(e) => setShelf(e.target.value)}>
            <option value="">הכל</option>
            {shelves.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>
        <div className="sm:col-span-4">
          <Button type="submit" disabled={loading}>
            התחל ספירה
          </Button>
          {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
        </div>
      </form>
    </Card>
  );
}
