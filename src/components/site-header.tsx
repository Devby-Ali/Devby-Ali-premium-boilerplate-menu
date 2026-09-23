"use client";

import Link from "next/link";
import { Menu, X, ArrowUpLeft, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useUiStore } from "@/store/ui-store";
import { ThemeToggle } from "@/components/theme-toggle";

const links = [
  { href: "/", label: "خانه" },
  { href: "/list", label: "منو" },
  { href: "/reservation", label: "رزرو میز" },
  { href: "/about", label: "درباره ما" },
];

export function SiteHeader() {
  const mobileMenuOpen = useUiStore((state) => state.mobileMenuOpen);
  const toggleMobileMenu = useUiStore((state) => state.toggleMobileMenu);

  return (
    <header className="site-header sticky top-0 z-40 px-0 py-0">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="group flex items-center gap-3">
          <div className="brand-mark grid h-10 w-10 place-items-center rounded-md text-sm font-black text-primary-foreground transition-transform duration-200 group-hover:-translate-y-0.5">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-black tracking-[0.02em] text-foreground">
              کافه رستوران
            </p>
            <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              <span className="h-px w-4 bg-secondary" aria-hidden="true" />
              Digital menu
            </p>
          </div>
        </Link>

        <nav
          className="header-nav hidden items-center gap-1 md:flex"
          aria-label="ناوبری اصلی"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="header-nav-link px-3 py-2 text-sm font-medium text-muted-foreground transition hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link href="/reservation">
              رزرو میز <ArrowUpLeft className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={toggleMobileMenu}
            aria-label={
              mobileMenuOpen ? "بستن منوی ناوبری" : "باز کردن منوی ناوبری"
            }
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div
          id="mobile-navigation"
          className="mobile-navigation bg-surface/92 px-4 py-4 shadow-[0_20px_40px_-30px_rgb(var(--shadow-color)/0.9)] backdrop-blur-xl md:hidden"
        >
          <nav className="flex flex-col gap-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="header-nav-link px-3 py-2.5 text-sm font-medium text-muted-foreground transition hover:text-primary"
                onClick={toggleMobileMenu}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
