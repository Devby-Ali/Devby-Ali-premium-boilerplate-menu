import type { Metadata } from "next";
import localFont from "next/font/local";
import { ThemeProvider } from "@/components/theme-provider";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

/**
 * Vazirmatn variable font (weights 100–900) — self-hosted via next/font/local.
 *
 * next/font/google fetches from Google at build time and fails on offline /
 * restricted networks, breaking `next build`. Local woff2 files remove that
 * build-time network dependency entirely (zero external requests, no CLS).
 *
 * The files are Google's official subsets of the variable font:
 * - vazirmatn-arabic.woff2 → Arabic/Persian glyphs (U+0600–06FF, …)
 * - vazirmatn-latin.woff2  → Basic Latin glyphs
 * Each subset only contains its own glyphs, so a per-glyph fallback chain
 * (arabic → latin) renders mixed fa/en text correctly.
 */
const vazirmatnArabic = localFont({
  src: "./fonts/vazirmatn-arabic.woff2",
  weight: "100 900",
  display: "swap",
  variable: "--font-vazirmatn-arabic",
});

const vazirmatnLatin = localFont({
  src: "./fonts/vazirmatn-latin.woff2",
  weight: "100 900",
  display: "swap",
  variable: "--font-vazirmatn-latin",
});

export const metadata: Metadata = {
  title: {
    default: "Premium Menu – منوی دیجیتال",
    template: "%s | Premium Menu",
  },
  description:
    "منوی دیجیتال کافه و رستوران، مدرن و توسعه‌پذیر با پنل ادمین حرفه‌ای",
  openGraph: {
    title: "Premium Menu – منوی دیجیتال",
    description: "منوی دیجیتال کافه رستوران با زیرساخت سفارش و مدیریت پیشرفته",
    type: "website",
    locale: "fa_IR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Premium Menu",
    description: "منوی دیجیتال کافه رستوران با زیرساخت سفارش و مدیریت پیشرفته",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fa"
      dir="rtl"
      suppressHydrationWarning
      className={`${vazirmatnArabic.variable} ${vazirmatnLatin.variable} h-full`}
    >
      <body className="min-h-screen antialiased flex flex-col">
        <ThemeProvider>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
            {/* footer content – empty for MVP */}
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
