"use client";

import { Factory, Store, Shirt, Boxes } from "lucide-react";

const audiences = [
  {
    title: "מחסנים ולוגיסטיקה",
    text: "קליטה, ליקוט, העברות מדף וספירות מחזוריות — עם מסופון שטח.",
    icon: Boxes,
  },
  {
    title: "קמעונאות ורשתות",
    text: "מלאי סניפים, ניפוק מהיר והתראות מלאי נמוך בזמן אמת.",
    icon: Store,
  },
  {
    title: "אופנה ווריאציות",
    text: "מטריצות מידה/צבע/גזרה עם יצירת SKU אוטומטית.",
    icon: Shirt,
  },
  {
    title: "ייצור והרכבה",
    text: "מעקב חומרי גלם, פחת, ושמירת היסטוריית תנועות מלאה.",
    icon: Factory,
  },
];

export function LandingAudience() {
  return (
    <section className="bg-[#0e1c17] py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">
            למי Sfira מתאימה
          </h2>
          <p className="mt-3 text-white/65">
            מחברה קטנה עם מחסן אחד ועד ארגון עם כמה אתרים — אותה מערכת, נתונים
            מופרדים לכל חברה.
          </p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {audiences.map((a, i) => {
            const Icon = a.icon;
            return (
              <div
                key={a.title}
                className="land-audience group rounded-2xl border border-white/10 bg-[#0b1613]/60 p-6 transition hover:border-[#b8e06a]/35"
                style={{ animationDelay: `${i * 90}ms` }}
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#b8e06a]/15 text-[#b8e06a] transition group-hover:scale-110">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="font-display text-xl font-semibold text-white">
                  {a.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-white/60">
                  {a.text}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
