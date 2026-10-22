import type { Metadata } from "next";
import { Heebo, Rubik, Geist_Mono } from "next/font/google";
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
  title: "מלאים | ניהול מלאי, לוגיסטיקה ווריאציות",
  description:
    "פלטפורמה לחברות לניהול מלאי בזמן אמת, וריאציות, ליקוט, ספירות ודוחות",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="he"
      dir="rtl"
      className={`${heebo.variable} ${rubik.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-[family-name:var(--font-heebo)]">
        {children}
      </body>
    </html>
  );
}
