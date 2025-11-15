
import React from 'react';

interface IconProps {
  name: string;
  className?: string;
}

// FIX: Use React.ReactElement instead of JSX.Element to avoid namespace issues.
const icons: { [key: string]: React.ReactElement } = {
  menu: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />,
  search: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />,
  plus: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />,
  back: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />,
  tts: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />,
  reminder: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />,
  'reminder-active': <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9 M3 10 l2 2 l-2 2 M21 10 l-2 2 l2 2" />,
  bold: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 4h5.5a4 4 0 010 8H6V4zm0 8h6.5a4 4 0 010 8H6v-8z" />,
  italic: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 4h6M7 20h6M14 4L10 20" />,
  underline: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 20h14M8 4v10a4 4 0 108 0V4" />,
  list: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />,
  alignLeft: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h10M4 14h16M4 18h10" />,
  alignCenter: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M7 10h10M4 14h16M7 18h10" />,
  alignRight: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M10 10h10M4 14h16M10 18h10" />,
  image: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />,
  mic: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />,
  speechToText: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zM19 10v2a7 7 0 01-14 0v-2M12 19v4m-4-4h8" />,
  like: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14zM7 21H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />,
  notes: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
  newNote: <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
  settings: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM12 15a3 3 0 100-6 3 3 0 000 6z" />,
  chevronRight: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />,
  theme: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />,
  fontSize: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 14H11.25l1.62-4.5h.26l1.62 4.5H16.25l-2.37-6.5H12.12L9.75 14zM3 20v-2h18v2H3z" />,
  notifications: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />,
  sort: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9M3 12h9m-9 4h9m5-4v.01M18 4v.01M18 8v.01M18 12v.01M18 16v.01" />,
  save: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1-4l-3-3m0 0l-3 3m3-3v11" />,
  user: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />,
  backup: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />,
  stop: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5h14v14H5z" />,
  camera: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><circle cx="12" cy="13" r="4" /></>,
  trash: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />,
  pin: <path d="M17 4v7l2 2v2H5v-2l2-2V4c0-1.1.9-2 2-2h6c1.1 0 2 .9 2 2z M11.5 17v5h1v-5h-1z" />,
  star: <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />,
  check: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />,
  'chevron-down': <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />,
  filter: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4h18M6 10h12M9 16h6" />,
};

const Icon: React.FC<IconProps> = ({ name, className }) => {
  const isFilled = name.includes('-filled');
  const iconName = isFilled ? name.replace('-filled', '') : name;

  const svgProps = isFilled
    ? { fill: 'currentColor', stroke: 'currentColor', strokeWidth: 0.5 }
    : { fill: 'none', strokeWidth: 2 };

  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      className={className || "w-6 h-6"} 
      viewBox="0 0 24 24" 
      stroke="currentColor"
      {...svgProps}
    >
      {icons[iconName]}
    </svg>
  );
};

export default Icon;
