import React from 'react';
import { Screen } from '../types';
import Icon from './Icon';

interface TopNavBarProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
  onNewNote: () => void;
  onTriggerBack?: () => void; // Optional: used to trigger back handler when in editor
}

const TopNavItem: React.FC<{
  label: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ label, isActive, onClick }) => {
  const activeClass = isActive
    ? 'text-accent border-accent font-semibold'
    : 'text-slate-500 dark:text-gray-400 border-transparent hover:text-accent dark:hover:text-accent';
  return (
    <button onClick={onClick} className={`px-3 py-2 text-sm font-medium border-b-2 transition-all duration-150 ${activeClass}`}>
      {label}
    </button>
  );
};

const TopNavBar: React.FC<TopNavBarProps> = ({ currentScreen, onNavigate, onNewNote, onTriggerBack }) => {

  // Handle navigation with potential unsaved changes check
  const handleNavClick = (screen: Screen) => {
    // If we're in editor and trying to navigate away, trigger the back handler first
    if (currentScreen === 'editor' && screen !== 'editor' && onTriggerBack) {
      onTriggerBack();
      return;
    }
    onNavigate(screen);
  };

  // Handle new note with potential unsaved changes check
  const handleNewNoteClick = () => {
    // If we're in editor and trying to create a new note, trigger the back handler first
    if (currentScreen === 'editor' && onTriggerBack) {
      onTriggerBack();
      return;
    }
    onNewNote();
  };

  return (
    <header className="w-full bg-white dark:bg-gray-900 border-b border-slate-200 dark:border-gray-700 flex-shrink-0 shadow-sm">
      <div className="max-w-md mx-auto h-14 flex justify-between items-center px-4">
        <div className="flex items-center gap-3">
          <button onClick={() => handleNavClick('list')} className="text-xl font-bold bg-gradient-to-r from-accent to-blue-400 bg-clip-text text-transparent">
            Smartpad
          </button>
          <div className="flex items-center">
            <TopNavItem
              label="Notes"
              isActive={currentScreen === 'list'}
              onClick={() => handleNavClick('list')}
            />
            <TopNavItem
              label="Settings"
              isActive={currentScreen === 'settings'}
              onClick={() => handleNavClick('settings')}
            />
          </div>
        </div>
        <button
          onClick={handleNewNoteClick}
          className="bg-gradient-to-r from-accent to-blue-500 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg shadow-accent/30 hover:shadow-accent/50 hover:scale-105 transition-all duration-150 active:scale-95 flex-shrink-0"
          aria-label="New Note"
        >
          <Icon name="plus" className="w-6 h-6" />
        </button>
      </div>
    </header>
  );
};

export default TopNavBar;