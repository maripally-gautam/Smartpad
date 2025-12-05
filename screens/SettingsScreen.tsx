
import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Theme } from '../types';
import Icon from '../components/Icon';
import ToggleSwitch from '../components/ToggleSwitch';
import { LocalNotifications } from '@capacitor/local-notifications';

interface SettingsScreenProps {
  onBack: () => void;
  onOpenSecrets: () => void;
}

const SettingsRow: React.FC<{
  icon: string;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  onClick?: () => void;
}> = ({ icon, title, subtitle, children, onClick }) => (
  <div
    className={`bg-slate-100 dark:bg-secondary p-3 rounded-lg flex items-center ${onClick ? 'cursor-pointer' : ''}`}
    onClick={onClick}
  >
    <div className="bg-accent bg-opacity-20 p-2 rounded-lg mr-3">
      <Icon name={icon} className="w-5 h-5 text-accent" />
    </div>
    <div className="flex-1">
      <p className="text-slate-800 dark:text-text-primary">{title}</p>
      {subtitle && <p className="text-slate-500 dark:text-text-secondary text-sm">{subtitle}</p>}
    </div>
    {children}
  </div>
);

const ConfirmationDialog: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
}> = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm' }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white dark:bg-secondary p-6 rounded-lg w-full max-w-sm mx-4 text-center shadow-lg">
        <h2 className="text-xl font-bold text-slate-900 dark:text-text-primary mb-2">{title}</h2>
        <p className="text-slate-600 dark:text-text-secondary mb-6">{message}</p>
        <div className="flex justify-center gap-4">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-full bg-slate-200 dark:bg-border-color text-slate-800 dark:text-text-primary font-semibold hover:bg-slate-300 dark:hover:bg-opacity-80 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-2 rounded-full bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

const SettingsScreen: React.FC<SettingsScreenProps> = ({ onBack, onOpenSecrets }) => {
  const { settings, setSettings, setNotes } = useAppContext();
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  const updateSetting = <K extends keyof typeof settings,>(key: K, value: (typeof settings)[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleConfirmDeleteCompleted = () => {
    setNotes(prevNotes => prevNotes.filter(n => !n.isCompleted));
    updateSetting('deleteCompletedTasks', true);
    setIsConfirmModalOpen(false);
  };

  const handleDeleteCompletedToggle = (value: boolean) => {
    if (value) {
      setIsConfirmModalOpen(true);
    } else {
      updateSetting('deleteCompletedTasks', false);
    }
  };

  const handleNotificationsToggle = async (value: boolean) => {
    if (value) {
      try {
        const permissionStatus = await LocalNotifications.requestPermissions();
        const isGranted = permissionStatus.display === 'granted';
        updateSetting('allowNotifications', isGranted);
        if (!isGranted) {
          alert("Notifications were not enabled. You won't receive reminders.");
        }
      } catch (e) {
        console.error("Error requesting notification permissions", e);
        updateSetting('allowNotifications', false);
      }
    } else {
      updateSetting('allowNotifications', false);
    }
  };


  return (
    <div className="h-full flex flex-col bg-white dark:bg-primary text-slate-800 dark:text-text-primary">
      <header className="p-3 flex items-center gap-3 border-b border-slate-200 dark:border-border-color flex-shrink-0 bg-white dark:bg-primary z-10">
        <button onClick={onBack} className="p-2 -ml-2"><Icon name="back" /></button>
        <h1 className="text-xl font-bold">Settings</h1>
      </header>

      <div className="flex-1 p-3 overflow-y-auto space-y-4">
        <section>
          <h2 className="text-slate-500 dark:text-text-secondary font-semibold text-xs mb-1.5 px-1">APPEARANCE</h2>
          <div className="space-y-2">
            <SettingsRow icon="theme" title="Theme">
              <div className="bg-slate-200 dark:bg-primary p-1 rounded-full flex text-sm">
                {(['light', 'dark'] as Theme[]).map(theme => (
                  <button
                    key={theme}
                    onClick={() => updateSetting('theme', theme)}
                    className={`px-3 py-1 capitalize rounded-full ${settings.theme === theme ? 'bg-accent text-white' : 'text-slate-600 dark:text-text-secondary'}`}
                  >
                    {theme}
                  </button>
                ))}
              </div>
            </SettingsRow>
          </div>
        </section>

        <section>
          <h2 className="text-slate-500 dark:text-text-secondary font-semibold text-xs mb-1.5 px-1">NOTIFICATIONS</h2>
          <div className="space-y-2">
            <SettingsRow icon="notifications" title="Allow Notifications" subtitle="For note reminders">
              <ToggleSwitch enabled={settings.allowNotifications} onChange={handleNotificationsToggle} />
            </SettingsRow>
          </div>
        </section>

        <section>
          <h2 className="text-slate-500 dark:text-text-secondary font-semibold text-xs mb-1.5 px-1">GENERAL</h2>
          <div className="space-y-2">
            <SettingsRow icon="save" title="Auto-Save" subtitle={settings.autoSave ? "Enabled, every 5s" : "Disabled"}>
              <ToggleSwitch enabled={settings.autoSave} onChange={(val) => updateSetting('autoSave', val)} />
            </SettingsRow>
            <SettingsRow icon="trash" title="Delete Completed Tasks" subtitle="Instantly delete notes when marked complete">
              <ToggleSwitch enabled={settings.deleteCompletedTasks} onChange={handleDeleteCompletedToggle} />
            </SettingsRow>
          </div>
        </section>

        <section>
          <h2 className="text-slate-500 dark:text-text-secondary font-semibold text-xs mb-1.5 px-1">PRIVACY</h2>
          <div className="space-y-2">
            <SettingsRow
              icon="lock"
              title="Secrets"
              subtitle="Password-protected private notes"
              onClick={onOpenSecrets}
            >
              <Icon name="chevronRight" className="w-5 h-5 text-slate-400" />
            </SettingsRow>
          </div>
        </section>
      </div>

      <ConfirmationDialog
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleConfirmDeleteCompleted}
        title="Enable Setting?"
        message="This will permanently delete all of your currently completed notes. This action cannot be undone."
        confirmText="Enable & Delete"
      />
    </div>
  );
};

export default SettingsScreen;
