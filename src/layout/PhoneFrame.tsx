import type { ReactNode } from 'react';

/**
 * Centers the app in a phone-sized frame on larger screens so the mobile-first
 * UI reads as a real app, while going full-bleed on actual phones.
 */
export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full w-full items-center justify-center bg-[rgb(var(--c-frame))] sm:p-6">
      <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-bg sm:h-[860px] sm:max-h-[92vh] sm:w-[400px] sm:rounded-[2.75rem] sm:shadow-[0_40px_120px_-30px_rgba(17,24,39,0.5)] sm:ring-1 sm:ring-black/5">
        {children}
      </div>
    </div>
  );
}
