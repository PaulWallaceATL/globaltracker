"use client";

import { useEffect, useState } from "react";

/** True below Tailwind `lg` (1024px) — desktop chrome becomes the mobile shell. */
const QUERY = "(max-width: 1023px)";

/** `null` until mounted so we don't flash the wrong chrome. */
export function useIsMobile(): boolean | null {
  const [mobile, setMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    const apply = () => setMobile(mql.matches);
    apply();
    mql.addEventListener("change", apply);
    return () => mql.removeEventListener("change", apply);
  }, []);

  return mobile;
}
