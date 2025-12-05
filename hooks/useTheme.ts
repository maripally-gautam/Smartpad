import { useLayoutEffect } from 'react';
import { Theme } from '../types';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

/**
 * Hook to toggle the dark class on the <html> element whenever the theme changes.
 * Uses useLayoutEffect to apply theme synchronously before paint to prevent flicker.
 * Also updates the status bar synchronously for a unified transition.
 * @param theme - The current theme ('light' or 'dark')
 */
export function useTheme(theme: Theme): void {
  // Use useLayoutEffect to apply theme synchronously before browser paint
  // This prevents the flash/stagger when switching themes
  useLayoutEffect(() => {
    const html = document.documentElement;
    const isDark = theme === 'dark';
    const bgColor = isDark ? '#0F172A' : '#FFFFFF';

    // Update status bar immediately (before DOM changes visible)
    // Do this first so it changes alongside the content
    if (Capacitor.isNativePlatform()) {
      // Fire and forget - don't await to keep it synchronous feeling
      StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light }).catch(() => { });
      StatusBar.setBackgroundColor({ color: bgColor }).catch(() => { });
    }

    // Apply theme class synchronously
    if (isDark) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }

    // Force a synchronous layout/paint to ensure all elements update together
    // This triggers a reflow which ensures all CSS changes are applied at once
    void html.offsetHeight;

  }, [theme]);
}

export default useTheme;
