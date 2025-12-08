
import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Theme } from '../types';
import Icon from '../components/Icon';
import ToggleSwitch from '../components/ToggleSwitch';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Keyboard } from '@capacitor/keyboard';
import { Capacitor } from '@capacitor/core';

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
    className={`bg-slate-50 dark:bg-secondary p-4 rounded-xl flex items-center shadow-sm transition-all ${onClick ? 'cursor-pointer active:scale-[0.99]' : ''}`}
    onClick={onClick}
  >
    <div className="bg-gradient-to-br from-accent to-blue-600 p-2.5 rounded-xl mr-3 shadow-sm">
      <Icon name={icon} className="w-5 h-5 text-white" />
    </div>
    <div className="flex-1">
      <p className="text-slate-800 dark:text-white font-medium">{title}</p>
      {subtitle && <p className="text-slate-500 dark:text-white/70 text-sm">{subtitle}</p>}
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
        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">{title}</h2>
        <p className="text-slate-600 dark:text-white/70 mb-6">{message}</p>
        <div className="flex justify-center gap-4">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-full bg-slate-200 dark:bg-border-color text-slate-800 dark:text-white font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-2 rounded-full bg-red-600 text-white font-semibold transition-colors"
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
  const [apiKeyInput, setApiKeyInput] = useState('');
  const apiKeyInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Handle keyboard for API key input - scroll to show input
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      const showListener = Keyboard.addListener('keyboardWillShow', () => {
        // Scroll to make input visible immediately
        requestAnimationFrame(() => {
          apiKeyInputRef.current?.scrollIntoView({ behavior: 'instant', block: 'center' });
        });
      });

      return () => {
        showListener.then(listener => listener.remove());
      };
    }
  }, []);

  // Theme swipe handling
  const themeTouchStartX = useRef<number>(0);
  const themeTouchEndX = useRef<number>(0);

  const handleThemeTouchStart = (e: React.TouchEvent) => {
    themeTouchStartX.current = e.touches[0].clientX;
  };

  const handleThemeTouchMove = (e: React.TouchEvent) => {
    themeTouchEndX.current = e.touches[0].clientX;
  };

  const handleThemeTouchEnd = () => {
    const diff = themeTouchStartX.current - themeTouchEndX.current;
    const minSwipeDistance = 50;

    if (Math.abs(diff) > minSwipeDistance) {
      if (diff > 0) {
        // Swiped left (toward Light button) - go to light
        updateSetting('theme', 'light');
      } else {
        // Swiped right (toward Dark button) - go to dark
        updateSetting('theme', 'dark');
      }
    }
  };

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

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setApiKeyInput(e.target.value);
  };

  const handleSaveApiKey = () => {
    if (apiKeyInput.trim().length >= 30) {
      updateSetting('geminiApiKey', apiKeyInput.trim());
      setApiKeyInput('');
    }
  };

  const handleClearApiKey = () => {
    updateSetting('geminiApiKey', '');
    setApiKeyInput('');
  };


  return (
    <div className="h-full flex flex-col bg-slate-100 dark:bg-primary text-slate-800 dark:text-white">
      <header className="p-4 flex items-center gap-3 border-b border-slate-200 dark:border-gray-700 flex-shrink-0 bg-white dark:bg-gray-900 z-10">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full transition-colors flex items-center gap-2 text-slate-800 dark:text-white">
          <Icon name="back" className="w-5 h-5" />
          <span className="text-xl font-bold bg-gradient-to-r from-accent to-blue-600 bg-clip-text text-transparent">Settings</span>
        </button>
      </header>

      <div className="flex-1 p-4 overflow-y-auto space-y-5">
        <section>
          <h2 className="text-slate-500 dark:text-white/60 font-semibold text-xs mb-2 px-1 uppercase tracking-wider">Appearance</h2>
          <div className="space-y-2">
            <SettingsRow icon="theme" title="Theme">
              <div
                className="bg-slate-200 dark:bg-gray-700 p-1 rounded-full flex text-sm"
                onTouchStart={handleThemeTouchStart}
                onTouchMove={handleThemeTouchMove}
                onTouchEnd={handleThemeTouchEnd}
              >
                {(['light', 'dark'] as Theme[]).map(theme => (
                  <button
                    key={theme}
                    onClick={() => updateSetting('theme', theme)}
                    className={`px-4 py-1.5 capitalize rounded-full font-medium transition-all ${settings.theme === theme ? 'bg-gradient-to-r from-accent to-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-white/70'}`}
                  >
                    {theme}
                  </button>
                ))}
              </div>
            </SettingsRow>
          </div>
        </section>

        <section>
          <h2 className="text-slate-500 dark:text-white/60 font-semibold text-xs mb-2 px-1 uppercase tracking-wider">Notifications</h2>
          <div className="space-y-2">
            <SettingsRow icon="notifications" title="Allow Notifications" subtitle="For note reminders">
              <ToggleSwitch enabled={settings.allowNotifications} onChange={handleNotificationsToggle} />
            </SettingsRow>
          </div>
        </section>

        <section>
          <h2 className="text-slate-500 dark:text-white/60 font-semibold text-xs mb-2 px-1 uppercase tracking-wider">General</h2>
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
          <h2 className="text-slate-500 dark:text-white/60 font-semibold text-xs mb-2 px-1 uppercase tracking-wider">AI Assistant</h2>
          <div className="space-y-2">
            <div className="bg-slate-50 dark:bg-secondary p-4 rounded-xl shadow-sm">
              <div className="flex items-center mb-3">
                <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-2.5 rounded-xl mr-3 shadow-sm">
                  <Icon name="key" className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-slate-800 dark:text-white font-medium">Gemini API Key</p>
                  <p className="text-slate-500 dark:text-white/70 text-sm">Required for AI chatbot</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {settings.geminiApiKey ? (
                  <>
                    <div className="flex-1 bg-slate-200 dark:bg-gray-700 rounded-xl px-4 py-3 font-mono text-sm">
                      <span className="text-green-600 dark:text-green-400">{'•'.repeat(Math.min(settings.geminiApiKey.length, 24))}</span>
                    </div>
                    <button
                      onClick={handleClearApiKey}
                      className="bg-red-500 text-white px-4 py-3 rounded-xl font-medium transition-all active:scale-95 flex items-center gap-2"
                    >
                      <Icon name="trash" className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <input
                      ref={apiKeyInputRef}
                      type="password"
                      value={apiKeyInput}
                      onChange={handleApiKeyChange}
                      onFocus={() => {
                        // Ensure input is visible immediately on focus
                        requestAnimationFrame(() => {
                          apiKeyInputRef.current?.scrollIntoView({ behavior: 'instant', block: 'center' });
                        });
                      }}
                      placeholder="Paste or type API key"
                      className="flex-1 bg-slate-200 dark:bg-gray-700 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-100"
                      style={{
                        WebkitTextSecurity: 'disc',
                        userSelect: 'none',
                      } as React.CSSProperties}
                      onCopy={(e) => e.preventDefault()}
                      onCut={(e) => e.preventDefault()}
                    />
                    <button
                      onClick={handleSaveApiKey}
                      disabled={apiKeyInput.trim().length < 30}
                      className={`px-4 py-3 rounded-xl font-medium transition-all active:scale-95 flex items-center gap-2 ${apiKeyInput.trim().length >= 30
                        ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/30'
                        : 'bg-slate-300 dark:bg-gray-600 text-slate-500 dark:text-gray-400'
                        }`}
                    >
                      <Icon name="check" className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>

              <p className="text-slate-400 dark:text-white/50 text-xs mt-2">
                Get your free API key from{' '}
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent underline"
                  onClick={(e) => {
                    e.preventDefault();
                    window.open('https://aistudio.google.com/apikey', '_system');
                  }}
                >
                  aistudio.google.com/apikey
                </a>
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-slate-500 dark:text-white/60 font-semibold text-xs mb-2 px-1 uppercase tracking-wider">Privacy</h2>
          <div className="space-y-2">
            <SettingsRow
              icon="lock"
              title="Secrets"
              subtitle="Password-protected private notes"
              onClick={onOpenSecrets}
            >
              <Icon name="chevronRight" className="w-5 h-5 text-slate-400 dark:text-white/50" />
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
