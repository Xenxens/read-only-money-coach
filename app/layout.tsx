import type { Metadata, Viewport } from "next";

import { AppProvider } from "@/components/app-provider";
import { SafetyPanel } from "@/components/safety-panel";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { isDemoMode } from "@/lib/session";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Read-Only Money Coach — look, don't touch",
    template: "%s · Read-Only Money Coach",
  },
  description:
    "An AI budgeting coach that reads PayPal sandbox transactions and balances, with exactly three read-only tools and no ability to move money.",
  applicationName: "Read-Only Money Coach",
  authors: [{ name: "Read-Only Money Coach" }],
  keywords: [
    "PayPal",
    "sandbox",
    "personal finance",
    "read-only",
    "AI coach",
    "budgeting",
  ],
  openGraph: {
    title: "Read-Only Money Coach",
    description:
      "A money coach that can look, not touch. Three read-only tools, three reporting endpoints, zero money-moving actions.",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f7f2e7",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const demoMode = isDemoMode();

  return (
    <html lang="en">
      <body className="min-h-screen font-sans">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-pine focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-cream"
        >
          Skip to content
        </a>
        <AppProvider initialDemoMode={demoMode}>
          <SiteHeader />
          <SafetyPanel />
          <main id="main-content" className="page-shell pt-8 sm:pt-10">
            {children}
          </main>
          <SiteFooter />
        </AppProvider>
      </body>
    </html>
  );
}
