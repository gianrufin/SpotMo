import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Captures the browser's install prompt so we can surface a custom "Install"
 * button. `canInstall` is true only when the browser offers installation and
 * the app isn't already running as an installed PWA.
 */
export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      // iOS Safari
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    setInstalled(Boolean(standalone));

    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    }
    function onInstalled() {
      setInstalled(true);
      setDeferred(null);
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  async function promptInstall() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  }

  return { canInstall: !!deferred && !installed, installed, promptInstall };
}
