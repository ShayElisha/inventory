"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  Package,
  ScanBarcode,
  ClipboardList,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const advantages = [
  {
    id: "speed",
    title: "ניפוק וקליטה בלחיצה",
    desc: "חיפוש לפי שם, מק״ט או ברקוד — כמות ואישור מיידיים.",
    icon: Zap,
    metric: { label: "שניות לפעולה", from: 12, to: 2 },
  },
  {
    id: "matrix",
    title: "מטריצת וריאציות",
    desc: "יצירת SKU אוטומטית למידות, צבעים וגזרות.",
    icon: Package,
    metric: { label: "וריאציות בדקה", from: 4, to: 48 },
  },
  {
    id: "pick",
    title: "ליקוט וספירות שטח",
    desc: "רשימות הזמנה והשוואת ספירה מול המערכת.",
    icon: ClipboardList,
    metric: { label: "דיוק ספירה %", from: 82, to: 99 },
  },
  {
    id: "scan",
    title: "מסופון סריקה",
    desc: "ממשק נייד ל־+1/−1 והעברת מדף בשטח.",
    icon: ScanBarcode,
    metric: { label: "סריקות ביום", from: 120, to: 1840 },
  },
  {
    id: "reports",
    title: "דוחות וייצוא",
    desc: "מלאי מת, Top 20, פחת ושווי לפי קטגוריה.",
    icon: BarChart3,
    metric: { label: "KPIs חיים", from: 3, to: 12 },
  },
  {
    id: "audit",
    title: "הרשאות ו־Audit",
    desc: "תפקידים לפי חברה ותיעוד מלא של פעולות.",
    icon: ShieldCheck,
    metric: { label: "שכבות הרשאה", from: 1, to: 3 },
  },
];

const flow = [
  { id: "in", label: "קליטה" },
  { id: "shelf", label: "מדף" },
  { id: "pick", label: "ליקוט" },
  { id: "out", label: "ניפוק" },
];

function useAnimatedNumber(target: number, active: boolean) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) return;
    let frame = 0;
    const frames = 36;
    const start = 0;
    const id = window.setInterval(() => {
      frame += 1;
      const t = frame / frames;
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(start + (target - start) * eased));
      if (frame >= frames) window.clearInterval(id);
    }, 28);
    return () => window.clearInterval(id);
  }, [target, active]);
  return value;
}

export function LandingAdvantagesLive() {
  const [active, setActive] = useState(0);
  const [flowStep, setFlowStep] = useState(0);
  const current = advantages[active];
  const Icon = current.icon;
  const metricValue = useAnimatedNumber(current.metric.to, true);

  useEffect(() => {
    const id = window.setInterval(() => {
      setActive((i) => (i + 1) % advantages.length);
    }, 3200);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setFlowStep((i) => (i + 1) % flow.length);
    }, 1400);
    return () => window.clearInterval(id);
  }, []);

  return (
    <section className="relative overflow-hidden border-y border-white/10 bg-[#0e1c17] py-20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(184,224,106,0.12),transparent_55%)]" />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">
            היתרונות של Sfira — בזמן אמת
          </h2>
          <p className="mt-2 text-white/65">
            זרימת מחסן חיה שממחישה איך Sfira מקצרת תהליכים ומגדילה דיוק.
          </p>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Live flow visual */}
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0b1613]/80 p-6 sm:p-8">
            <div className="mb-8 flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-[#b8e06a]">זרימת מלאי חיה</p>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#b8e06a]/30 bg-[#b8e06a]/10 px-3 py-1 text-xs text-[#b8e06a]">
                <span className="relative flex h-2 w-2">
                  <span className="adv-pulse absolute inline-flex h-full w-full rounded-full" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#b8e06a]" />
                </span>
                LIVE
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              {flow.map((step, i) => (
                <div key={step.id} className="flex flex-1 items-center gap-2 min-w-[72px]">
                  <div
                    className={cn(
                      "relative flex h-14 w-14 items-center justify-center rounded-2xl border text-xs font-semibold transition duration-500",
                      flowStep === i
                        ? "border-[#b8e06a] bg-[#b8e06a] text-[#0b1613] scale-105"
                        : "border-white/15 bg-white/5 text-white/70"
                    )}
                  >
                    {flowStep === i && (
                      <span className="adv-pulse absolute inset-0 rounded-2xl" />
                    )}
                    {step.label}
                  </div>
                  {i < flow.length - 1 && (
                    <svg
                      className="hidden h-4 flex-1 sm:block"
                      viewBox="0 0 80 12"
                      fill="none"
                      aria-hidden
                    >
                      <line
                        x1="0"
                        y1="6"
                        x2="80"
                        y2="6"
                        stroke={flowStep === i ? "#b8e06a" : "rgba(255,255,255,0.2)"}
                        strokeWidth="2"
                        className={flowStep === i ? "adv-flow-line" : undefined}
                      />
                    </svg>
                  )}
                </div>
              ))}
            </div>

            <div className="adv-float mt-10 rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#b8e06a] text-[#0b1613]">
                  <Icon className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-xl font-bold text-white">
                    {current.title}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-white/65">
                    {current.desc}
                  </p>
                </div>
              </div>
              <div className="adv-active-card mt-5 inline-flex flex-col rounded-xl border border-[#b8e06a]/25 bg-[#0b1613] px-5 py-3">
                <span className="text-xs text-white/50">{current.metric.label}</span>
                <span className="font-display text-3xl font-extrabold text-[#b8e06a]">
                  {metricValue.toLocaleString("he-IL")}
                </span>
              </div>
            </div>
          </div>

          {/* Advantage picker */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {advantages.map((a, i) => {
              const AIcon = a.icon;
              const selected = i === active;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setActive(i)}
                  className={cn(
                    "rounded-xl border p-4 text-right transition duration-300",
                    selected
                      ? "border-[#b8e06a]/50 bg-[#b8e06a]/10 shadow-[0_0_24px_rgba(184,224,106,0.12)]"
                      : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                        selected
                          ? "bg-[#b8e06a] text-[#0b1613]"
                          : "bg-white/10 text-white/70"
                      )}
                    >
                      <AIcon className="h-4 w-4" />
                    </span>
                    <div>
                      <p
                        className={cn(
                          "font-display font-semibold",
                          selected ? "text-white" : "text-white/85"
                        )}
                      >
                        {a.title}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-white/55">
                        {a.desc}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
