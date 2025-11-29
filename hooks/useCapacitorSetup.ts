import { useEffect, useRef } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Theme } from '../types';

interface CapacitorSetupConfig {
  theme: Theme;
  canGoBack: () => boolean;
  triggerBack: () => void;
}

/**
 * Hook to handle Capacitor setup: splash screen, status bar, and Android back button.
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

  // Update status bar styling when theme changes
  useEffect(() => {
    const updateStatusBar = async () => {
      try {
        await StatusBar.setOverlaysWebView({ overlay: false });
        await StatusBar.setStyle({ style: theme === 'dark' ? Style.Dark : Style.Light });
        await StatusBar.setBackgroundColor({ color: theme === 'dark' ? '#0F172A' : '#FFFFFF' });
      } catch (e) {
        console.error('Status bar error', e);
      }
    };

    updateStatusBar();
  }, [theme]);
}

export default useCapacitorSetup;
