"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ModeSwitch } from "@/components/mode-switch";
import { useApp } from "@/components/app-provider";

const NAV_ITEMS = [
  { href: "/", label: "Overview" },
  { href: "/chat", label: "Coach" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/audit", label: "Audit log" },
] as const;

function LogoMark() {
  return (
    <span className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-pine text-cream shadow-sm">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="h-5 w-5"
      >
        <path
          d="M7 10V7.5a5 5 0 0 1 10 0V10"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <rect
          x="4.5"
          y="10"
          width="15"
          height="10.5"
          rx="2.5"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M12 14.2v2.6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-cream bg-mint-strong" />
    </span>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const { demoMode } = useApp();

  return (
    <header className="sticky top-0 z-40 border-b border-pine/10 bg-cream/90 backdrop-blur-xl">
      <div className="page-shell flex flex-wrap items-center gap-x-6 gap-y-3 py-3">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-2xl"
          aria-label="Read-Only Money Coach home"
        >
          <LogoMark />
          <span className="min-w-0">
            <span className="block font-display text-[17px] font-semibold leading-tight text-ink">
              Read-Only Money Coach
            </span>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-pine-light">
              PayPal sandbox · look, don&apos;t touch
            </span>
          </span>
        </Link>

        <nav
          aria-label="Primary"
          className="order-3 -mx-1 flex w-full items-center gap-1 overflow-x-auto pb-0.5 xl:order-none xl:mx-0 xl:w-auto xl:flex-1 xl:justify-center"
        >
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-pine/10 text-pine-deep"
                    : "text-ink-soft hover:bg-white/70 hover:text-pine-deep"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2 xl:ml-0">
          <span
            className={`hidden items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] md:inline-flex ${
              demoMode ? "text-pine-light" : "text-gold"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                demoMode ? "bg-pine-light" : "bg-gold"
              }`}
              aria-hidden="true"
            />
            {demoMode ? "Seeded data" : "Sandbox API"}
          </span>
          <ModeSwitch />
        </div>
      </div>
    </header>
  );
}
