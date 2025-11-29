import type { Dispatch, SetStateAction } from 'react';

export type Screen = 'list' | 'editor' | 'settings';

export interface MediaAttachment {
  id: string;
  type: 'image' | 'audio';
  src: string;
}

export type ReminderRepeat = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

export interface Reminder {
  time: string; // ISO string for date and time
  repeat: ReminderRepeat;
  customDays?: number;
}

export interface Note {
  id: string;
  title: string;
  content: string; // HTML content
  media: MediaAttachment[];
  lastModified: string;
  isPinned: boolean;
  isFavourite: boolean;
  isCompleted: boolean;
  reminder?: Reminder;
}

export type Theme = 'light' | 'dark';

export interface Settings {
  theme: Theme;
  allowNotifications: boolean;
  reminderAlerts: boolean;
  soundForNotifications: boolean;
  autoSave: boolean;
  deleteCompletedTasks: boolean;
}

export interface AppContextType {
  notes: Note[];
  setNotes: Dispatch<SetStateAction<Note[]>>;
  settings: Settings;
  setSettings: Dispatch<SetStateAction<Settings>>;
}
