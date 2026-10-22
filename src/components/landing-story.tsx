"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  Users,
  PackageCheck,
  ScanLine,
  LineChart,
  Shield,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

const steps = [
  {
    title: "פותחים חברה",
    text: "הרשמה מהירה, מנהל ראשי, והפרדה מלאה בין ארגונים.",
    icon: Building2,
  },
  {
    title: "מזמינים צוות",
    text: "עובדים עם תפקידים — מנהל, מחסנאי או צופה — באימייל או בטלפון.",
    icon: Users,
  },
  {
    title: "מקימים קטלוג",
    text: "מוצרים פשוטים או טבלת אפשרויות מוצר עם מק״ט וברקוד אוטומטיים.",
    icon: PackageCheck,
  },
  {
    title: "עובדים בשטח",
    text: "קליטה, ניפוק, ליקוט, ספירה וסריקה — במחשב או במסופון.",
    icon: ScanLine,
  },
  {
    title: "מנהלים לפי נתונים",
    text: "דשבורד חי, דוחות Excel, מלאי מת ודיוק ספירות.",
    icon: LineChart,
  },
  {
    title: "שולטים בהרשאות",
    text: "Audit מלא — מי עשה מה, מתי, ומאיזה מכשיר.",
    icon: Shield,
  },
];

export function LandingStory() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setActive((i) => (i + 1) % steps.length);
    }, 2800);
    return () => window.clearInterval(id);
  }, []);

  return (
    <section className="relative overflow-hidden bg-[#0b1613] py-20">
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="absolute -left-20 top-10 h-64 w-64 rounded-full bg-[#b8e06a]/10 blur-3xl land-orb" />
        <div className="absolute bottom-0 right-10 h-72 w-72 rounded-full bg-teal-500/10 blur-3xl land-orb-delay" />
      </div>
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold tracking-wide text-[#b8e06a]">
            איך Sfira עובדת
          </p>
          <h2 className="mt-2 font-display text-3xl font-bold text-white sm:text-4xl">
            ממחסן מבולגן — לשליטה מלאה
          </h2>
          <p className="mt-3 text-white/65">
            תהליך ברור בשישה שלבים. כל שלב מופעל אוטומטית בהדגמה חיה למטה.
          </p>
        </div>

        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          {steps.map((step, i) => {
            const Icon = step.icon;
            const on = i === active;
            return (
              <button
                key={step.title}
                type="button"
                onClick={() => setActive(i)}
                className={cn(
                  "group rounded-2xl border p-5 text-right transition duration-500",
                  on
                    ? "border-[#b8e06a]/50 bg-[#b8e06a]/10 land-card-glow"
                    : "border-white/10 bg-white/[0.03] hover:border-white/20"
                )}
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-xl transition",
                      on
                        ? "bg-[#b8e06a] text-[#0b1613]"
                        : "bg-white/10 text-white/70"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="font-mono text-xs text-white/35">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="font-display text-lg font-semibold text-white">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-white/60">
                  {step.text}
                </p>
                {on && (
                  <p className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[#b8e06a]">
                    בשלב הזה עכשיו
                    <ArrowLeft className="h-3.5 w-3.5" />
                  </p>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-8 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-[#b8e06a] transition-all duration-500"
            style={{ width: `${((active + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>
    </section>
  );
}
