import type { Metadata } from "next";
import { Heebo, Rubik, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const heebo = Heebo({
  variable: "--font-heebo",
  subsets: ["hebrew", "latin"],
});

const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sfira | ניהול מלאי, לוגיסטיקה ווריאציות",
  description:
    "Sfira — פלטפורמה לחברות לניהול מלאי בזמן אמת, וריאציות, ליקוט, ספירות ודוחות",
  icons: {
    icon: "/sfira-mark.svg",
    apple: "/sfira-logo.jpg",
  },
};

const themeInitScript = `
(function(){
  try {
    var t = localStorage.getItem('sfira-theme') || localStorage.getItem('malaim-theme');
    if (t !== 'light' && t !== 'dark') {
      t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    if (t === 'dark') document.documentElement.classList.add('dark');
    document.documentElement.dataset.theme = t;
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="he"
      dir="rtl"
      suppressHydrationWarning
      className={`${heebo.variable} ${rubik.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="app-shell flex min-h-full flex-col font-[family-name:var(--font-heebo)]">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
