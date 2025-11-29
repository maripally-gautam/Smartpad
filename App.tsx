import React, { useCallback, useMemo } from 'react';
import { AppProvider } from './context/AppContext';
import useLocalStorage from './hooks/useLocalStorage';
import useNavigationHistory from './hooks/useNavigationHistory';
import useTheme from './hooks/useTheme';
import useCapacitorSetup from './hooks/useCapacitorSetup';
import useLocalNotifications from './hooks/useLocalNotifications';
import { Screen, Note, Settings } from './types';
import NotesListScreen from './screens/NotesListScreen';
import NoteEditorScreen from './screens/NoteEditorScreen';
import SettingsScreen from './screens/SettingsScreen';
import TopNavBar from './components/TopNavBar';
import SafeAreaContainer from './components/SafeAreaContainer';
import { INITIAL_SETTINGS } from './constants';

export default function App() {
  const [notes, setNotes] = useLocalStorage<Note[]>('notes', []);
  const [settings, setSettings] = useLocalStorage<Settings>('settings', INITIAL_SETTINGS);

  const { currentScreen, selectedNoteId, navigate, goBack, canGoBack } = useNavigationHistory();

  // Apply theme to document
  useTheme(settings.theme);

  // Setup Capacitor (splash screen, status bar, back button)
  useCapacitorSetup({ theme: settings.theme, canGoBack });

  // Handler to update a note (used by local notifications and editor)
  const handleUpdateNote = useCallback((noteToUpdate: Note) => {
    setNotes((prevNotes) => {
      const noteExists = prevNotes.some((note) => note.id === noteToUpdate.id);
      if (noteExists) {
        return prevNotes.map((note) => (note.id === noteToUpdate.id ? noteToUpdate : note));
      } else {
        return [noteToUpdate, ...prevNotes];
      }
    });
  }, [setNotes]);

  // Setup local notifications
  useLocalNotifications({
    notes,
    allowNotifications: settings.allowNotifications,
    updateNote: handleUpdateNote,
    navigate,
  });

  const handleNavigate = (screen: Screen) => {
    // Prevent navigating to editor via top nav
    if (screen === 'editor') return;
    navigate(screen);
  };

  const handleSelectNote = (noteId: string) => {
    navigate('editor', noteId);
  };

  const handleNewNote = () => {
    if (settings.autoSave) {
      const newNote: Note = {
        id: new Date().toISOString(),
        title: 'Untitled Note',
        content: '',
        media: [],
        lastModified: new Date().toISOString(),
        isPinned: false,
        isFavourite: false,
        isCompleted: false,
      };
      setNotes((prevNotes) => [newNote, ...prevNotes]);
      navigate('editor', newNote.id);
    } else {
      navigate('editor', null);
    }
  };

  const handleBack = () => {
    goBack();
  };

  const handleSaveNote = useCallback((noteToSave: Note) => {
    setNotes((prevNotes) => {
      const noteExists = prevNotes.some((note) => note.id === noteToSave.id);
      if (noteExists) {
        return prevNotes.map((note) => (note.id === noteToSave.id ? noteToSave : note));
      } else {
        return [noteToSave, ...prevNotes];
      }
    });
    goBack();
  }, [setNotes, goBack]);

  const deleteNoteById = useCallback((noteId: string) => {
    setNotes((prevNotes) => prevNotes.filter((note) => note.id !== noteId));
  }, [setNotes]);

  const handleDeleteNoteFromEditor = useCallback((noteId: string) => {
    deleteNoteById(noteId);
    goBack();
  }, [deleteNoteById, goBack]);

  const handleToggleCompleted = useCallback((noteId: string) => {
    const noteToToggle = notes.find((n) => n.id === noteId);
    if (!noteToToggle) return;

    if (settings.deleteCompletedTasks && !noteToToggle.isCompleted) {
      deleteNoteById(noteId);
    } else {
      setNotes((prevNotes) =>
        prevNotes.map((n) =>
          n.id === noteId
            ? { ...n, isCompleted: !n.isCompleted, lastModified: new Date().toISOString() }
            : n
        )
      );
    }
  }, [setNotes, notes, settings.deleteCompletedTasks, deleteNoteById]);

  const handleTogglePin = useCallback((noteId: string) => {
    setNotes((prevNotes) =>
      prevNotes.map((n) =>
        n.id === noteId
          ? { ...n, isPinned: !n.isPinned, lastModified: new Date().toISOString() }
          : n
      )
    );
  }, [setNotes]);

  const handleToggleFavourite = useCallback((noteId: string) => {
    setNotes((prevNotes) =>
      prevNotes.map((n) =>
        n.id === noteId
          ? { ...n, isFavourite: !n.isFavourite, lastModified: new Date().toISOString() }
          : n
      )
    );
  }, [setNotes]);

  const selectedNote = useMemo(
    () => notes.find((note) => note.id === selectedNoteId) || null,
    [notes, selectedNoteId]
  );

  const renderScreen = () => {
    switch (currentScreen) {
      case 'editor':
        return (
          <NoteEditorScreen
            note={selectedNote}
            onSave={handleSaveNote}
            onUpdateNote={handleUpdateNote}
            onBack={handleBack}
            onDelete={handleDeleteNoteFromEditor}
          />
        );
      case 'settings':
        return <SettingsScreen onBack={handleBack} />;
      case 'list':
      default:
        return (
          <NotesListScreen
            onSelectNote={handleSelectNote}
            onDeleteNote={deleteNoteById}
            onTogglePin={handleTogglePin}
            onToggleFavourite={handleToggleFavourite}
            onToggleCompleted={handleToggleCompleted}
          />
        );
    }
  };

  return (
    <AppProvider value={{ notes, setNotes, settings, setSettings }}>
      <div className="w-full h-full font-sans bg-white dark:bg-primary overflow-hidden">
        <div className="w-full h-full shadow-2xl">
          <SafeAreaContainer className="bg-white dark:bg-primary">
            <TopNavBar
              currentScreen={currentScreen}
              onNavigate={handleNavigate}
              onNewNote={handleNewNote}
            />
            <main className="flex-1 overflow-hidden relative flex flex-col">
              {renderScreen()}
            </main>
          </SafeAreaContainer>
        </div>
      </div>
    </AppProvider>
  );
}
