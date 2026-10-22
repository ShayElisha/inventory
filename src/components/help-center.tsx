"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Clock,
  Search,
  ArrowLeft,
  Lightbulb,
} from "lucide-react";
import { Card, Input } from "@/components/ui";
import { guidesByCategory, HELP_GUIDES, type HelpGuide } from "@/lib/help-guides";
import { cn } from "@/lib/utils";

function GuideCard({ guide }: { guide: HelpGuide }) {
  return (
    <Link
      href={`/help/${guide.slug}`}
      className="group block rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow)] transition hover:-translate-y-0.5 hover:border-[var(--accent)]/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-[var(--accent)]">{guide.category}</p>
          <h3 className="mt-1 font-display text-base font-semibold text-[var(--foreground)] group-hover:text-[var(--accent)]">
            {guide.title}
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted)]">
            {guide.summary}
          </p>
        </div>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
          <BookOpen className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-3 flex items-center gap-1.5 text-xs text-[var(--muted)]">
        <Clock className="h-3.5 w-3.5" />
        כ־{guide.minutes} דק׳ קריאה
      </div>
    </Link>
  );
}

export function HelpCenter() {
  const [q, setQ] = useState("");
  const grouped = useMemo(() => guidesByCategory(), []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return null;
    return HELP_GUIDES.filter(
      (g) =>
        g.title.toLowerCase().includes(term) ||
        g.summary.toLowerCase().includes(term) ||
        g.category.toLowerCase().includes(term) ||
        g.steps.some(
          (s) =>
            s.title.toLowerCase().includes(term) ||
            s.body.toLowerCase().includes(term)
        )
    );
  }, [q]);

  return (
    <div className="space-y-8">
      <Card className="overflow-hidden border-[var(--accent)]/20 bg-gradient-to-l from-[var(--accent-soft)]/40 to-[var(--surface)] p-0">
        <div className="px-5 py-6 sm:px-7 sm:py-8">
          <p className="text-sm font-medium text-[var(--accent)]">מרכז עזרה</p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            מדריכים בתוך המערכת
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
            הסברים קצרים לקליטה, ניפוק, קטלוג, ליקוט, ספירה, צוות ועוד — בלי
            לצאת מ־Sfira.
          </p>
          <div className="relative mt-5 max-w-xl">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="חיפוש במדריכים… למשל ניפוק, סיסמה, ליקוט"
              className="pe-10"
            />
          </div>
        </div>
      </Card>

      {filtered ? (
        <section>
          <h2 className="mb-3 font-display text-lg font-semibold">
            תוצאות ({filtered.length})
          </h2>
          {filtered.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">לא נמצאו מדריכים התואמים לחיפוש.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((g) => (
                <GuideCard key={g.slug} guide={g} />
              ))}
            </div>
          )}
        </section>
      ) : (
        grouped.map(([category, guides]) => (
          <section key={category}>
            <h2 className="mb-3 font-display text-lg font-semibold">{category}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {guides.map((g) => (
                <GuideCard key={g.slug} guide={g} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

export function HelpGuideView({ guide }: { guide: HelpGuide }) {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/help"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--accent)]"
        >
          <ArrowLeft className="h-4 w-4" />
          חזרה למרכז העזרה
        </Link>
        <p className="mt-4 text-xs font-medium text-[var(--accent)]">
          {guide.category}
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">
          {guide.title}
        </h1>
        <p className="mt-2 text-[var(--muted)]">{guide.summary}</p>
        <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-[var(--muted)]">
          <Clock className="h-3.5 w-3.5" />
          כ־{guide.minutes} דק׳ קריאה
        </p>
      </div>

      <ol className="space-y-4">
        {guide.steps.map((step, i) => (
          <li key={step.title}>
            <Card>
              <div className="flex gap-4">
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-display text-sm font-bold",
                    "bg-[var(--accent-soft)] text-[var(--accent)]"
                  )}
                >
                  {i + 1}
                </span>
                <div>
                  <h2 className="font-display text-lg font-semibold">{step.title}</h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted)]">
                    {step.body}
                  </p>
                </div>
              </div>
            </Card>
          </li>
        ))}
      </ol>

      {guide.tips && guide.tips.length > 0 && (
        <Card className="border-[var(--warn)]/25 bg-[var(--warn-soft)]/40">
          <div className="mb-2 flex items-center gap-2 font-display font-semibold text-[var(--warn)]">
            <Lightbulb className="h-4 w-4" />
            טיפים
          </div>
          <ul className="list-disc space-y-1 pe-5 text-sm text-[var(--foreground)]/85">
            {guide.tips.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </Card>
      )}

      {guide.relatedHref && (
        <div className="flex flex-wrap gap-2">
          <Link
            href={guide.relatedHref}
            className="inline-flex rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-[var(--accent-fg)] hover:bg-[var(--accent-hover)]"
          >
            {guide.relatedLabel || "למסך הרלוונטי"}
          </Link>
          <Link
            href="/help"
            className="inline-flex rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm font-medium hover:bg-[var(--surface-2)]"
          >
            עוד מדריכים
          </Link>
        </div>
      )}
    </div>
  );
}
