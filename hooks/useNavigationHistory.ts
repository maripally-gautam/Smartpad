import { useState, useEffect, useCallback, useRef } from 'react';
import { Screen } from '../types';

interface NavigationState {
  screen: Screen;
  noteId: string | null;
}

// Type for the back handler callback
// Returns true if navigation should be blocked (e.g., showing a modal)
// Returns false if navigation should proceed
type BackHandler = () => boolean;

interface UseNavigationHistoryReturn {
  currentScreen: Screen;
  selectedNoteId: string | null;
  navigate: (screen: Screen, noteId?: string | null) => void;
  goBack: () => void;
  canGoBack: () => boolean;
  registerBackHandler: (handler: BackHandler | null) => void;
  triggerBack: () => void;
  pendingNavigation: { screen: Screen; noteId: string | null } | null;
  setPendingNavigation: (nav: { screen: Screen; noteId: string | null } | null) => void;
  executePendingNavigation: () => void;
}

/**
 * Hook to centralize navigation and history handling.
 * Manages currentScreen, selectedNoteId, and browser history state.
 */
export function useNavigationHistory(): UseNavigationHistoryReturn {
  const [currentScreen, setCurrentScreen] = useState<Screen>('list');
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [pendingNavigation, setPendingNavigation] = useState<{ screen: Screen; noteId: string | null } | null>(null);
  const backHandlerRef = useRef<BackHandler | null>(null);
  const isBlockingRef = useRef(false);

  // Set up history management
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // If a back handler is registered and it blocks navigation
      if (backHandlerRef.current && !isBlockingRef.current) {
        const shouldBlock = backHandlerRef.current();
        if (shouldBlock) {
          // Push the state back to prevent navigation
          isBlockingRef.current = true;
          window.history.pushState({ screen: currentScreen, noteId: selectedNoteId }, '');
          isBlockingRef.current = false;
          return;
        }
      }

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
  }, [currentScreen, selectedNoteId]);

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

  // Register a handler that will be called when back is triggered
  const registerBackHandler = useCallback((handler: BackHandler | null) => {
    backHandlerRef.current = handler;
  }, []);

  // Trigger back navigation (called from device back button or nav clicks)
  // When there's a pending navigation and back is not blocked, go to pending target
  const triggerBack = useCallback(() => {
    if (backHandlerRef.current) {
      const shouldBlock = backHandlerRef.current();
      if (shouldBlock) {
        return; // Handler will show a modal or take action
      }
    }
    // If there's a pending navigation target (set by nav clicks), go there
    if (pendingNavigation) {
      navigate(pendingNavigation.screen, pendingNavigation.noteId);
      setPendingNavigation(null);
    } else {
      window.history.back();
    }
  }, [pendingNavigation, navigate]);

  // Execute pending navigation after unsaved changes are handled
  const executePendingNavigation = useCallback(() => {
    if (pendingNavigation) {
      navigate(pendingNavigation.screen, pendingNavigation.noteId);
      setPendingNavigation(null);
    } else {
      window.history.back();
    }
  }, [pendingNavigation, navigate]);

  return {
    currentScreen,
    selectedNoteId,
    navigate,
    goBack,
    canGoBack,
    registerBackHandler,
    triggerBack,
    pendingNavigation,
    setPendingNavigation,
    executePendingNavigation,
  };
}

export default useNavigationHistory;
