import Image from "next/image";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandLogo } from "@/components/brand-logo";
import { LandingAdvantagesLive } from "@/components/landing-advantages-live";
import { LandingStory } from "@/components/landing-story";
import { LandingStats } from "@/components/landing-stats";
import { LandingAudience } from "@/components/landing-audience";

const features = [
  {
    title: "ניפוק וקליטה מהירים",
    text: "חיפוש לפי שם, מק״ט או ברקוד — כמות ואישור בלחיצה אחת. מתאים לדלפק, מסופון ומחסן.",
    image:
      "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1400&q=80",
    alt: "מחסן לוגיסטי עם מדפים גבוהים",
  },
  {
    title: "מטריצת וריאציות",
    text: "מחולל SKU אוטומטי למידות, צבעים וגזרות — בלי טבלאות ידניות ובלי טעויות הקלדה.",
    image:
      "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1400&q=80",
    alt: "מדפי ביגוד בחנות",
  },
  {
    title: "ליקוט וספירות שטח",
    text: "רשימות ליקוט להזמנות, ספירה לפי אזור/מדף והשוואה מול המערכת — עם דיוק מדיד.",
    image:
      "https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=1400&q=80",
    alt: "עובד מחסן עם סורק ברקוד",
  },
  {
    title: "דוחות וייצוא Excel",
    text: "מלאי מת, Top 20, פחת, שווי לפי קטגוריה והשוואת תקופות — לייצוא בלחיצה.",
    image:
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1400&q=80",
    alt: "דשבורד נתונים על מסך",
  },
];

const capabilities = [
  { title: "דשבורד חי", desc: "KPIs, התראות ופיד תנועות לפי יום/שבוע/חודש" },
  { title: "קטלוג היברידי", desc: "מוצרים פשוטים לצד מטריצות וריאציות" },
  { title: "מסופון סריקה", desc: "ממשק נייד ל־+1/−1 והעברת מדף" },
  { title: "ייבוא CSV ו־Bulk", desc: "העלאת קטלוג ועדכון כמויות בכמות" },
  { title: "ניהול עובדים", desc: "הוספת צוות עם אימייל או טלפון ותפקידים" },
  { title: "Audit מלא", desc: "מי עשה מה, מתי, ומאיזה IP" },
];

const extras = [
  {
    title: "רב־חברתי",
    text: "כל חברה עם נתונים מופרדים לגמרי — בלי דליפות בין ארגונים.",
  },
  {
    title: "מצב כהה ובהיר",
    text: "עבודה נוחה בכל משמרת — יום או לילה.",
  },
  {
    title: "אבטחת סיסמאות",
    text: "כללי חוזק מחמירים והצגה/הסתרה בכל מסך התחברות.",
  },
];

