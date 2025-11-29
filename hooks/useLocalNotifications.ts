import { useEffect, useRef, useCallback } from 'react';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Note, Reminder, Screen } from '../types';

interface UseLocalNotificationsConfig {
  notes: Note[];
  allowNotifications: boolean;
  updateNote: (note: Note) => void;
  navigate: (screen: Screen, noteId?: string | null) => void;
}

/**
 * Helper function to compute the next reminder time for a repeating reminder.
 * Returns the updated reminder or undefined if the reminder should be removed.
 */
function computeNextReminderTime(reminder: Reminder): Reminder | undefined {
  const now = new Date();
  let nextReminderTime = new Date(reminder.time);

  // If invalid date, remove the reminder
  if (isNaN(nextReminderTime.getTime())) {
    return undefined;
  }

  // If it's not a repeating reminder, return undefined to indicate removal
  if (!reminder.repeat || reminder.repeat === 'none') {
    return undefined;
  }

  // Advance the date until it's in the future
  while (nextReminderTime <= now) {
    switch (reminder.repeat) {
      case 'daily':
        nextReminderTime.setDate(nextReminderTime.getDate() + 1);
        break;
      case 'weekly':
        nextReminderTime.setDate(nextReminderTime.getDate() + 7);
        break;
      case 'monthly':
        nextReminderTime.setMonth(nextReminderTime.getMonth() + 1);
        break;
      case 'yearly':
        nextReminderTime.setFullYear(nextReminderTime.getFullYear() + 1);
        break;
      case 'custom':
        nextReminderTime.setDate(nextReminderTime.getDate() + (reminder.customDays || 1));
        break;
      default:
        return undefined;
    }
  }

  return { ...reminder, time: nextReminderTime.toISOString() };
}

/**
 * Hook to abstract all LocalNotifications logic.
 * Handles scheduling notifications, updating repeating reminders, and responding to notification actions.
 */
export function useLocalNotifications({
  notes,
  allowNotifications,
  updateNote,
  navigate,
}: UseLocalNotificationsConfig): void {
  // Keep refs to avoid stale closures in listeners
  const notesRef = useRef(notes);
  const updateNoteRef = useRef(updateNote);
  const navigateRef = useRef(navigate);

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  useEffect(() => {
    updateNoteRef.current = updateNote;
  }, [updateNote]);

  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);

  // Helper function to update note with next reminder
  const updateNoteWithNextReminder = useCallback((note: Note, reminder: Reminder) => {
    const nextReminder = computeNextReminderTime(reminder);
    if (nextReminder) {
      updateNoteRef.current({ ...note, reminder: nextReminder });
    } else {
      // Remove the reminder from the note
      const { reminder: _, ...noteWithoutReminder } = note;
      updateNoteRef.current({ ...noteWithoutReminder, isPinned: note.isPinned, isFavourite: note.isFavourite, isCompleted: note.isCompleted });
    }
  }, []);

  // Main effect to schedule notifications
  useEffect(() => {
    if (!allowNotifications) return;

    const scheduleNotifications = async () => {
      let permission = await LocalNotifications.checkPermissions();
      if (permission.display === 'denied') {
        return;
      }
      if (permission.display !== 'granted') {
        permission = await LocalNotifications.requestPermissions();
      }

      if (permission.display !== 'granted') return;

      // Clear all previous notifications
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel({ notifications: pending.notifications });
      }

      const notificationsToSchedule = [];
      const now = new Date();

      for (const note of notes) {
        if (note.reminder) {
          const reminderTime = new Date(note.reminder.time);

          if (reminderTime > now) {
            // Schedule notification for future reminder
            const textContent = note.content.replace(/<[^>]*>?/gm, ' ').trim();
            const snippet = textContent.substring(0, 100);
            notificationsToSchedule.push({
              id: Math.floor(Math.random() * 10000),
              title: note.title,
              body: snippet,
              schedule: { at: reminderTime },
              extra: { noteId: note.id },
            });
          } else if (note.reminder.repeat && note.reminder.repeat !== 'none') {
            // If the time is in the past and it's repeating, schedule the next one
            updateNoteWithNextReminder(note, note.reminder);
          }
        }
      }

      if (notificationsToSchedule.length > 0) {
        await LocalNotifications.schedule({ notifications: notificationsToSchedule });
      }
    };

    scheduleNotifications();
  }, [notes, allowNotifications, updateNoteWithNextReminder]);

  // Set up notification action listener
  useEffect(() => {
    if (!allowNotifications) return;

    const listener = LocalNotifications.addListener(
      'localNotificationActionPerformed',
      (notificationAction) => {
        const noteId = notificationAction.notification.extra?.noteId;
        if (noteId) {
          const note = notesRef.current.find((n) => n.id === noteId);
          if (note) {
            // Reschedule if it's a repeating reminder
            if (note.reminder?.repeat && note.reminder.repeat !== 'none') {
              const nextReminder = computeNextReminderTime(note.reminder);
              if (nextReminder) {
                updateNoteRef.current({ ...note, reminder: nextReminder });
              } else {
                const { reminder: _, ...noteWithoutReminder } = note;
                updateNoteRef.current({ ...noteWithoutReminder, isPinned: note.isPinned, isFavourite: note.isFavourite, isCompleted: note.isCompleted });
              }
            } else {
              // Remove the reminder from the note
              const { reminder: _, ...noteWithoutReminder } = note;
              updateNoteRef.current({ ...noteWithoutReminder, isPinned: note.isPinned, isFavourite: note.isFavourite, isCompleted: note.isCompleted });
            }
            navigateRef.current('editor', noteId);
          }
        }
      }
    );

    return () => {
      listener.then((l) => l.remove());
      LocalNotifications.removeAllListeners();
    };
  }, [allowNotifications]);
}

export default useLocalNotifications;
