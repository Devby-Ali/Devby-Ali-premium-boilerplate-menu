import type { Metadata } from "next";
import { Vazirmatn } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const vazirmatn = Vazirmatn({
  subsets: ["arabic", "latin"],
  display: "swap",
  variable: "--font-vazirmatn",
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
      className={`${vazirmatn.variable} h-full`}
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
