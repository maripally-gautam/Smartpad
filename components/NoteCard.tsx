
import React, { useMemo, memo } from 'react';
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

const NoteCardComponent: React.FC<NoteCardProps> = ({ note, onClick, onDelete, onTogglePin, onToggleFavourite, onToggleCompleted }) => {
  // Memoize the text content extraction for performance with many notes
  const snippet = useMemo(() => {
    const textContent = note.content
      .replace(/&nbsp;/g, ' ')
      .replace(/<[^>]*>?/gm, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return textContent.length > 100 ? textContent.substring(0, 100) + '...' : textContent;
  }, [note.content]);

  // Memoize display date for performance
  const displayDate = useMemo(() => {
    const dateToFormat = note.reminder ? note.reminder.time : note.lastModified;
    return new Date(dateToFormat).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }, [note.reminder, note.lastModified]);

  // Memoize remaining time calculation
  const remainingTime = useMemo(() => {
    return note.reminder ? getRemainingTime(note.reminder.time) : null;
  }, [note.reminder]);

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

  const getBorderColorClass = () => {
    if (note.isPinned && note.isFavourite) {
      return 'border-purple-500 bg-purple-500/5 dark:bg-purple-500/10';
    }
    if (note.isPinned) {
      return 'border-accent bg-blue-500/5 dark:bg-blue-500/10';
    }
    if (note.isFavourite) {
      return 'border-amber-500 bg-amber-500/5 dark:bg-amber-500/10';
    }
    return 'border-transparent';
  };

  return (
    <div
      onClick={onClick}
      className={`relative bg-slate-50 dark:bg-secondary p-4 rounded-xl cursor-pointer transition-all duration-150 active:scale-[0.98] border-l-4 shadow-sm ${getBorderColorClass()}`}
    >
      <button
        onClick={handleCompletedClick}
        className={`absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all duration-100 outline-none ${note.isCompleted
          ? 'bg-emerald-500 border-emerald-500 shadow-emerald-500/30 shadow-sm'
          : 'bg-transparent border-slate-300 dark:border-gray-500 active:border-accent active:scale-110'
          }`}
        aria-label={note.isCompleted ? "Mark as pending" : "Mark as completed"}
      >
        {note.isCompleted && <Icon name="check" className="w-4 h-4 text-white" />}
      </button>

      <h3 className="font-semibold text-lg text-slate-800 dark:text-text-primary truncate pr-8">{note.title}</h3>
      <p className="text-slate-500 dark:text-text-secondary text-sm my-2 line-clamp-2">{snippet || 'No content'}</p>
      <div className="flex justify-between items-center mt-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            {note.reminder && <Icon name="reminder" className="w-3.5 h-3.5 text-accent" />}
            {hasRepeat(note) && <Icon name="repeat" className="w-3.5 h-3.5 text-purple-500" />}
            <p className="text-xs text-slate-400 dark:text-text-secondary">{displayDate}</p>
          </div>
          {remainingTime && (
            <p className={`text-xs font-medium ${remainingTime.isPast ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {remainingTime.text}
            </p>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          <button
            onClick={handlePinClick}
            className={`p-2 rounded-full transition-all duration-100 outline-none ${note.isPinned ? 'text-accent bg-accent/10' : 'text-accent'} active:scale-90`}
            aria-label="Pin note"
          >
            <Icon name={note.isPinned ? 'pin-filled' : 'pin'} className="w-5 h-5" />
          </button>
          <button
            onClick={handleFavouriteClick}
            className={`p-2 rounded-full transition-all duration-100 outline-none ${note.isFavourite ? 'text-amber-500 bg-amber-500/10' : 'text-amber-500'} active:scale-90`}
            aria-label="Favourite note"
          >
            <Icon name={note.isFavourite ? 'star-filled' : 'star'} className="w-5 h-5" />
          </button>
          <button
            onClick={handleDeleteClick}
            className="p-2 rounded-full text-red-500 transition-all duration-100 outline-none active:scale-90"
            aria-label="Delete note"
          >
            <Icon name="trash" className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Memoize the entire component to prevent unnecessary re-renders
const NoteCard = memo(NoteCardComponent, (prevProps, nextProps) => {
  // Custom comparison for better performance
  return (
    prevProps.note.id === nextProps.note.id &&
    prevProps.note.title === nextProps.note.title &&
    prevProps.note.content === nextProps.note.content &&
    prevProps.note.isPinned === nextProps.note.isPinned &&
    prevProps.note.isFavourite === nextProps.note.isFavourite &&
    prevProps.note.isCompleted === nextProps.note.isCompleted &&
    prevProps.note.lastModified === nextProps.note.lastModified &&
    JSON.stringify(prevProps.note.reminder) === JSON.stringify(nextProps.note.reminder)
  );
});

export default NoteCard;