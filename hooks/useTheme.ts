import { useEffect } from 'react';
import { Theme } from '../types';

/**
 * Hook to toggle the dark class on the <html> element whenever the theme changes.
 * @param theme - The current theme ('light' or 'dark')
 */
export function useTheme(theme: Theme): void {
  useEffect(() => {
    const html = document.documentElement;
    if (theme === 'dark') {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }, [theme]);
}

export default useTheme;
