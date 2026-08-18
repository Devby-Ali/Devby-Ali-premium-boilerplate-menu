"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useUiStore } from "@/store/ui-store";
import { ThemeToggle } from "@/components/theme-toggle";

const links = [
  { href: "/", label: "خانه" },
  { href: "/list", label: "منو" },
  { href: "/about", label: "درباره ما" },
];

export function SiteHeader() {
  const mobileMenuOpen = useUiStore((state) => state.mobileMenuOpen);
  const toggleMobileMenu = useUiStore((state) => state.toggleMobileMenu);

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-white/80 backdrop-blur-xl dark:border-stone-800 dark:bg-stone-950/70">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-700 text-sm font-semibold text-white">
            ک
          </div>
          <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
            کافه رستوران
          </p>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-stone-700 transition hover:text-emerald-700 dark:text-stone-300 dark:hover:text-emerald-400"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={toggleMobileMenu}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="border-t border-stone-200 bg-white px-6 py-4 shadow-sm dark:border-stone-800 dark:bg-stone-950 md:hidden">
          <nav className="flex flex-col gap-3">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full px-3 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
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
