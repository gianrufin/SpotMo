import { createContext, useContext, useState, type ReactNode } from 'react';

/**
 * Sheets rendered from inside the map's `isolate` tab-content container (e.g.
 * VenueLineupSheet, FilterSheet) can't out-z-index the bottom nav no matter
 * what z-index they set — `isolate` traps their stacking order inside that
 * container, and the nav is a later, sibling DOM node outside it. Those
 * sheets portal into this root instead, which lives above the nav in the
 * frame's own stacking context.
 */
const OverlayRootContext = createContext<HTMLDivElement | null>(null);
export function useOverlayRoot() {
  return useContext(OverlayRootContext);
}

/**
 * Centers the app in a phone-sized frame on larger screens so the mobile-first
 * UI reads as a real app, while going full-bleed on actual phones.
 */
export function PhoneFrame({ children }: { children: ReactNode }) {
  const [overlayRoot, setOverlayRoot] = useState<HTMLDivElement | null>(null);
  return (
    <div className="flex min-h-full w-full items-center justify-center bg-[rgb(var(--c-frame))] sm:p-6">
      <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-bg sm:h-[860px] sm:max-h-[92vh] sm:w-[400px] sm:rounded-[2.75rem] sm:shadow-[0_40px_120px_-30px_rgba(17,24,39,0.5)] sm:ring-1 sm:ring-black/5">
        <OverlayRootContext.Provider value={overlayRoot}>{children}</OverlayRootContext.Provider>
        <div ref={setOverlayRoot} className="pointer-events-none absolute inset-0 z-40" />
      </div>
    </div>
  );
}
