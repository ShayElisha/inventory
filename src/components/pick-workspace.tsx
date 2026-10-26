"use client";

import { useState } from "react";
import { BulkOutboundPanel } from "@/components/bulk-outbound-panel";
import { QuickPick } from "@/components/quick-pick";
import { OutboundTemplatesPanel } from "@/components/outbound-templates-panel";
import { ClipboardList, Zap, LayoutTemplate } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = {
  id: string;
  sku: string;
  barcode: string;
  quantityOnHand: number;
  quantityReserved?: number;
  product: { title: string };
};

type Template = {
  id: string;
  name: string;
  notes: string | null;
  reasonCode: string;
  items: { variantId: string; quantity: number }[];
  _count: { items: number };
};

const TABS = [
  {
    id: "bulk" as const,
    label: "ניפוק מרוכז",
    hint: "רשימת פריטים בלחיצה אחת",
    icon: ClipboardList,
  },
  {
    id: "quick" as const,
    label: "ניפוק מהיר",
    hint: "פריט־פריט / סריקה",
    icon: Zap,
  },
  {
    id: "templates" as const,
    label: "תבניות",
    hint: "סטים חוזרים שמורים",
    icon: LayoutTemplate,
  },
];

export function PickWorkspace({
  templates,
  variants,
}: {
  templates: Template[];
  variants: Variant[];
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("bulk");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {TABS.map(({ id, label, hint, icon: Icon }) => {
          const on = tab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "flex min-w-[140px] flex-col gap-0.5 rounded-xl border px-4 py-3 text-right transition",
                on
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-2)]"
              )}
            >
              <span className="inline-flex items-center gap-2 text-sm font-semibold">
                <Icon className="h-4 w-4" />
                {label}
              </span>
              <span
                className={cn(
                  "text-xs",
                  on ? "text-[var(--accent)]/80" : "text-[var(--muted)]"
                )}
              >
                {hint}
              </span>
            </button>
          );
        })}
      </div>

      {tab === "bulk" && <BulkOutboundPanel variants={variants} />}
      {tab === "quick" && <QuickPick />}
      {tab === "templates" && (
        <OutboundTemplatesPanel templates={templates} variants={variants} />
      )}
    </div>
  );
}
