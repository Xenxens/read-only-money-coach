"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type { AuditEntry } from "@/lib/types";

const STORAGE_KEY = "romc.audit.v1";
const MAX_ENTRIES = 250;

type ToastTone = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

interface AppContextValue {
  demoMode: boolean;
  updateDemoMode: (enabled: boolean) => void;
  entries: AuditEntry[];
  appendAudit: (entries: AuditEntry[]) => void;
  clearAudit: () => void;
  toast: (message: string, tone?: ToastTone) => void;
  hydrated: boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

function isAuditEntry(value: unknown): value is AuditEntry {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<AuditEntry>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.timestamp === "string" &&
    typeof candidate.tool === "string" &&
    typeof candidate.status === "string" &&
    candidate.readOnly === true
  );
}

function readStoredEntries(): AuditEntry[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isAuditEntry).slice(0, MAX_ENTRIES);
  } catch {
    return [];
  }
}

export function AppProvider({
  children,
  initialDemoMode,
}: {
  children: ReactNode;
  initialDemoMode: boolean;
}) {
  const [demoMode, setDemoMode] = useState(initialDemoMode);
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastCounter = useRef(0);

  useEffect(() => {
    setDemoMode(initialDemoMode);
  }, [initialDemoMode]);

  useEffect(() => {
    setEntries(readStoredEntries());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch {
      // Storage can be unavailable in private modes; the in-memory log still works.
    }
  }, [entries, hydrated]);

  const updateDemoMode = useCallback((enabled: boolean) => {
    setDemoMode(enabled);
  }, []);

  const appendAudit = useCallback((incoming: AuditEntry[]) => {
    if (incoming.length === 0) {
      return;
    }

    setEntries((previous) => {
      const seen = new Set(previous.map((entry) => entry.id));
      const fresh = incoming
        .filter((entry) => isAuditEntry(entry) && !seen.has(entry.id))
        .slice()
        .reverse();

      if (fresh.length === 0) {
        return previous;
      }

      return [...fresh, ...previous].slice(0, MAX_ENTRIES);
    });
  }, []);

  const clearAudit = useCallback(() => {
    setEntries([]);
  }, []);

  const toast = useCallback((message: string, tone: ToastTone = "info") => {
    const id = toastCounter.current + 1;
    toastCounter.current = id;

    setToasts((previous) => [...previous, { id, message, tone }].slice(-3));

    window.setTimeout(() => {
      setToasts((previous) => previous.filter((item) => item.id !== id));
    }, 4_500);
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      demoMode,
      updateDemoMode,
      entries,
      appendAudit,
      clearAudit,
      toast,
      hydrated,
    }),
    [
      demoMode,
      updateDemoMode,
      entries,
      appendAudit,
      clearAudit,
      toast,
      hydrated,
    ],
  );

  return (
    <AppContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((item) => (
          <div
            key={item.id}
            role="status"
            className={`pointer-events-auto flex max-w-md items-start gap-3 rounded-2xl border px-4 py-3 text-sm shadow-lift ${
              item.tone === "success"
                ? "border-pine/20 bg-pine-deep text-cream"
                : item.tone === "error"
                  ? "border-coral/30 bg-coral-soft text-ink"
                  : "border-pine/15 bg-white text-ink"
            }`}
          >
            <span className="mt-0.5" aria-hidden="true">
              {item.tone === "success" ? "✓" : item.tone === "error" ? "!" : "i"}
            </span>
            <p className="flex-1 leading-5">{item.message}</p>
            <button
              type="button"
              onClick={() =>
                setToasts((previous) =>
                  previous.filter((toastItem) => toastItem.id !== item.id),
                )
              }
              className="rounded-full px-1 text-xs opacity-70 transition hover:opacity-100"
              aria-label="Dismiss notification"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error("useApp must be used inside AppProvider.");
  }

  return context;
}
