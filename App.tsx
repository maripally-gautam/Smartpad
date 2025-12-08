import React, { useCallback, useMemo } from 'react';
import { AppProvider } from './context/AppContext';
import useLocalStorage from './hooks/useLocalStorage';
import useNavigationHistory from './hooks/useNavigationHistory';
import useTheme from './hooks/useTheme';
import useCapacitorSetup from './hooks/useCapacitorSetup';
import useLocalNotifications, { generateNotificationId, SmartpadNotifications } from './hooks/useLocalNotifications';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Screen, Note, Settings, SecretNote, SecretsConfig } from './types';
import NotesListScreen from './screens/NotesListScreen';
import NoteEditorScreen from './screens/NoteEditorScreen';
import SettingsScreen from './screens/SettingsScreen';
import SecretsScreen from './screens/SecretsScreen';
import SecretEditorScreen from './screens/SecretEditorScreen';
import TopNavBar from './components/TopNavBar';
import SafeAreaContainer from './components/SafeAreaContainer';
import { INITIAL_SETTINGS } from './constants';

export default function App() {
  const [notes, setNotes] = useLocalStorage<Note[]>('notes', []);
  const [settings, setSettings] = useLocalStorage<Settings>('settings', INITIAL_SETTINGS);
  const [secretNotes, setSecretNotes] = useLocalStorage<SecretNote[]>('secretNotes', []);
  const [secretsConfig, setSecretsConfig] = useLocalStorage<SecretsConfig | null>('secretsConfig', null);

  const { currentScreen, selectedNoteId, navigate, goBack, canGoBack, registerBackHandler, triggerBack, setPendingNavigation, executePendingNavigation } = useNavigationHistory();

  // Apply theme to document
  useTheme(settings.theme);

  // Setup Capacitor (splash screen, status bar, back button)
  useCapacitorSetup({ theme: settings.theme, canGoBack, triggerBack });

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
    // Cancel any scheduled notifications for this note
    const cancelNotification = async () => {
      try {
        const notificationId = generateNotificationId(noteId);
        if (Capacitor.getPlatform() === 'android') {
          await SmartpadNotifications.cancelNotification({ id: notificationId });
        } else {
          await LocalNotifications.cancel({ notifications: [{ id: notificationId }] });
        }
      } catch (err) {
        console.error('Failed to cancel notification:', err);
      }
    };
    cancelNotification();

    // Remove the note from state
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
            ? { ...n, isCompleted: !n.isCompleted }
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
          ? { ...n, isFavourite: !n.isFavourite }
          : n
      )
    );
  }, [setNotes]);

  // Secret note handlers
  const handleSelectSecretNote = (noteId: string) => {
    navigate('secret-editor', noteId);
  };

  const handleNewSecretNote = () => {
    const newSecretNote: SecretNote = {
      id: new Date().toISOString(),
      title: 'Untitled Secret',
      content: '',
      media: [],
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
    };
    setSecretNotes((prevNotes) => [newSecretNote, ...prevNotes]);
    navigate('secret-editor', newSecretNote.id);
  };

  const handleSaveSecretNote = useCallback((noteToSave: SecretNote) => {
    setSecretNotes((prevNotes) => {
      const noteExists = prevNotes.some((note) => note.id === noteToSave.id);
      if (noteExists) {
        return prevNotes.map((note) => (note.id === noteToSave.id ? noteToSave : note));
      } else {
        return [noteToSave, ...prevNotes];
      }
    });
    goBack();
  }, [setSecretNotes, goBack]);

  const handleUpdateSecretNote = useCallback((noteToUpdate: SecretNote) => {
    setSecretNotes((prevNotes) => {
      const noteExists = prevNotes.some((note) => note.id === noteToUpdate.id);
      if (noteExists) {
        return prevNotes.map((note) => (note.id === noteToUpdate.id ? noteToUpdate : note));
      } else {
        return [noteToUpdate, ...prevNotes];
      }
    });
  }, [setSecretNotes]);

  const handleDeleteSecretNote = useCallback((noteId: string) => {
    setSecretNotes((prevNotes) => prevNotes.filter((note) => note.id !== noteId));
  }, [setSecretNotes]);

  const handleDeleteSecretNoteFromEditor = useCallback((noteId: string) => {
    handleDeleteSecretNote(noteId);
    goBack();
  }, [handleDeleteSecretNote, goBack]);

  const handleOpenSecrets = () => {
    navigate('secrets');
  };

  const selectedNote = useMemo(
    () => notes.find((note) => note.id === selectedNoteId) || null,
    [notes, selectedNoteId]
  );

  const selectedSecretNote = useMemo(
    () => secretNotes.find((note) => note.id === selectedNoteId) || null,
    [secretNotes, selectedNoteId]
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
            registerBackHandler={registerBackHandler}
            executePendingNavigation={executePendingNavigation}
          />
        );
      case 'settings':
        return <SettingsScreen onBack={handleBack} onOpenSecrets={handleOpenSecrets} />;
      case 'secrets':
        return (
          <SecretsScreen
            onBack={() => navigate('settings')}
            onSelectNote={handleSelectSecretNote}
            onNewNote={handleNewSecretNote}
            onDeleteNote={handleDeleteSecretNote}
          />
        );
      case 'secret-editor':
        return (
          <SecretEditorScreen
            note={selectedSecretNote}
            onSave={handleSaveSecretNote}
            onUpdateNote={handleUpdateSecretNote}
            onBack={handleBack}
            onDelete={handleDeleteSecretNoteFromEditor}
            registerBackHandler={registerBackHandler}
          />
        );
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
    <AppProvider value={{ notes, setNotes, settings, setSettings, secretNotes, setSecretNotes, secretsConfig, setSecretsConfig }}>
      <div className="w-full h-full font-sans bg-white dark:bg-primary overflow-hidden">
        <div className="w-full h-full shadow-2xl">
          <SafeAreaContainer className="bg-white dark:bg-primary">
            <TopNavBar
              currentScreen={currentScreen}
              onNavigate={handleNavigate}
              onNewNote={handleNewNote}
              onTriggerBack={triggerBack}
              onSetPendingNavigation={setPendingNavigation}
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
