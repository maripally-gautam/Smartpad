
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import NoteCard from '../components/NoteCard';
import Icon from '../components/Icon';

interface DeleteConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const DeleteConfirmationDialog: React.FC<DeleteConfirmationDialogProps> = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white dark:bg-secondary p-6 rounded-lg w-full max-w-sm mx-4 text-center shadow-lg">
        <h2 className="text-xl font-bold text-slate-900 dark:text-text-primary mb-2">Delete Note?</h2>
        <p className="text-slate-600 dark:text-text-secondary mb-6">This action is permanent and cannot be undone.</p>
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
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};


interface NotesListScreenProps {
  onSelectNote: (noteId: string) => void;
  onDeleteNote: (noteId: string) => void;
  onTogglePin: (noteId: string) => void;
  onToggleFavourite: (noteId: string) => void;
  onToggleCompleted: (noteId: string) => void;
}

type SortOrder = 'newest' | 'oldest' | 'az';
type FilterType = 'all' | 'favourite' | 'completed' | 'pending';

const NotesListScreen: React.FC<NotesListScreenProps> = ({ onSelectNote, onDeleteNote, onTogglePin, onToggleFavourite, onToggleCompleted }) => {
  const { notes } = useAppContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
  
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [filter, setFilter] = useState<FilterType>('all');
  
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
            setIsSortOpen(false);
        }
        if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
            setIsFilterOpen(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
        document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const sortedAndFilteredNotes = useMemo(() => {
    const searchedNotes = searchQuery
      ? notes.filter(note => {
          const query = searchQuery.toLowerCase();
          const titleMatch = note.title.toLowerCase().includes(query);
          const contentText = note.content.replace(/<[^>]*>?/gm, ' ').toLowerCase();
          const contentMatch = contentText.includes(query);
          return titleMatch || contentMatch;
        })
      : [...notes];

    let filteredNotes;
    switch (filter) {
      case 'favourite':
        filteredNotes = searchedNotes.filter(note => note.isFavourite);
        break;
      case 'completed':
        filteredNotes = searchedNotes.filter(note => note.isCompleted);
        break;
      case 'pending':
        filteredNotes = searchedNotes.filter(note => !note.isCompleted);
        break;
      case 'all':
      default:
        filteredNotes = searchedNotes;
        break;
    }

    const pinnedNotes = filteredNotes.filter(note => note.isPinned);
    const regularNotes = filteredNotes.filter(note => !note.isPinned);

    regularNotes.sort((a, b) => {
      switch (sortOrder) {
        case 'newest':
          return new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime();
        case 'oldest':
          return new Date(a.lastModified).getTime() - new Date(b.lastModified).getTime();
        case 'az':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

    return [...pinnedNotes, ...regularNotes];
  }, [notes, searchQuery, sortOrder, filter]);

  const handleRequestDelete = (noteId: string) => {
    setNoteToDelete(noteId);
  };

  const handleConfirmDelete = () => {
    if (noteToDelete) {
      onDeleteNote(noteToDelete);
      setNoteToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setNoteToDelete(null);
  };

  const sortOptions: { key: SortOrder, label: string }[] = [
    { key: 'newest', label: 'Newest' },
    { key: 'oldest', label: 'Oldest' },
    { key: 'az', label: 'A-Z' },
  ];

  const filterOptions: { key: FilterType, label: string }[] = [
      { key: 'all', label: 'All' },
      { key: 'favourite', label: 'Favourites' },
      { key: 'pending', label: 'Pending' },
      { key: 'completed', label: 'Completed' },
  ];

  return (
    <div className="h-full flex flex-col text-slate-800 dark:text-text-primary bg-white dark:bg-primary">
      <header className="p-4 border-b border-slate-200 dark:border-border-color sticky top-0 bg-white dark:bg-primary z-10">
        <div className="relative">
            <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 dark:text-text-secondary pointer-events-none" />
            <input
                type="text"
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-100 dark:bg-secondary border-none rounded-full py-2.5 pl-11 pr-4 text-slate-800 dark:text-text-primary placeholder-slate-500 dark:placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-accent"
            />
        </div>
        <div className="pt-4 flex justify-between items-center gap-2 text-sm">
             <div className="relative" ref={sortDropdownRef}>
                <button onClick={() => setIsSortOpen(!isSortOpen)} className="flex items-center gap-2 bg-slate-100 dark:bg-secondary px-4 py-2 rounded-full text-sm font-medium text-slate-700 dark:text-text-primary transition-colors hover:bg-slate-200 dark:hover:bg-opacity-80">
                    <span>Order by: {sortOptions.find(o => o.key === sortOrder)?.label}</span>
                    <Icon name="chevron-down" className={`w-4 h-4 transition-transform ${isSortOpen ? 'rotate-180' : ''}`} />
                </button>
                {isSortOpen && (
                    <div className="absolute top-full mt-2 w-40 bg-white dark:bg-secondary rounded-lg shadow-lg z-20 overflow-hidden border border-slate-200 dark:border-border-color animate-fade-in-fast">
                        {sortOptions.map(option => (
                            <button key={option.key} onClick={() => { setSortOrder(option.key); setIsSortOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-border-color transition-colors">{option.label}</button>
                        ))}
                    </div>
                )}
            </div>

            <div className="relative" ref={filterDropdownRef}>
                <button onClick={() => setIsFilterOpen(!isFilterOpen)} className="flex items-center gap-2 bg-slate-100 dark:bg-secondary px-4 py-2 rounded-full text-sm font-medium text-slate-700 dark:text-text-primary transition-colors hover:bg-slate-200 dark:hover:bg-opacity-80">
                    <span>Filter: {filterOptions.find(o => o.key === filter)?.label}</span>
                    <Icon name="filter" className="w-4 h-4" />
                </button>
                {isFilterOpen && (
                    <div className="absolute top-full right-0 mt-2 w-40 bg-white dark:bg-secondary rounded-lg shadow-lg z-20 overflow-hidden border border-slate-200 dark:border-border-color animate-fade-in-fast">
                        {filterOptions.map(option => (
                           <button key={option.key} onClick={() => { setFilter(option.key); setIsFilterOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-border-color transition-colors">{option.label}</button>
                        ))}
                    </div>
                )}
            </div>
        </div>
      </header>
      
      <div className="flex-1 p-4 overflow-y-auto">
        {notes.length === 0 ? (
            <div className="text-center text-slate-500 dark:text-text-secondary mt-16 flex flex-col items-center">
                <Icon name="notes" className="w-12 h-12 mb-4" />
                <h3 className="text-xl font-semibold text-slate-800 dark:text-text-primary">No Notes Yet</h3>
                <p>Click the '+' button above to create your first note.</p>
            </div>
        ) : sortedAndFilteredNotes.length > 0 ? (
            <div className="space-y-4">
            {sortedAndFilteredNotes.map(note => (
                <NoteCard 
                  key={note.id} 
                  note={note} 
                  onClick={() => onSelectNote(note.id)} 
                  onDelete={() => handleRequestDelete(note.id)}
                  onTogglePin={() => onTogglePin(note.id)}
                  onToggleFavourite={() => onToggleFavourite(note.id)}
                  onToggleCompleted={() => onToggleCompleted(note.id)}
                />
            ))}
            </div>
        ) : (
            <div className="text-center text-slate-500 dark:text-text-secondary mt-16 flex flex-col items-center">
                <Icon name="search" className="w-12 h-12 mb-4" />
                <h3 className="text-xl font-semibold text-slate-800 dark:text-text-primary">No Results Found</h3>
                <p>Your search for "{searchQuery}" did not return any results.</p>
            </div>
        )}
      </div>

      <DeleteConfirmationDialog 
        isOpen={!!noteToDelete}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};

export default NotesListScreen;
