import type { Metadata } from "next";

import { DashboardView } from "@/components/dashboard-view";

export const metadata: Metadata = {
  title: "Dashboard",
  description:
    "Balance, current-month spending, category breakdown, and forecast from a read-only PayPal sandbox account.",
};

export default function DashboardPage() {
  return (
    <div className="animate-fade-up">
      <DashboardView />
    </div>
  );
}
