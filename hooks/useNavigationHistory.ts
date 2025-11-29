import { useState, useEffect, useCallback } from 'react';
import { Screen } from '../types';

interface NavigationState {
  screen: Screen;
  noteId: string | null;
}

interface UseNavigationHistoryReturn {
  currentScreen: Screen;
  selectedNoteId: string | null;
  navigate: (screen: Screen, noteId?: string | null) => void;
  goBack: () => void;
  canGoBack: () => boolean;
}

/**
 * Hook to centralize navigation and history handling.
 * Manages currentScreen, selectedNoteId, and browser history state.
 */
export function useNavigationHistory(): UseNavigationHistoryReturn {
  const [currentScreen, setCurrentScreen] = useState<Screen>('list');
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  // Set up history management
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state as NavigationState | null;
      const screen = state?.screen || 'list';
      const noteId = state?.noteId || null;
      setCurrentScreen(screen);
      setSelectedNoteId(noteId);
    };

    window.addEventListener('popstate', handlePopState);
    window.history.replaceState({ screen: 'list', noteId: null }, '');

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const navigate = useCallback((screen: Screen, noteId: string | null = null) => {
    // Do nothing if the target state is identical to current
    if (currentScreen === screen && selectedNoteId === noteId) return;
    
    window.history.pushState({ screen, noteId }, '');
    setCurrentScreen(screen);
    setSelectedNoteId(noteId);
  }, [currentScreen, selectedNoteId]);

  const goBack = useCallback(() => {
    window.history.back();
  }, []);

  const canGoBack = useCallback(() => {
    return currentScreen !== 'list';
  }, [currentScreen]);

  return {
    currentScreen,
    selectedNoteId,
    navigate,
    goBack,
    canGoBack,
  };
}

export default useNavigationHistory;
