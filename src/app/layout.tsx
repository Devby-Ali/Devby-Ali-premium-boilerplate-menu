import type { Metadata } from "next";
import localFont from "next/font/local";
import { ThemeProvider } from "@/components/theme-provider";
import { SiteHeader } from "@/components/site-header";
import { env } from "@/lib/env";
import "./globals.css";

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
  metadataBase: new URL(env.APP_URL),
  title: {
    default: "کافه رستوران | منوی دیجیتال",
    template: "%s | کافه رستوران",
  },
  description:
    "منوی دیجیتال کافه رستوران — مشاهده آیتم‌ها، دسته‌بندی‌ها و جزئیات محصولات",
  openGraph: {
    title: "کافه رستوران | منوی دیجیتال",
    description:
      "منوی دیجیتال کافه رستوران — مشاهده آیتم‌ها، دسته‌بندی‌ها و جزئیات محصولات",
    type: "website",
    locale: "fa_IR",
  },
  twitter: {
    card: "summary_large_image",
    title: "کافه رستوران",
    description:
      "منوی دیجیتال کافه رستوران — مشاهده آیتم‌ها، دسته‌بندی‌ها و جزئیات محصولات",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="fa"
      dir="rtl"
      suppressHydrationWarning
      className={`${vazirmatnArabic.variable} ${vazirmatnLatin.variable} h-full`}
    >
      <body className="min-h-screen antialiased flex flex-col">
        <ThemeProvider>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:right-4 focus:top-4 focus:z-50 focus:rounded-[0.9rem] focus:bg-background focus:px-4 focus:py-2 focus:text-foreground focus:shadow-lg"
          >
            رفتن به محتوای اصلی
          </a>
          <SiteHeader />
          <main id="main-content" className="flex-1">
            {children}
          </main>
          <footer className="px-4 pb-8 pt-12 text-sm text-muted-foreground sm:px-6 lg:px-8">
            <div className="footer-shell mx-auto max-w-7xl px-5 py-6 sm:px-7">
              <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-primary">
                    Open table / good taste
                  </p>
                  <p className="mt-2 font-black text-foreground">
                    کافه رستوران
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    یک تجربه‌ی ساده، دقیق و به‌یادماندنی.
                  </p>
                </div>
                <p className="text-xs tracking-[0.14em] text-muted-foreground">
                  © {new Date().getFullYear()} تمامی حقوق محفوظ است
                </p>
              </div>
            </div>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
