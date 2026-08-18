import type { Metadata } from "next";
import localFont from "next/font/local";
import { ThemeProvider } from "@/components/theme-provider";
import { SiteHeader } from "@/components/site-header";
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
  title: {
    default: "کافه رستوران | منوی دیجیتال",
    template: "%s | کافه رستوران",
  },
  description: "منوی دیجیتال کافه رستوران — مشاهده آیتم‌ها، دسته‌بندی‌ها و جزئیات محصولات",
  openGraph: {
    title: "کافه رستوران | منوی دیجیتال",
    description: "منوی دیجیتال کافه رستوران — مشاهده آیتم‌ها، دسته‌بندی‌ها و جزئیات محصولات",
    type: "website",
    locale: "fa_IR",
  },
  twitter: {
    card: "summary_large_image",
    title: "کافه رستوران",
    description: "منوی دیجیتال کافه رستوران — مشاهده آیتم‌ها، دسته‌بندی‌ها و جزئیات محصولات",
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
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} کافه رستوران — تمامی حقوق محفوظ است</p>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
