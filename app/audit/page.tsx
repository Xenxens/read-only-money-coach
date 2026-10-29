import type { Metadata } from "next";

import { AuditView } from "@/components/audit-view";

export const metadata: Metadata = {
  title: "Audit log",
  description:
    "Every read-only tool call, stored locally with parameters, results, status, and duration.",
};

export default function AuditPage() {
  return (
    <div className="animate-fade-up">
      <header className="mb-6 max-w-3xl">
        <p className="eyebrow">Accountability</p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          Every read, on the record.
        </h1>
        <p className="mt-3 text-sm leading-7 text-ink-soft sm:text-base">
          The server returns an audit entry with every read-only tool call. The
          app stores those entries in this browser so you can inspect exactly
          what was accessed, when, and with which parameters.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
          <span className="chip-mint">readOnly: true on every entry</span>
          <span className="chip">No server database</span>
          <span className="chip">Exportable JSON</span>
        </div>
      </header>

      <AuditView />
    </div>
  );
}
