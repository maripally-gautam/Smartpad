
import React from 'react';

interface ToggleSwitchProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ enabled, onChange }) => {
  return (
    <button
      type="button"
      className={`${enabled ? 'bg-accent' : 'bg-border-color'
        } relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-75 focus:outline-none`}
      onClick={() => onChange(!enabled)}
    >
      <span
        className={`${enabled ? 'translate-x-6' : 'translate-x-1'
          } inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-75`}
      />
    </button>
  );
};

export default ToggleSwitch;
