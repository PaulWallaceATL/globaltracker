"use client";

export type MobileTab = "map" | "layers" | "signals" | "news" | "more";

const TABS: { id: MobileTab; label: string }[] = [
  { id: "map", label: "Map" },
  { id: "layers", label: "Layers" },
  { id: "signals", label: "Signals" },
  { id: "news", label: "News" },
  { id: "more", label: "More" },
];

export function MobileBottomNav({
  active,
  onChange,
  signalCount,
  newsCount,
}: {
  active: MobileTab;
  onChange: (tab: MobileTab) => void;
  signalCount: number;
  newsCount: number;
}) {
  return (
    <nav className="pointer-events-auto absolute inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[var(--panel)]/98 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(0,0,0,0.45)]">
      <ul className="grid grid-cols-5">
        {TABS.map((tab) => {
          const on = active === tab.id;
          const badge =
            tab.id === "signals"
              ? signalCount
              : tab.id === "news"
                ? newsCount
                : 0;
          return (
            <li key={tab.id}>
              <button
                type="button"
                onClick={() => onChange(tab.id)}
                className={`flex w-full flex-col items-center gap-0.5 px-1 py-2.5 transition ${
                  on ? "text-[var(--accent)]" : "text-[var(--muted)]"
                }`}
              >
                <TabGlyph id={tab.id} active={on} />
                <span className="font-[family-name:var(--font-display)] text-[9px] tracking-wider uppercase">
                  {tab.label}
                  {badge > 0 ? (
                    <span className="ml-0.5 tabular-nums opacity-80">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function TabGlyph({ id, active }: { id: MobileTab; active: boolean }) {
  const stroke = active ? "var(--accent)" : "var(--muted)";
  if (id === "map") {
    return (
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
        <circle
          cx="9"
          cy="9"
          r="6.5"
          fill="none"
          stroke={stroke}
          strokeWidth="1.4"
        />
        <ellipse
          cx="9"
          cy="9"
          rx="3"
          ry="6.5"
          fill="none"
          stroke={stroke}
          strokeWidth="1.2"
        />
        <path d="M2.5 9h13" stroke={stroke} strokeWidth="1.2" />
      </svg>
    );
  }
  if (id === "layers") {
    return (
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
        <path
          d="M9 3.2 15 7 9 10.8 3 7z"
          fill="none"
          stroke={stroke}
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        <path
          d="M3 10.2 9 14l6-3.8"
          fill="none"
          stroke={stroke}
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (id === "signals") {
    return (
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
        <circle cx="9" cy="9" r="2.2" fill={stroke} />
        <circle
          cx="9"
          cy="9"
          r="5"
          fill="none"
          stroke={stroke}
          strokeWidth="1.2"
          opacity="0.7"
        />
        <circle
          cx="9"
          cy="9"
          r="7.2"
          fill="none"
          stroke={stroke}
          strokeWidth="1.1"
          opacity="0.35"
        />
      </svg>
    );
  }
  if (id === "news") {
    return (
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
        <rect
          x="3"
          y="3.5"
          width="12"
          height="11"
          rx="1"
          fill="none"
          stroke={stroke}
          strokeWidth="1.3"
        />
        <path
          d="M5.5 7h7M5.5 9.5h7M5.5 12h4"
          stroke={stroke}
          strokeWidth="1.2"
        />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <circle cx="5" cy="9" r="1.2" fill={stroke} />
      <circle cx="9" cy="9" r="1.2" fill={stroke} />
      <circle cx="13" cy="9" r="1.2" fill={stroke} />
    </svg>
  );
}