export default async function LandingPage() {
  const session = await getSession();

  return (
    <div className="bg-[#0b1613] text-[#f3f7f4]">
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
          <BrandLogo href="/" size="lg" light photo />
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle className="border-white/20 bg-white/10 text-white hover:bg-white/20" />
            {session ? (
              <Link
                href="/dashboard"
                className="rounded-lg bg-[#b8e06a] px-4 py-2 text-sm font-semibold text-[#0b1613] hover:bg-[#c8eb84]"
              >
                למערכת
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-white/90 hover:bg-white/10"
                >
                  התחברות
                </Link>
                <Link
                  href="/register"
                  className="rounded-lg bg-[#b8e06a] px-4 py-2 text-sm font-semibold text-[#0b1613] hover:bg-[#c8eb84]"
                >
                  הרשמת חברה
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative min-h-[100svh] overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=2400&q=80"
          alt="מחסן לוגיסטי מודרני"
          fill
          priority
          className="object-cover land-hero-ken"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b1613] via-[#0b1613]/75 to-[#0b1613]/35" />
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="land-orb absolute -left-16 top-24 h-56 w-56 rounded-full bg-[#b8e06a]/15 blur-3xl" />
          <div className="land-orb-delay absolute -right-10 bottom-32 h-64 w-64 rounded-full bg-teal-400/10 blur-3xl" />
          <div className="land-float-chip absolute left-[8%] top-[28%] hidden rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs text-white/80 backdrop-blur sm:block">
            מלאי בזמן אמת
          </div>
          <div className="land-float-chip-delay absolute right-[10%] top-[36%] hidden rounded-full border border-[#b8e06a]/30 bg-[#b8e06a]/15 px-4 py-2 text-xs text-[#b8e06a] backdrop-blur md:block">
            ספירה · ליקוט · סריקה
          </div>
          <div className="land-float-chip absolute bottom-[22%] left-[18%] hidden rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs text-white/75 backdrop-blur lg:block">
            רב־חברתי · Audit
          </div>
        </div>
        <div className="relative mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-end px-4 pb-16 pt-28 sm:px-6 sm:pb-20">
          <div className="land-hero-copy">
            <BrandLogo
              href=""
              size="hero"
              light
              photo
              className="mb-2 land-logo-in"
            />
            <h1 className="mt-4 max-w-2xl text-2xl font-medium leading-snug text-white/95 sm:text-3xl">
              ניהול מלאי ולוגיסטיקה לחברות — בזמן אמת
            </h1>
            <p className="mt-3 max-w-xl text-base text-white/75 sm:text-lg">
              Sfira מחברת מחסן, משרד ושטח: וריאציות, ליקוט, ספירות, דוחות ועובדים —
              במערכת אחת לכל הארגון.
            </p>
          </div>
          <div className="land-hero-cta mt-8 flex flex-wrap gap-3">
            <Link
              href="/register"
              className="rounded-lg bg-[#b8e06a] px-6 py-3 text-base font-semibold text-[#0b1613] transition hover:bg-[#c8eb84] hover:scale-[1.02]"
            >
              פתיחת חברה
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-white/30 bg-white/5 px-6 py-3 text-base font-medium text-white backdrop-blur transition hover:bg-white/10"
            >
              כניסת משתמש
            </Link>
          </div>
        </div>
      </section>

      <div id="stats">
        <LandingStats />
      </div>
      <div id="advantages">
        <LandingAdvantagesLive />
      </div>
      <div id="how">
        <LandingStory />
      </div>
      <div id="audience">
        <LandingAudience />
      </div>

      <section className="border-y border-white/10 bg-[#102019] py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">
            מה אפשר לעשות ב־Sfira
          </h2>
          <p className="mt-2 max-w-2xl text-white/65">
            כל הכלים שצוות מחסן ומנהלים צריכים — ממסופון ועד דוח דיוק מלאי.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {capabilities.map((c, i) => (
              <div
                key={c.title}
                className="land-cap border-t border-[#b8e06a]/40 pt-4"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <h3 className="font-display text-lg font-semibold text-white">
                  {c.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-white/60">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {features.map((f, i) => (
        <section
          key={f.title}
          className={`relative overflow-hidden ${i % 2 === 0 ? "bg-[#0b1613]" : "bg-[#0e1c17]"}`}
        >
          <div
            className={`mx-auto grid max-w-6xl items-center gap-0 lg:grid-cols-2 ${
              i % 2 === 1 ? "lg:[direction:ltr]" : ""
            }`}
          >
            <div
              className={`relative min-h-[320px] w-full sm:min-h-[420px] lg:min-h-[520px] ${
                i % 2 === 1 ? "lg:order-2" : ""
              }`}
            >
              <Image
                src={f.image}
                alt={f.alt}
                fill
                className="land-feature-img object-cover transition duration-700 hover:scale-[1.03]"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
            <div
              className={`px-4 py-14 sm:px-10 lg:py-20 ${i % 2 === 1 ? "lg:[direction:rtl]" : ""}`}
            >
              <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">
                {f.title}
              </h2>
              <p className="mt-4 max-w-md text-lg leading-relaxed text-white/70">
                {f.text}
              </p>
            </div>
          </div>
        </section>
      ))}

      <section className="bg-[#0b1613] py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">
            למה לבחור Sfira
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {extras.map((e, i) => (
              <div
                key={e.title}
                className="land-cap rounded-2xl border border-white/10 bg-white/[0.03] p-6"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <h3 className="font-display text-xl font-semibold text-[#b8e06a]">
                  {e.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-white/65">{e.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden py-24">
        <Image
          src="https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?auto=format&fit=crop&w=2400&q=80"
          alt="משטחי משלוחים במחסן"
          fill
          className="object-cover opacity-40 land-hero-ken"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[#0b1613]/80" />
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <div className="mb-4 flex justify-center">
            <BrandLogo href="" size="xl" light photo showWordmark={false} />
          </div>
          <p className="font-display text-4xl font-extrabold text-white sm:text-5xl">
            Sfira
          </p>
          <p className="mt-4 text-lg text-white/75">
            פתחו חברה, הזמינו את הצוות, והתחילו לנהל מלאי מדויק כבר היום.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/register"
              className="rounded-lg bg-[#b8e06a] px-6 py-3 font-semibold text-[#0b1613] hover:bg-[#c8eb84]"
            >
              הרשמת חברה
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-white/25 px-6 py-3 font-medium text-white hover:bg-white/10"
            >
              התחברות למשתמש
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
