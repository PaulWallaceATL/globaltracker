"use client";

import type { ReactNode } from "react";

export function MobileSheet({
  open,
  title,
  subtitle,
  onClose,
  children,
  tall = false,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  tall?: boolean;
}) {
  if (!open) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[3.75rem] z-[35] flex max-h-[min(72vh,34rem)] flex-col pb-[env(safe-area-inset-bottom)]">
      <button
        type="button"
        aria-label="Dismiss sheet"
        onClick={onClose}
        className="pointer-events-auto absolute inset-x-0 -top-[40vh] h-[40vh] bg-transparent"
      />
      <div
        className={`pointer-events-auto mx-2 flex min-h-0 flex-col overflow-hidden border border-[var(--border)] bg-[var(--panel)]/98 shadow-[0_-12px_40px_rgba(0,0,0,0.55)] ${
          tall ? "max-h-[min(72vh,34rem)]" : "max-h-[min(58vh,28rem)]"
        }`}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--border)] px-3 py-2.5">
          <div className="min-w-0">
            <p className="font-[family-name:var(--font-display)] text-[10px] tracking-[0.16em] text-[var(--accent)] uppercase">
              {title}
            </p>
            {subtitle ? (
              <p className="mt-0.5 truncate text-[11px] text-[var(--muted)]">
                {subtitle}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-[10px] tracking-wide text-[var(--muted)] uppercase hover:text-[var(--fg)]"
          >
            Close
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
