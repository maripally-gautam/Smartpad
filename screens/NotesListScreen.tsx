import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import NoteCard from '../components/NoteCard';
import Icon from '../components/Icon';
import DeleteConfirmationDialog from '../components/DeleteConfirmationDialog';

interface NotesListScreenProps {
  onSelectNote: (noteId: string) => void;
  onDeleteNote: (noteId: string) => void;
  onTogglePin: (noteId: string) => void;
  onToggleFavourite: (noteId: string) => void;
  onToggleCompleted: (noteId: string) => void;
}

type SortOrder = 'newest' | 'oldest' | 'az';
type FilterType = 'all' | 'favourite' | 'completed' | 'pending' | 'with-reminder' | 'without-reminder';

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
      case 'with-reminder':
        filteredNotes = searchedNotes.filter(note => note.reminder);
        break;
      case 'without-reminder':
        filteredNotes = searchedNotes.filter(note => !note.reminder);
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

  const handleRequestDelete = useCallback((noteId: string) => {
    setNoteToDelete(noteId);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (noteToDelete) {
      onDeleteNote(noteToDelete);
      setNoteToDelete(null);
    }
  }, [noteToDelete, onDeleteNote]);

  const handleCancelDelete = useCallback(() => {
    setNoteToDelete(null);
  }, []);

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
    { key: 'with-reminder', label: 'With Reminder' },
    { key: 'without-reminder', label: 'No Reminder' },
  ];

  return (
    <div className="h-full flex flex-col text-slate-800 dark:text-text-primary bg-slate-50 dark:bg-primary">
      <header className="p-3 border-b border-slate-200 dark:border-gray-700 flex-shrink-0 bg-white dark:bg-gray-900 z-10">
        <div className="relative">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-gray-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-100 dark:bg-gray-800 border border-transparent dark:border-gray-700 rounded-xl py-2.5 pl-10 pr-3 text-sm text-slate-800 dark:text-text-primary placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
          />
        </div>
        <div className="pt-3 flex justify-between items-center gap-2 text-sm">
          <div className="relative" ref={sortDropdownRef}>
            <button onClick={() => setIsSortOpen(!isSortOpen)} className="flex items-center gap-1.5 bg-slate-100 dark:bg-gray-800 px-3 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-gray-300 transition-all hover:bg-slate-200 dark:hover:bg-gray-700 active:scale-95">
              <span>Order: {sortOptions.find(o => o.key === sortOrder)?.label}</span>
              <Icon name="chevron-down" className={`w-4 h-4 transition-transform duration-200 ${isSortOpen ? 'rotate-180' : ''}`} />
            </button>
            {isSortOpen && (
              <div className="absolute top-full mt-2 w-40 bg-white dark:bg-gray-800 rounded-xl shadow-xl z-20 overflow-hidden border border-slate-200 dark:border-gray-700 animate-fade-in-fast">
                {sortOptions.map(option => (
                  <button
                    key={option.key}
                    onClick={() => { setSortOrder(option.key); setIsSortOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 transition-colors ${sortOrder === option.key ? 'bg-accent/10 text-accent font-medium' : 'hover:bg-slate-100 dark:hover:bg-gray-700'}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative" ref={filterDropdownRef}>
            <button onClick={() => setIsFilterOpen(!isFilterOpen)} className="flex items-center gap-1.5 bg-slate-100 dark:bg-gray-800 px-3 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-gray-300 transition-all hover:bg-slate-200 dark:hover:bg-gray-700 active:scale-95">
              <span>Filter: {filterOptions.find(o => o.key === filter)?.label}</span>
              <Icon name="filter" className="w-4 h-4" />
            </button>
            {isFilterOpen && (
              <div className="absolute top-full right-0 mt-2 w-44 bg-white dark:bg-gray-800 rounded-xl shadow-xl z-20 overflow-hidden border border-slate-200 dark:border-gray-700 animate-fade-in-fast">
                {filterOptions.map(option => (
                  <button
                    key={option.key}
                    onClick={() => { setFilter(option.key); setIsFilterOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 transition-colors ${filter === option.key ? 'bg-accent/10 text-accent font-medium' : 'hover:bg-slate-100 dark:hover:bg-gray-700'}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 p-3 overflow-y-auto scrollbar-thin" style={{ paddingBottom: 'calc(1rem + var(--safe-bottom))' }}>
        {notes.length === 0 ? (
          <div className="text-center text-slate-500 dark:text-gray-400 mt-16 flex flex-col items-center">
            <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mb-4">
              <Icon name="notes" className="w-10 h-10 text-accent" />
            </div>
            <h3 className="text-xl font-semibold text-slate-700 dark:text-text-primary mb-2">No Notes Yet</h3>
            <p className="text-sm">Click the '+' button above to create your first note.</p>
          </div>
        ) : sortedAndFilteredNotes.length > 0 ? (
          <div className="space-y-3">
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
          <div className="text-center text-slate-500 dark:text-gray-400 mt-16 flex flex-col items-center">
            <div className="w-20 h-20 rounded-full bg-slate-200 dark:bg-gray-700 flex items-center justify-center mb-4">
              <Icon name="search" className="w-10 h-10 text-slate-400 dark:text-gray-500" />
            </div>
            <h3 className="text-xl font-semibold text-slate-700 dark:text-text-primary mb-2">No Results Found</h3>
            <p className="text-sm">Your search for "{searchQuery}" did not return any results.</p>
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
