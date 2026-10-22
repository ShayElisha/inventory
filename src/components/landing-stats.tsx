"use client";

import { useEffect, useState } from "react";

const stats = [
  { label: "חברות על הפלטפורמה", value: 120, suffix: "+" },
  { label: "תנועות מלאי ביום", value: 48000, suffix: "+" },
  { label: "דיוק ספירות ממוצע", value: 99, suffix: "%" },
  { label: "זמן ממוצע לניפוק", value: 2, suffix: " שנ׳" },
];

function useCountUp(target: number, active: boolean) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!active) return;
    let frame = 0;
    const total = 40;
    const id = window.setInterval(() => {
      frame += 1;
      const t = frame / total;
      const eased = 1 - Math.pow(1 - t, 3);
      setN(Math.round(target * eased));
      if (frame >= total) window.clearInterval(id);
    }, 30);
    return () => window.clearInterval(id);
  }, [target, active]);
  return n;
}

function StatItem({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number;
  suffix: string;
}) {
  const n = useCountUp(value, true);
  return (
    <div className="land-stat rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-6 text-center backdrop-blur">
      <p className="font-display text-3xl font-extrabold text-[#b8e06a] sm:text-4xl">
        {n.toLocaleString("he-IL")}
        {suffix}
      </p>
      <p className="mt-2 text-sm text-white/60">{label}</p>
    </div>
  );
}

export function LandingStats() {
  return (
    <section className="border-y border-white/10 bg-[#102019] py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">
            Sfira במספרים
          </h2>
          <p className="mt-2 text-white/65">
            פלטפורמה שנבנתה לקצב של מחסן אמיתי — מהסריקה הראשונה ועד הדוח החודשי.
          </p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <StatItem key={s.label} {...s} />
          ))}
        </div>
      </div>
    </section>
  );
}
