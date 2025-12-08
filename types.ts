import type { Dispatch, SetStateAction } from 'react';

export type Screen = 'list' | 'editor' | 'settings' | 'secrets' | 'secret-editor';

export interface MediaAttachment {
  id: string;
  type: 'image' | 'audio';
  src: string;
}

export type ReminderRepeat = 'none' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

export interface Reminder {
  time: string; // ISO string for date and time
  repeat: ReminderRepeat;
  customDays?: number;
  customMinutes?: number; // For custom repeat intervals (minimum 5 minutes)
  markAsCompleted?: boolean; // Mark note as completed when reminder fires
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

// Secret note - similar to Note but without reminder functionality
export interface SecretNote {
  id: string;
  title: string;
  content: string; // HTML content
  media: MediaAttachment[];
  createdAt: string;
  lastModified: string;
}

// Secrets password and backup
export interface SecretsConfig {
  passwordHash: string; // SHA-256 hash of password
  securityQuestion: string;
  securityAnswerHash: string; // SHA-256 hash of answer
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
  secretNotes: SecretNote[];
  setSecretNotes: Dispatch<SetStateAction<SecretNote[]>>;
  secretsConfig: SecretsConfig | null;
  setSecretsConfig: Dispatch<SetStateAction<SecretsConfig | null>>;
  secretsUnlocked: boolean;
  setSecretsUnlocked: Dispatch<SetStateAction<boolean>>;
}
