
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

const NoteCard: React.FC<NoteCardProps> = ({ note, onClick, onDelete, onTogglePin, onToggleFavourite, onToggleCompleted }) => {
  const textContent = note.content.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
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

  const formattedDate = new Date(note.lastModified).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

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
      className={`relative bg-slate-100 dark:bg-secondary p-4 rounded-lg cursor-pointer hover:bg-slate-200 dark:hover:bg-opacity-80 transition-all duration-200 active:scale-95 border-l-4 ${getBorderColorClass()}`}
    >
      <button
        onClick={handleCompletedClick}
        className={`absolute top-3 right-3 w-6 h-6 rounded-md flex items-center justify-center border-2 transition-all duration-200 outline-none ${note.isCompleted
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
        <div className="flex items-center gap-1.5">
          {note.reminder && <Icon name="reminder" className="w-3.5 h-3.5 text-accent opacity-80" />}
          <p className="text-xs text-slate-500 dark:text-text-secondary opacity-70">{formattedDate}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handlePinClick}
            className={`p-2 rounded-lg transition-colors outline-none ${note.isPinned ? 'text-accent' : 'text-slate-500 dark:text-text-secondary'} hover:bg-slate-200 dark:hover:bg-slate-700`}
            aria-label="Pin note"
          >
            <Icon name={note.isPinned ? 'pin-filled' : 'pin'} className="w-5 h-5" />
          </button>
          <button
            onClick={handleFavouriteClick}
            className={`p-2 rounded-lg transition-colors outline-none ${note.isFavourite ? 'text-yellow-500' : 'text-slate-500 dark:text-text-secondary'} hover:bg-slate-200 dark:hover:bg-slate-700`}
            aria-label="Favourite note"
          >
            <Icon name={note.isFavourite ? 'star-filled' : 'star'} className="w-5 h-5" />
          </button>
          <button
            onClick={handleDeleteClick}
            className="p-2 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors outline-none"
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