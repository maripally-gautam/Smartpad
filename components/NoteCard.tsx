
import React from 'react';
import { Note } from '../types';
import Icon from './Icon';

interface NoteCardProps {
  note: Note;
  onClick: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
  onToggleFavourite: () => void;
  onToggleCompleted: () => void;
}

// Helper function to calculate remaining time
const getRemainingTime = (reminderTime: string): { text: string; isPast: boolean } => {
  const now = new Date();
  const reminder = new Date(reminderTime);
  const diff = reminder.getTime() - now.getTime();

  if (diff < 0) {
    return { text: 'Notified', isPast: true };
  }

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days > 0) {
    const remainingHours = hours % 24;
    return { text: `${days}d ${remainingHours}h remaining`, isPast: false };
  } else if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return { text: `${hours}h ${remainingMinutes}m remaining`, isPast: false };
  } else {
    return { text: `${minutes}m remaining`, isPast: false };
  }
};

// Helper to check if reminder has repeat
const hasRepeat = (note: Note): boolean => {
  return !!(note.reminder && note.reminder.repeat && note.reminder.repeat !== 'none');
};

const NoteCard: React.FC<NoteCardProps> = ({ note, onClick, onDelete, onTogglePin, onToggleFavourite, onToggleCompleted }) => {
  // Convert &nbsp; to regular spaces, strip HTML tags, and clean up whitespace
  const textContent = note.content
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]*>?/gm, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const snippet = textContent.length > 100 ? textContent.substring(0, 100) + '...' : textContent;

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
  };

  const handlePinClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onTogglePin();
  };

  const handleFavouriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavourite();
  };

  const handleCompletedClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleCompleted();
  };

  // Show reminder time if reminder exists, otherwise show lastModified
  const displayDate = note.reminder
    ? new Date(note.reminder.time).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    : new Date(note.lastModified).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

  // Get remaining time for reminder
  const remainingTime = note.reminder ? getRemainingTime(note.reminder.time) : null;

  const getBorderColorClass = () => {
    if (note.isPinned && note.isFavourite) {
      return 'border-purple-500';
    }
    if (note.isPinned) {
      return 'border-accent'; // Blue
    }
    if (note.isFavourite) {
      return 'border-yellow-500'; // Orange/Yellow
    }
    return 'border-transparent';
  };

  return (
    <div
      onClick={onClick}
      className={`relative bg-slate-100 dark:bg-secondary p-4 rounded-lg cursor-pointer hover:bg-slate-200 dark:hover:bg-opacity-80 transition-colors duration-100 active:scale-[0.98] border-l-4 ${getBorderColorClass()}`}
    >
      <button
        onClick={handleCompletedClick}
        className={`absolute top-3 right-3 w-6 h-6 rounded-md flex items-center justify-center border-2 transition-colors duration-75 outline-none ${note.isCompleted
          ? 'bg-green-500 border-green-500'
          : 'bg-transparent border-slate-400 dark:border-text-secondary hover:border-accent'
          }`}
        aria-label={note.isCompleted ? "Mark as pending" : "Mark as completed"}
      >
        {note.isCompleted && <Icon name="check" className="w-4 h-4 text-white" />}
      </button>

      <h3 className="font-bold text-lg text-slate-800 dark:text-text-primary truncate pr-8">{note.title}</h3>
      <p className="text-slate-600 dark:text-text-secondary text-sm my-2">{snippet || 'No content'}</p>
      <div className="flex justify-between items-center mt-2">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            {note.reminder && <Icon name="reminder" className="w-3.5 h-3.5 text-accent opacity-80" />}
            {hasRepeat(note) && <Icon name="repeat" className="w-3.5 h-3.5 text-accent opacity-80" />}
            <p className="text-xs text-slate-500 dark:text-text-secondary opacity-70">{displayDate}</p>
          </div>
          {remainingTime && (
            <p className={`text-xs ${remainingTime.isPast ? 'text-red-500' : 'text-green-600 dark:text-green-400'} font-medium`}>
              {remainingTime.text}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handlePinClick}
            className={`p-2 rounded-lg transition-colors duration-75 outline-none ${note.isPinned ? 'text-accent' : 'text-slate-500 dark:text-text-secondary'} hover:bg-slate-200 dark:hover:bg-slate-700`}
            aria-label="Pin note"
          >
            <Icon name={note.isPinned ? 'pin-filled' : 'pin'} className="w-5 h-5" />
          </button>
          <button
            onClick={handleFavouriteClick}
            className={`p-2 rounded-lg transition-colors duration-75 outline-none ${note.isFavourite ? 'text-yellow-500' : 'text-slate-500 dark:text-text-secondary'} hover:bg-slate-200 dark:hover:bg-slate-700`}
            aria-label="Favourite note"
          >
            <Icon name={note.isFavourite ? 'star-filled' : 'star'} className="w-5 h-5" />
          </button>
          <button
            onClick={handleDeleteClick}
            className="p-2 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors duration-75 outline-none"
            aria-label="Delete note"
          >
            <Icon name="trash" className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default NoteCard;