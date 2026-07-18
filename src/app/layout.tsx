import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Premium Menu Boilerplate",
    template: "%s | Premium Menu Boilerplate",
  },
  description:
    "A premium, future-ready restaurant digital menu and admin foundation.",
  openGraph: {
    title: "Premium Menu Boilerplate",
    description:
      "A premium restaurant menu experience with future-ready order and admin infrastructure.",
    type: "website",
    locale: "fa_IR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Premium Menu Boilerplate",
    description:
      "A premium restaurant menu experience with future-ready order and admin infrastructure.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" suppressHydrationWarning className="h-full">
      <body
        className="min-h-full bg-stone-50 text-stone-900 antialiased transition-colors dark:bg-stone-950 dark:text-stone-100"
        cz-shortcut-listen="true"
      >
        <ThemeProvider>
          <div className="min-h-screen">
            <SiteHeader />
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
