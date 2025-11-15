// FIX: Import Dispatch and SetStateAction to resolve React namespace errors.
import type { Dispatch, SetStateAction } from 'react';

export type Screen = 'list' | 'editor' | 'settings';

export interface MediaAttachment {
  id: string;
  type: 'image' | 'audio';
  src: string;
}

export interface Reminder {
  time: string; // ISO string for date and time
  repeat: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  customDays?: number;
}

export interface Note {
  id:string;
  title: string;
  content: string;
  media: MediaAttachment[];
  lastModified: string;
  reminder?: Reminder;
  isPinned?: boolean;
  isFavourite?: boolean;
  isCompleted?: boolean;
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
  // FIX: Use imported Dispatch and SetStateAction types.
  setNotes: Dispatch<SetStateAction<Note[]>>;
  settings: Settings;
  // FIX: Use imported Dispatch and SetStateAction types.
  setSettings: Dispatch<SetStateAction<Settings>>;
}
