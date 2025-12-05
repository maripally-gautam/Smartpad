import { useEffect, useRef } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { StatusBar } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Theme } from '../types';

interface CapacitorSetupConfig {
  theme: Theme;
  canGoBack: () => boolean;
  triggerBack: () => void;
}

/**
 * Hook to handle Capacitor setup: splash screen, status bar, and Android back button.
 * Note: Theme-related status bar updates are handled by useTheme hook for synchronous updates.
 * @param config - Configuration object with theme and canGoBack callback
 */
export function useCapacitorSetup({ theme, canGoBack, triggerBack }: CapacitorSetupConfig): void {
  const canGoBackRef = useRef(canGoBack);
  const triggerBackRef = useRef(triggerBack);

  // Keep the refs up to date with the latest functions
  useEffect(() => {
    canGoBackRef.current = canGoBack;
    triggerBackRef.current = triggerBack;
  }, [canGoBack, triggerBack]);

  // Initialize Capacitor on mount (splash screen and back button listener)
  useEffect(() => {
    const initCapacitor = async () => {
      await SplashScreen.hide();

      // Initial status bar setup (non-overlay mode)
      try {
        await StatusBar.setOverlaysWebView({ overlay: false });
      } catch (e) {
        console.error('Status bar initial setup error', e);
      }

      // Register back button listener once
      CapacitorApp.addListener('backButton', ({ canGoBack: capacitorCanGoBack }) => {
        const appCanGoBack = canGoBackRef.current();
        if (!capacitorCanGoBack && !appCanGoBack) {
          CapacitorApp.exitApp();
        } else {
          // Use triggerBack to allow screens to intercept back navigation
          triggerBackRef.current();
        }
      });
    };

    initCapacitor();

    return () => {
      CapacitorApp.removeAllListeners();
    };
  }, []);
}

export default useCapacitorSetup;
