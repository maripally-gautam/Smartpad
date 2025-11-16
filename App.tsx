
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { AppProvider } from './context/AppContext';
import useLocalStorage from './hooks/useLocalStorage';
import { Screen, Note, Settings, Reminder } from './types';
import NotesListScreen from './screens/NotesListScreen';
import NoteEditorScreen from './screens/NoteEditorScreen';
import SettingsScreen from './screens/SettingsScreen';
import TopNavBar from './components/TopNavBar';
import SafeAreaContainer from './components/SafeAreaContainer';
import { INITIAL_SETTINGS } from './constants';
import { App as CapacitorApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { LocalNotifications } from '@capacitor/local-notifications';

export default function App() {
  const [notes, setNotes] = useLocalStorage<Note[]>('notes', []);
  const [settings, setSettings] = useLocalStorage<Settings>('settings', INITIAL_SETTINGS);

  const [currentScreen, setCurrentScreen] = useState<Screen>('list');
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  // Capacitor specific setup
  useEffect(() => {
    const initCapacitor = async () => {
      // Hide the splash screen
      await SplashScreen.hide();
      // Set status bar to not overlay content
      await StatusBar.setOverlaysWebView({ overlay: false });
      // Set status bar style
      await StatusBar.setStyle({ style: settings.theme === 'dark' ? Style.Dark : Style.Light });

      CapacitorApp.addListener('backButton', ({ canGoBack }) => {
        if (!canGoBack || currentScreen === 'list') {
          CapacitorApp.exitApp();
        } else {
          window.history.back();
        }
      });
    };
    initCapacitor();
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    if (settings.theme === 'dark') {
      html.classList.add('dark');
      StatusBar.setOverlaysWebView({ overlay: false });
      StatusBar.setStyle({ style: Style.Dark });
    } else {
      html.classList.remove('dark');
      StatusBar.setOverlaysWebView({ overlay: false });
      StatusBar.setStyle({ style: Style.Light });
    }
  }, [settings.theme]);

  // History management for in-app navigation
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const screen = event.state?.screen || 'list';
      const noteId = event.state?.noteId || null;
      setCurrentScreen(screen);
      setSelectedNoteId(noteId);
    };

    window.addEventListener('popstate', handlePopState);
    window.history.replaceState({ screen: 'list', noteId: null }, '');

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const updateNoteWithNextReminder = (note: Note, reminder: Reminder) => {
    const now = new Date();
    let nextReminderTime = new Date(reminder.time);

    do {
      switch (reminder.repeat) {
        case 'daily': nextReminderTime.setDate(nextReminderTime.getDate() + 1); break;
        case 'weekly': nextReminderTime.setDate(nextReminderTime.getDate() + 7); break;
        case 'monthly': nextReminderTime.setMonth(nextReminderTime.getMonth() + 1); break;
        case 'yearly': nextReminderTime.setFullYear(nextReminderTime.getFullYear() + 1); break;
        case 'custom': nextReminderTime.setDate(nextReminderTime.getDate() + (reminder.customDays || 1)); break;
        default:
          const { reminder: oldReminder, ...noteWithoutReminder } = note;
          handleUpdateNote(noteWithoutReminder as Note);
          return;
      }
    } while (nextReminderTime <= now);

    const updatedReminder = { ...reminder, time: nextReminderTime.toISOString() };
    handleUpdateNote({ ...note, reminder: updatedReminder });
  };

  useEffect(() => {
    const scheduleNotifications = async () => {
      if (!settings.allowNotifications) return;

      let permission = await LocalNotifications.checkPermissions();
      if (permission.display === 'denied') {
        // User has explicitly denied permissions. We can't do anything.
        return;
      }
      if (permission.display !== 'granted') {
        permission = await LocalNotifications.requestPermissions();
      }

      if (permission.display === 'granted') {
        // Clear all previous notifications
        const pending = await LocalNotifications.getPending();
        if (pending.notifications.length > 0) {
          await LocalNotifications.cancel({ notifications: pending.notifications });
        }

        const notificationsToSchedule = [];

        for (const note of notes) {
          if (note.reminder) {
            const reminderTime = new Date(note.reminder.time);
            const now = new Date();

            if (reminderTime > now) {
              const textContent = note.content.replace(/<[^>]*>?/gm, ' ').trim();
              const snippet = textContent.substring(0, 100);
              notificationsToSchedule.push({
                id: Math.floor(Math.random() * 10000), // Simple unique ID
                title: note.title,
                body: snippet,
                schedule: { at: reminderTime },
                extra: { noteId: note.id }
              });
            } else if (note.reminder.repeat && note.reminder.repeat !== 'none') {
              // If the time is in the past and it's repeating, schedule the next one.
              updateNoteWithNextReminder(note, note.reminder);
            }
          }
        }

        if (notificationsToSchedule.length > 0) {
          await LocalNotifications.schedule({ notifications: notificationsToSchedule });
        }
      }
    };

    scheduleNotifications();

    LocalNotifications.addListener('localNotificationActionPerformed', (notificationAction) => {
      const noteId = notificationAction.notification.extra?.noteId;
      if (noteId) {
        const note = notes.find(n => n.id === noteId);
        if (note) {
          // Reschedule if it's a repeating reminder
          if (note.reminder?.repeat && note.reminder.repeat !== 'none') {
            updateNoteWithNextReminder(note, note.reminder);
          } else {
            const { reminder, ...noteWithoutReminder } = note;
            handleUpdateNote(noteWithoutReminder as Note);
          }
          navigate('editor', noteId);
        }
      }
    });

    return () => {
      LocalNotifications.removeAllListeners();
    };
  }, [notes, settings.allowNotifications]);

  const navigate = (screen: Screen, noteId: string | null = null) => {
    if (currentScreen === screen && selectedNoteId === noteId) return;
    window.history.pushState({ screen, noteId }, '');
    setCurrentScreen(screen);
    setSelectedNoteId(noteId);
  };

  const handleNavigate = (screen: Screen) => {
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
      setNotes(prevNotes => [newNote, ...prevNotes]);
      navigate('editor', newNote.id);
    } else {
      navigate('editor', null);
    }
  };

  const handleBack = () => {
    window.history.back();
  };


  const handleSaveNote = useCallback((noteToSave: Note) => {
    setNotes(prevNotes => {
      const noteExists = prevNotes.some(note => note.id === noteToSave.id);
      if (noteExists) {
        return prevNotes.map(note => note.id === noteToSave.id ? noteToSave : note);
      } else {
        return [noteToSave, ...prevNotes];
      }
    });
    handleBack();
  }, [setNotes]);

  const handleUpdateNote = useCallback((noteToUpdate: Note) => {
    setNotes(prevNotes => {
      const noteExists = prevNotes.some(note => note.id === noteToUpdate.id);
      if (noteExists) {
        return prevNotes.map(note => note.id === noteToUpdate.id ? noteToUpdate : note);
      } else {
        return [noteToUpdate, ...prevNotes];
      }
    });
  }, [setNotes]);


  const deleteNoteById = useCallback((noteId: string) => {
    setNotes(prevNotes => prevNotes.filter(note => note.id !== noteId));
  }, [setNotes]);

  const handleDeleteNoteFromEditor = useCallback((noteId: string) => {
    deleteNoteById(noteId);
    handleBack();
  }, [deleteNoteById]);

  const handleToggleCompleted = useCallback((noteId: string) => {
    const noteToToggle = notes.find(n => n.id === noteId);
    if (!noteToToggle) return;

    if (settings.deleteCompletedTasks && !noteToToggle.isCompleted) {
      deleteNoteById(noteId);
    } else {
      setNotes(prevNotes =>
        prevNotes.map(n => (n.id === noteId ? { ...n, isCompleted: !n.isCompleted, lastModified: new Date().toISOString() } : n))
      );
    }
  }, [setNotes, notes, settings.deleteCompletedTasks, deleteNoteById]);

  const handleTogglePin = useCallback((noteId: string) => {
    setNotes(prevNotes =>
      prevNotes.map(n => (n.id === noteId ? { ...n, isPinned: !n.isPinned, lastModified: new Date().toISOString() } : n))
    );
  }, [setNotes]);

  const handleToggleFavourite = useCallback((noteId: string) => {
    setNotes(prevNotes =>
      prevNotes.map(n => (n.id === noteId ? { ...n, isFavourite: !n.isFavourite, lastModified: new Date().toISOString() } : n))
    );
  }, [setNotes]);

  const selectedNote = useMemo(() => notes.find(note => note.id === selectedNoteId) || null, [notes, selectedNoteId]);

  const renderScreen = () => {
    switch (currentScreen) {
      case 'editor':
        return <NoteEditorScreen note={selectedNote} onSave={handleSaveNote} onUpdateNote={handleUpdateNote} onBack={handleBack} onDelete={handleDeleteNoteFromEditor} />;
      case 'settings':
        return <SettingsScreen onBack={handleBack} />;
      case 'list':
      default:
        return <NotesListScreen onSelectNote={handleSelectNote} onDeleteNote={deleteNoteById} onTogglePin={handleTogglePin} onToggleFavourite={handleToggleFavourite} onToggleCompleted={handleToggleCompleted} />;
    }
  };

  return (
    <AppProvider value={{ notes, setNotes, settings, setSettings }}>
      <div className="w-full h-screen font-sans bg-white dark:bg-primary">
        <div className="max-w-md mx-auto h-full shadow-2xl">
          <SafeAreaContainer className="bg-white dark:bg-primary">
            <TopNavBar
              currentScreen={currentScreen}
              onNavigate={handleNavigate}
              onNewNote={handleNewNote}
            />
            <main className="flex-1 overflow-y-auto">
              {renderScreen()}
            </main>
          </SafeAreaContainer>
        </div>
      </div>
    </AppProvider>
  );
}
