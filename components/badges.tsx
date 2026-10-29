import type {
  AuditStatus,
  DataSource,
  ToolName,
} from "@/lib/types";

const TOOL_STYLES: Record<ToolName, string> = {
  get_transactions: "border-sky-200 bg-sky-50 text-sky-800",
  get_balance: "border-amber-200 bg-amber-50 text-amber-800",
  summarize_spending: "border-emerald-200 bg-emerald-50 text-emerald-800",
};

const TOOL_LABELS: Record<ToolName, string> = {
  get_transactions: "read transactions",
  get_balance: "read balance",
  summarize_spending: "summarize spending",
};

export function ToolBadge({ tool }: { tool: ToolName }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] font-semibold ${
        TOOL_STYLES[tool] ?? "border-pine/15 bg-cream text-ink-soft"
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden="true" />
      {tool}
    </span>
  );
}

export function ToolLabel({ tool }: { tool: ToolName }) {
  return <>{TOOL_LABELS[tool] ?? tool}</>;
}

export function ModeBadge({ mode }: { mode: DataSource }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] ${
        mode === "demo"
          ? "bg-mint text-pine-deep"
          : "bg-gold-soft text-gold"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          mode === "demo" ? "bg-pine-light" : "bg-gold"
        }`}
        aria-hidden="true"
      />
      {mode === "demo" ? "Demo data" : "Live sandbox"}
    </span>
  );
}

export function StatusBadge({ status }: { status: AuditStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${
        status === "success"
          ? "bg-mint text-pine-deep"
          : "bg-coral-soft text-coral"
      }`}
    >
      {status}
    </span>
  );
}
