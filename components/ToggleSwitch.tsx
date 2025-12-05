
import React from 'react';

interface ToggleSwitchProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ enabled, onChange }) => {
  return (
    <button
      type="button"
      className={`${enabled ? 'bg-gradient-to-r from-accent to-blue-600 shadow-accent/30 shadow-md' : 'bg-slate-300 dark:bg-gray-600'
        } relative inline-flex items-center h-7 rounded-full w-12 transition-all duration-150 focus:outline-none active:scale-95`}
      onClick={() => onChange(!enabled)}
    >
      <span
        className={`${enabled ? 'translate-x-6' : 'translate-x-1'
          } inline-block w-5 h-5 transform bg-white rounded-full transition-transform duration-150 shadow-sm`}
      />
    </button>
  );
};

export default ToggleSwitch;
