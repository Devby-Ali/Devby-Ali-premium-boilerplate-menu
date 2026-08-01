import type { Metadata } from "next";
import { Vazirmatn } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const vazirmatn = Vazirmatn({
  subsets: ["arabic", "latin"],
  variable: "--font-vazirmatn",
  display: "swap",
});

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
    <html
      lang="fa"
      dir="rtl"
      suppressHydrationWarning
      className={`${vazirmatn.variable} h-full`}
    >
      <body className={`${vazirmatn.className} min-h-full bg-background text-foreground antialiased`}>
        <ThemeProvider>
          <div className="min-h-screen">{children}</div>
        </ThemeProvider>
      </body>
    </html>
  );
}
