import { useEffect, useRef, useCallback } from 'react';
import { LocalNotifications, ActionPerformed } from '@capacitor/local-notifications';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Note, Reminder, Screen } from '../types';

// Channel ID must match the one created in MainActivity.java
const NOTIFICATION_CHANNEL_ID = 'smartpad_reminders';

// Register the custom SmartpadNotifications plugin for Android
interface SmartpadNotificationsPlugin {
  scheduleNotification(options: {
    id: number;
    title: string;
    body: string;
    noteId: string;
    triggerTime: number;
    showMarkComplete: boolean;
    repeatType: string;
    customDays: number;
    customMinutes: number;
  }): Promise<{ id: number }>;
  cancelNotification(options: { id: number }): Promise<void>;
  cancelAllNotifications(): Promise<void>;
}

const SmartpadNotifications = registerPlugin<SmartpadNotificationsPlugin>('SmartpadNotifications');

// Export for use in other components
export { SmartpadNotifications };

interface UseLocalNotificationsConfig {
  notes: Note[];
  allowNotifications: boolean;
  updateNote: (note: Note) => void;
  navigate: (screen: Screen, noteId?: string | null) => void;
}

/**
 * Generate a unique notification ID based on note ID hash.
 * Exported for use when canceling notifications on note deletion.
 */
export function generateNotificationId(noteId: string): number {
  let hash = 0;
  for (let i = 0; i < noteId.length; i++) {
    const char = noteId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/**
 * Helper function to remove the reminder from a note.
 */
function removeReminderFromNote(note: Note): Note {
  const { reminder: _, ...noteWithoutReminder } = note;
  return noteWithoutReminder as Note;
}

/**
 * Helper function to compute the next reminder time for a repeating reminder.
 */
function computeNextReminderTime(reminder: Reminder): Reminder | undefined {
  const now = new Date();
  let nextReminderTime = new Date(reminder.time);

  if (isNaN(nextReminderTime.getTime())) {
    return undefined;
  }

  if (!reminder.repeat || reminder.repeat === 'none') {
    return undefined;
  }

  while (nextReminderTime <= now) {
    switch (reminder.repeat) {
      case 'hourly':
        nextReminderTime.setHours(nextReminderTime.getHours() + 1);
        break;
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
        const customDays = reminder.customDays || 0;
        const customMinutes = reminder.customMinutes || 0;
        const totalMinutes = (customDays * 24 * 60) + customMinutes;
        const finalMinutes = totalMinutes < 5 ? 5 : totalMinutes;
        nextReminderTime.setMinutes(nextReminderTime.getMinutes() + finalMinutes);
        break;
      default:
        return undefined;
    }
  }

  return { ...reminder, time: nextReminderTime.toISOString() };
}

/**
 * Hook to handle LocalNotifications.
 * Simple notifications - tap to open the note.
 */
export function useLocalNotifications({
  notes,
  allowNotifications,
  updateNote,
  navigate,
}: UseLocalNotificationsConfig): void {
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

  const updateNoteWithNextReminder = useCallback((note: Note, reminder: Reminder) => {
    const nextReminder = computeNextReminderTime(reminder);
    if (nextReminder) {
      updateNoteRef.current({ ...note, reminder: nextReminder });
    } else {
      updateNoteRef.current(removeReminderFromNote(note));
    }
  }, []);

  // Schedule notifications
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

      const isAndroid = Capacitor.getPlatform() === 'android';
      const notificationsToSchedule = [];
      const now = new Date();

      for (const note of notes) {
        if (note.reminder) {
          const reminderTime = new Date(note.reminder.time);

          if (reminderTime > now) {
            // Clean content for notification body
            const textContent = note.content
              .replace(/&nbsp;/g, ' ')
              .replace(/<[^>]*>?/gm, ' ')
              .replace(/\s+/g, ' ')
              .trim();
            const snippet = textContent.substring(0, 100) || 'Reminder for your note';

            if (isAndroid) {
              // Use the custom SmartpadNotifications plugin on Android
              // This properly handles repeating notifications even when app is closed
              try {
                await SmartpadNotifications.scheduleNotification({
                  id: generateNotificationId(note.id),
                  title: note.title || 'Reminder',
                  body: snippet,
                  noteId: note.id,
                  triggerTime: reminderTime.getTime(),
                  showMarkComplete: true,
                  repeatType: note.reminder.repeat || 'none',
                  customDays: note.reminder.customDays || 0,
                  customMinutes: note.reminder.customMinutes || 0,
                });
              } catch (err) {
                console.error('Failed to schedule notification via SmartpadNotifications:', err);
              }
            } else {
              // Use standard LocalNotifications for iOS/web
              const notificationConfig: any = {
                id: generateNotificationId(note.id),
                title: note.title,
                body: snippet,
                schedule: { at: reminderTime, allowWhileIdle: true },
                extra: { noteId: note.id },
                sound: 'default',
                autoCancel: true,
              };
              notificationsToSchedule.push(notificationConfig);
            }
          } else if (note.reminder.repeat && note.reminder.repeat !== 'none') {
            // Past time with repeat - schedule next occurrence
            updateNoteWithNextReminder(note, note.reminder);
          }
        }
      }

      // Schedule non-Android notifications using LocalNotifications
      if (notificationsToSchedule.length > 0) {
        await LocalNotifications.schedule({ notifications: notificationsToSchedule });
      }
    };

    scheduleNotifications();
  }, [notes, allowNotifications, updateNoteWithNextReminder]);

  // Handle notification tap - open the note
  useEffect(() => {
    if (!allowNotifications) return;

    const handleNotificationAction = (notificationAction: ActionPerformed) => {
      const noteId = notificationAction.notification.extra?.noteId;
      if (!noteId) return;

      const note = notesRef.current.find((n) => n.id === noteId);
      if (!note) return;

      // Handle repeating reminders
      if (note.reminder?.repeat && note.reminder.repeat !== 'none') {
        const nextReminder = computeNextReminderTime(note.reminder);
        if (nextReminder) {
          updateNoteRef.current({ ...note, reminder: nextReminder });
        } else {
          updateNoteRef.current(removeReminderFromNote(note));
        }
      } else {
        // Non-repeating - remove reminder
        updateNoteRef.current(removeReminderFromNote(note));
      }

      // Navigate to the note
      navigateRef.current('editor', noteId);
    };

    const listener = LocalNotifications.addListener(
      'localNotificationActionPerformed',
      handleNotificationAction
    );

    return () => {
      listener.then((l) => l.remove());
      LocalNotifications.removeAllListeners();
    };
  }, [allowNotifications]);
}

export default useLocalNotifications;
