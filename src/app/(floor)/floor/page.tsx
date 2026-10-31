import Link from "next/link";
import { PackagePlus, MapPin, PackageMinus } from "lucide-react";
import { requireTenant } from "@/lib/tenant";

const steps = [
  {
    href: "/floor/receive",
    title: "1 · קליטה",
    desc: "סחורה שנכנסת למחסן",
    icon: PackagePlus,
    tone: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  },
  {
    href: "/floor/shelf",
    title: "2 · מדף",
    desc: "שיבוץ למיקום במדף",
    icon: MapPin,
    tone: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  },
  {
    href: "/floor/pick",
    title: "3 · ניפוק",
    desc: "יציאת מלאי מהמחסן",
    icon: PackageMinus,
    tone: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
  },
];

export default async function FloorHomePage({
  searchParams,
}: {
  searchParams: Promise<{ module?: string }>;
}) {
  const session = await requireTenant();
  const { module: moduleOff } = await searchParams;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-[var(--accent)]">מצב רצפה</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          שלום, {session.name.split(" ")[0]}
        </h1>
        <p className="mt-2 text-[var(--muted)]">
          שלושה מסכים בלבד — בלי תפריטים מבלבלים.
        </p>
      </div>

      {moduleOff === "off" && (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
          המודול הזה כבוי לחברה. פנו למנהל להפעלה.
        </p>
      )}

      <div className="grid gap-3">
        {steps.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.href}
              href={s.href}
              className="flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow)] transition active:scale-[0.98]"
            >
              <span
                className={`flex h-14 w-14 items-center justify-center rounded-2xl ${s.tone}`}
              >
                <Icon className="h-7 w-7" />
              </span>
              <span className="min-w-0">
                <span className="block text-lg font-bold">{s.title}</span>
                <span className="block text-sm text-[var(--muted)]">
                  {s.desc}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
