"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Input } from "@/components/ui";

export function GlobalSearch() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<{
    products: { id: string; title: string; baseSku: string }[];
    variants: {
      id: string;
      sku: string;
      product: { title: string };
      quantityOnHand: number;
    }[];
    locations: { id: string; code: string }[];
    picks: { id: string; reference: string; status: string }[];
  } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!q.trim()) {
      setData(null);
      return;
    }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
      if (res.ok) setData(await res.json());
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const has =
    data &&
    (data.products.length ||
      data.variants.length ||
      data.locations.length ||
      data.picks.length);

  return (
    <div className="relative hidden min-w-[200px] flex-1 md:block lg:max-w-md" ref={ref}>
      <div className="relative">
        <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
        <Input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="חיפוש גלובלי..."
          className="pr-9"
        />
      </div>
      {open && q.trim() && (
        <div className="absolute z-50 mt-1 max-h-96 w-full overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-xl">
          {!has && (
            <div className="px-4 py-6 text-center text-sm text-[var(--muted)]">אין תוצאות</div>
          )}
          {data?.products.map((p) => (
            <Link
              key={p.id}
              href="/products"
              onClick={() => setOpen(false)}
              className="block px-4 py-2 hover:bg-[var(--surface-2)]"
            >
              <div className="text-xs text-[var(--muted)]">מוצר</div>
              <div className="text-sm font-medium">
                {p.title}{" "}
                <span className="font-mono text-xs text-[var(--muted)]">{p.baseSku}</span>
              </div>
            </Link>
          ))}
          {data?.variants.map((v) => (
            <Link
              key={v.id}
              href="/pick"
              onClick={() => setOpen(false)}
              className="block px-4 py-2 hover:bg-[var(--surface-2)]"
            >
              <div className="text-xs text-[var(--muted)]">SKU</div>
              <div className="text-sm font-medium">
                {v.product.title} · {v.sku} · {v.quantityOnHand} יח׳
              </div>
            </Link>
          ))}
          {data?.locations.map((l) => (
            <Link
              key={l.id}
              href="/locations"
              onClick={() => setOpen(false)}
              className="block px-4 py-2 hover:bg-[var(--surface-2)]"
            >
              <div className="text-xs text-[var(--muted)]">מיקום</div>
              <div className="text-sm font-medium font-mono">{l.code}</div>
            </Link>
          ))}
          {data?.picks.map((p) => (
            <Link
              key={p.id}
              href={`/picks/${p.id}`}
              onClick={() => setOpen(false)}
              className="block px-4 py-2 hover:bg-[var(--surface-2)]"
            >
              <div className="text-xs text-[var(--muted)]">ליקוט</div>
              <div className="text-sm font-medium">
                {p.reference} · {p.status}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
