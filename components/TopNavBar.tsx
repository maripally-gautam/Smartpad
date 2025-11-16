import React from 'react';
import { Screen } from '../types';
import Icon from './Icon';

interface TopNavBarProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
  onNewNote: () => void;
}

const TopNavItem: React.FC<{
  label: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ label, isActive, onClick }) => {
  const activeClass = isActive ? 'text-accent border-accent' : 'text-slate-500 dark:text-text-secondary border-transparent hover:text-slate-800 dark:hover:text-text-primary';
  return (
    <button onClick={onClick} className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors duration-200 ${activeClass}`}>
      {label}
    </button>
  );
};

const TopNavBar: React.FC<TopNavBarProps> = ({ currentScreen, onNavigate, onNewNote }) => {
  return (
    <header className="w-full bg-white dark:bg-secondary border-b border-slate-200 dark:border-border-color flex-shrink-0">
      <div className="max-w-md mx-auto h-12 flex justify-between items-center px-3">
        <div className="flex items-center gap-2">
          <button onClick={() => onNavigate('list')} className="text-base font-bold text-slate-800 dark:text-text-primary">
            Smartpad
          </button>
          <div className="flex items-center">
            <TopNavItem
              label="Notes"
              isActive={currentScreen === 'list'}
              onClick={() => onNavigate('list')}
            />
            <TopNavItem
              label="Settings"
              isActive={currentScreen === 'settings'}
              onClick={() => onNavigate('settings')}
            />
          </div>
        </div>
        <button
          onClick={onNewNote}
          className="bg-accent text-white w-8 h-8 rounded-full flex items-center justify-center shadow-md hover:bg-opacity-90 transition-transform active:scale-90 flex-shrink-0"
          aria-label="New Note"
        >
          <Icon name="plus" className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};

export default TopNavBar;