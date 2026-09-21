"use client";

import Link from "next/link";
import { Menu, X, ArrowUpLeft } from "lucide-react";

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
    <header className="glass-panel site-header sticky top-0 z-40 border-0">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5 lg:px-8">
        <Link href="/" className="group flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-primary text-sm font-bold text-primary-foreground transition-transform group-hover:rotate-6">
            ک
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">کافه رستوران</p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Digital menu
            </p>
          </div>
        </Link>

        <nav
          className="hidden items-center gap-1 md:flex"
          aria-label="ناوبری اصلی"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
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
          className="border-t border-border bg-surface px-6 py-4 shadow-sm md:hidden"
        >
          <nav className="flex flex-col gap-3">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
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
