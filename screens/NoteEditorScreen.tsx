
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Note, MediaAttachment, Reminder } from '../types';
import Icon from '../components/Icon';
import { useAppContext } from '../context/AppContext';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { VoiceRecorder } from 'capacitor-voice-recorder';

// -- MODAL COMPONENTS -- //
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, title }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-secondary p-6 rounded-lg w-full max-w-sm mx-4 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-slate-900 dark:text-text-primary mb-4">{title}</h2>
        {children}
      </div>
    </div>
  );
};

const LanguageSelectionModal: React.FC<{onSelect: (lang: string) => void, onClose: () => void}> = ({ onSelect, onClose }) => (
  <div className="space-y-2">
    <button onClick={() => onSelect('en-US')} className="w-full text-left p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-border-color transition-colors">English</button>
    <button onClick={() => onSelect('hi-IN')} className="w-full text-left p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-border-color transition-colors">Hindi</button>
    <button onClick={() => onSelect('te-IN')} className="w-full text-left p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-border-color transition-colors">Telugu</button>
  </div>
);

const ReminderModal: React.FC<{
  reminder: Reminder | undefined,
  onSave: (reminder: Reminder) => void,
  onDelete: () => void,
  onClose: () => void
}> = ({ reminder, onSave, onDelete, onClose }) => {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [repeat, setRepeat] = useState<Reminder['repeat']>('none');
  const [customDays, setCustomDays] = useState(1);

  useEffect(() => {
    if (reminder) {
      const d = new Date(reminder.time);
      setDate(d.toISOString().split('T')[0]);
      setTime(d.toTimeString().substring(0, 5));
      setRepeat(reminder.repeat);
      if (reminder.repeat === 'custom') {
        setCustomDays(reminder.customDays || 1);
      }
    } else {
        const d = new Date();
        d.setMinutes(d.getMinutes() + 5);
        setDate(d.toISOString().split('T')[0]);
        setTime(d.toTimeString().substring(0, 5));
        setRepeat('none');
    }
  }, [reminder]);

  const handleSave = () => {
    const [year, month, day] = date.split('-').map(Number);
    const [hours, minutes] = time.split(':').map(Number);
    const reminderDate = new Date(year, month - 1, day, hours, minutes);
    
    const newReminder: Reminder = {
      time: reminderDate.toISOString(),
      repeat,
    };

    if (repeat === 'custom') {
      newReminder.customDays = customDays > 0 ? customDays : 1;
    }

    onSave(newReminder);
    onClose();
  };
  
  const handleDeleteAndClose = () => {
    onDelete();
    onClose();
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-slate-100 dark:bg-border-color p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent" />
        <input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full bg-slate-100 dark:bg-border-color p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent" />
      </div>
      <select value={repeat} onChange={e => setRepeat(e.target.value as any)} className="w-full bg-slate-100 dark:bg-border-color p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent">
        <option value="none">Does not repeat</option>
        <option value="daily">Daily</option>
        <option value="weekly">Weekly</option>
        <option value="monthly">Monthly</option>
        <option value="yearly">Yearly</option>
        <option value="custom">Custom</option>
      </select>
      {repeat === 'custom' && (
        <div className="flex items-center gap-2">
            <span className="text-slate-600 dark:text-text-secondary">Repeat every</span>
            <input 
                type="number"
                value={customDays}
                onChange={e => setCustomDays(parseInt(e.target.value, 10))}
                className="w-20 bg-slate-100 dark:bg-border-color p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                min="1"
            />
            <span className="text-slate-600 dark:text-text-secondary">days</span>
        </div>
      )}
      <div className="flex justify-between items-center pt-4">
        {reminder && <button onClick={handleDeleteAndClose} className="text-red-500 font-semibold">Delete</button>}
        <div className="flex gap-2 ml-auto">
            <button onClick={onClose} className="px-4 py-2 rounded-full font-semibold">Cancel</button>
            <button onClick={handleSave} className="px-4 py-2 rounded-full bg-accent text-white font-semibold">Save</button>
        </div>
      </div>
    </div>
  );
};

const ImageChoiceModal: React.FC<{onClose: () => void; onTakePhoto: () => void; onChooseGallery: () => void;}> = ({ onClose, onTakePhoto, onChooseGallery }) => (
    <div className="space-y-2">
      <button onClick={onTakePhoto} className="w-full text-left p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-border-color transition-colors flex items-center">
        <Icon name="camera" className="w-5 h-5 mr-3"/> Take Photo
      </button>
      <button onClick={onChooseGallery} className="w-full text-left p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-border-color transition-colors flex items-center">
        <Icon name="image" className="w-5 h-5 mr-3"/> Choose from Gallery
      </button>
    </div>
);

const FontSizeModal: React.FC<{onSelect: (size: number) => void;}> = ({ onSelect }) => (
    <div className="flex justify-around items-center p-2">
        <button onClick={() => onSelect(2)} className="px-4 py-2 text-sm rounded-lg hover:bg-slate-100 dark:hover:bg-border-color transition-colors">Small</button>
        <button onClick={() => onSelect(3)} className="px-4 py-2 text-base rounded-lg hover:bg-slate-100 dark:hover:bg-border-color transition-colors">Normal</button>
        <button onClick={() => onSelect(5)} className="px-4 py-2 text-lg rounded-lg hover:bg-slate-100 dark:hover:bg-border-color transition-colors">Large</button>
    </div>
);


// -- MAIN EDITOR COMPONENT -- //

interface NoteEditorScreenProps {
  note: Note | null;
  onSave: (note: Note) => void;
  onUpdateNote: (note: Note) => void;
  onBack: () => void;
  onDelete: (noteId: string) => void;
}

const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;

if (recognition) {
  recognition.continuous = true;
  recognition.interimResults = true;
}

type Alignment = 'justify' | 'left' | 'right' | 'center';

const NoteEditorScreen: React.FC<NoteEditorScreenProps> = ({ note, onSave, onUpdateNote, onBack, onDelete }) => {
  const { settings } = useAppContext();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [media, setMedia] = useState<MediaAttachment[]>([]);
  const [reminder, setReminder] = useState<Reminder | undefined>(undefined);
  const [characterCount, setCharacterCount] = useState(0);
  
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [isUnsavedChangesModalOpen, setIsUnsavedChangesModalOpen] = useState(false);
  const [isFontSizeModalOpen, setIsFontSizeModalOpen] = useState(false);
  const [isImageChoiceModalOpen, setIsImageChoiceModalOpen] = useState(false);

  const [activeStyles, setActiveStyles] = useState<Set<string>>(new Set());
  const [alignment, setAlignment] = useState<Alignment>('justify');

  const contentRef = useRef<HTMLDivElement>(null);
  const initialNoteRef = useRef<Note | null>(null);

  const countCharacters = (htmlString: string) => {
    if (!htmlString) return 0;
    const text = htmlString.replace(/<[^>]*>?/gm, ' ').trim();
    return text.length;
  };

  const noteHasChanged = useCallback(() => {
    if (settings.autoSave) return false;
    const currentContent = contentRef.current?.innerHTML || '';
    if (!initialNoteRef.current) {
        return title.trim() !== '' || (currentContent.trim() !== '' && currentContent.trim() !== '<br>') || media.length > 0;
    }
    return initialNoteRef.current.title !== title ||
           initialNoteRef.current.content !== currentContent ||
           JSON.stringify(initialNoteRef.current.media) !== JSON.stringify(media) ||
           JSON.stringify(initialNoteRef.current.reminder) !== JSON.stringify(reminder);
  }, [title, media, reminder, settings.autoSave]);
  
  const createNoteObject = (): Note => ({
      id: note?.id || new Date().toISOString(),
      title: title || 'Untitled Note',
      content: contentRef.current?.innerHTML || '',
      media: media,
      lastModified: new Date().toISOString(),
      reminder: reminder,
      isPinned: note?.isPinned ?? false,
      isFavourite: note?.isFavourite ?? false,
      isCompleted: note?.isCompleted ?? false,
  });

  const updateToolbarState = useCallback(() => {
    const styles = new Set<string>();
    if (document.queryCommandState('bold')) styles.add('bold');
    if (document.queryCommandState('italic')) styles.add('italic');
    if (document.queryCommandState('underline')) styles.add('underline');
    setActiveStyles(styles);

    if (document.queryCommandState('justifyLeft')) setAlignment('left');
    else if (document.queryCommandState('justifyRight')) setAlignment('right');
    else if (document.queryCommandState('justifyCenter')) setAlignment('center');
    else if (document.queryCommandState('justifyFull')) setAlignment('justify');
  }, []);

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
      setMedia(note.media || []);
      setReminder(note.reminder);
      if (contentRef.current) {
        contentRef.current.innerHTML = note.content;
        setCharacterCount(countCharacters(note.content));
      }
    } else {
      setTitle(''); setContent(''); setMedia([]); setReminder(undefined);
      if (contentRef.current) {
        contentRef.current.innerHTML = '';
        contentRef.current.focus();
        document.execCommand('justifyFull', false);
        updateToolbarState();
        setCharacterCount(0);
      }
    }
    initialNoteRef.current = note;
  }, [note, updateToolbarState]);

  useEffect(() => {
    const autoSave = () => {
        if (settings.autoSave) {
            const hasChanged = JSON.stringify(createNoteObject()) !== JSON.stringify(initialNoteRef.current);
            if (hasChanged) {
                onUpdateNote(createNoteObject());
            }
        }
    };
    const interval = setInterval(autoSave, 5000);
    return () => clearInterval(interval);
  }, [settings.autoSave, title, content, media, reminder, onUpdateNote]);

  useEffect(() => {
    document.addEventListener('selectionchange', updateToolbarState);
    const contentEl = contentRef.current;
    contentEl?.addEventListener('keyup', updateToolbarState);
    contentEl?.addEventListener('click', updateToolbarState);
    return () => {
        document.removeEventListener('selectionchange', updateToolbarState);
        contentEl?.removeEventListener('keyup', updateToolbarState);
        contentEl?.removeEventListener('click', updateToolbarState);
    };
  }, [updateToolbarState]);

  useEffect(() => {
    if (!recognition) return;
    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
      }
      if (finalTranscript && contentRef.current) {
        contentRef.current.focus();
        document.execCommand('insertText', false, finalTranscript);
      }
    };
    recognition.onerror = (event: any) => { console.error('Speech recognition error:', event.error); setIsListening(false); };
    recognition.onend = () => setIsListening(false);
    return () => { if (recognition) recognition.stop(); }
  }, []);

  const startListening = (lang: string) => {
    if (!recognition) { alert('Speech recognition is not supported in this browser.'); return; }
    setIsLanguageModalOpen(false);
    if (isListening) recognition.stop();
    recognition.lang = lang;
    recognition.start();
    setIsListening(true);
  };
  
  const stopListening = () => { if (recognition) recognition.stop(); setIsListening(false); }

  const handleSave = () => onSave(createNoteObject());
  const handleDeleteConfirm = () => { if (note) onDelete(note.id); setIsDeleteModalOpen(false); };

  const handleBackPress = () => {
    if (noteHasChanged()) setIsUnsavedChangesModalOpen(true);
    else onBack();
  };

  const handleTextToSpeech = () => {
    if ('speechSynthesis' in window) {
      if (isSpeaking) { window.speechSynthesis.cancel(); setIsSpeaking(false);
      } else {
        const textToSpeak = title + ". " + contentRef.current?.innerText;
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
        setIsSpeaking(true);
      }
    }
  };

  const handleRecordVoice = async () => {
    if (isRecording) {
      try {
        const result = await VoiceRecorder.stopRecording();
        if (result.value) {
            const audioSrc = `data:audio/aac;base64,${result.value}`;
            setMedia(prev => [...prev, { id: new Date().toISOString(), type: 'audio', src: audioSrc }]);
        }
      } catch (error) { console.error("Error stopping recording:", error); }
      setIsRecording(false);
    } else {
      try {
        const permission = await VoiceRecorder.requestAudioRecordingPermission();
        if (permission.value) {
          await VoiceRecorder.startRecording();
          setIsRecording(true);
        } else { alert("Microphone permission is required to record audio."); }
      } catch (error) {
        console.error("Error starting recording:", error);
        alert("Could not start recording. Please check permissions.");
        setIsRecording(false);
      }
    }
  };
  
  const handleContentInput = () => {
    const html = contentRef.current?.innerHTML || '';
    setContent(html);
    setCharacterCount(countCharacters(html));
  };

  const handleStyleClick = (command: string) => { document.execCommand(command, false); contentRef.current?.focus(); updateToolbarState(); };

  const handleAlignmentClick = () => {
    const alignments: Alignment[] = ['justify', 'left', 'right', 'center'];
    const nextAlignment = alignments[(alignments.indexOf(alignment) + 1) % alignments.length];
    const commandMap = { justify: 'justifyFull', left: 'justifyLeft', right: 'justifyRight', center: 'justifyCenter' };
    document.execCommand(commandMap[nextAlignment], false);
    contentRef.current?.focus(); setAlignment(nextAlignment); 
  };
  const alignmentIconMap: { [key in Alignment]: string } = { justify: 'list', left: 'alignLeft', center: 'alignCenter', right: 'alignRight' };

  const takePicture = async (source: CameraSource) => {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: source
      });
      if (image.dataUrl) {
        setMedia(prev => [...prev, { id: new Date().toISOString(), type: 'image', src: image.dataUrl as string }]);
      }
    } catch (error) {
      console.error('Error taking picture:', error);
    }
    setIsImageChoiceModalOpen(false);
  };

  const handleDeleteMedia = (mediaId: string) => setMedia(prev => prev.filter(m => m.id !== mediaId));

  const handleFontSizeSelect = (size: number) => {
    document.execCommand('fontSize', false, size.toString());
    contentRef.current?.focus();
    setIsFontSizeModalOpen(false);
  };
  
  const ToolbarButton: React.FC<{onClick: () => void; icon: string; label: string; isActive?: boolean;}> = ({ onClick, icon, label, isActive }) => (
    <button onClick={onClick} className={`flex flex-col items-center justify-center p-2 text-xs w-16 h-16 transition-colors duration-200 focus:outline-none ${isActive ? 'text-accent' : 'text-slate-600 dark:text-text-secondary hover:text-slate-900 dark:hover:text-text-primary'}`} aria-label={label}>
      <Icon name={icon} className="w-5 h-5 mb-1"/> <span>{label}</span>
    </button>
  );

  const imageMedia = media.filter(m => m.type === 'image');
  const audioMedia = media.filter(m => m.type === 'audio');

  return (
    <div className="h-full flex flex-col bg-white dark:bg-primary text-slate-900 dark:text-text-primary">
      <header className="p-4 flex justify-between items-center border-b border-slate-200 dark:border-border-color sticky top-0 bg-white dark:bg-primary z-10">
        <button onClick={handleBackPress} className="p-2 -ml-2"><Icon name="back" /></button>
        <div className="flex items-center gap-2">
          <button onClick={handleTextToSpeech} className="p-2"><Icon name={isSpeaking ? 'stop' : 'tts'} /></button>
          <button onClick={() => setIsReminderModalOpen(true)} className={`p-2 ${reminder ? 'text-accent' : ''}`}>
            <Icon name={reminder ? 'reminder-active' : 'reminder'} />
          </button>
          {note && <button onClick={() => setIsDeleteModalOpen(true)} className="p-2 text-red-500 hover:text-red-400"><Icon name="trash" /></button>}
          <button onClick={handleSave} className="bg-accent text-white px-4 py-1.5 rounded-full font-semibold">Done</button>
        </div>
      </header>
      
      <div className="flex-1 flex flex-col overflow-y-auto p-4 gap-4">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="bg-transparent text-2xl font-bold placeholder-slate-400 dark:placeholder-text-secondary focus:outline-none flex-shrink-0 p-4 border border-slate-200 dark:border-border-color rounded-lg"
        />
        <div className="relative flex-1 min-h-[200px] border border-slate-200 dark:border-border-color rounded-lg">
          <div
            ref={contentRef}
            contentEditable
            onInput={handleContentInput}
            className="bg-transparent text-slate-800 dark:text-text-primary focus:outline-none w-full h-full p-4"
          />
          {!content.replace(/<[^>]*>?/gm, ' ').trim() && (
            <div 
              className="absolute inset-0 p-4 text-slate-400 dark:text-text-secondary pointer-events-none"
              aria-hidden="true"
            >
              Start writing here...
            </div>
          )}
        </div>
        
        {imageMedia.length > 0 && (
          <div className="flex-shrink-0">
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
              {imageMedia.map(item => (
                <div key={item.id} className="relative group aspect-square">
                  <img src={item.src} alt="attachment" className="rounded-lg w-full h-full object-cover" />
                  <button onClick={() => handleDeleteMedia(item.id)} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Remove media"><Icon name="plus" className="w-3 h-3 transform rotate-45" /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {audioMedia.length > 0 && (
            <div className="flex-shrink-0 space-y-2">
                {audioMedia.map(item => (
                    <div key={item.id} className="relative group flex items-center gap-2 bg-slate-100 dark:bg-secondary p-2 rounded-lg">
                        <audio controls src={item.src} className="w-full" />
                        <button onClick={() => handleDeleteMedia(item.id)} className="flex-shrink-0 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Remove media"><Icon name="plus" className="w-3 h-3 transform rotate-45" /></button>
                    </div>
                ))}
            </div>
        )}
      </div>
      
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Delete Note?">
         <p className="text-slate-600 dark:text-text-secondary mb-6">This action is permanent and cannot be undone.</p>
        <div className="flex justify-center gap-4">
          <button onClick={() => setIsDeleteModalOpen(false)} className="px-6 py-2 rounded-full bg-slate-200 dark:bg-border-color text-slate-800 dark:text-text-primary font-semibold">Cancel</button>
          <button onClick={handleDeleteConfirm} className="px-6 py-2 rounded-full bg-red-600 text-white font-semibold">Delete</button>
        </div>
      </Modal>
      <Modal isOpen={isLanguageModalOpen} onClose={() => setIsLanguageModalOpen(false)} title="Select Language">
        <LanguageSelectionModal onSelect={startListening} onClose={() => setIsLanguageModalOpen(false)}/>
      </Modal>
      <Modal isOpen={isReminderModalOpen} onClose={() => setIsReminderModalOpen(false)} title={reminder ? "Edit Reminder" : "Set Reminder"}>
        <ReminderModal reminder={reminder} onSave={setReminder} onDelete={() => setReminder(undefined)} onClose={() => setIsReminderModalOpen(false)} />
      </Modal>
       <Modal isOpen={isImageChoiceModalOpen} onClose={() => setIsImageChoiceModalOpen(false)} title="Add Image">
        <ImageChoiceModal
            onClose={() => setIsImageChoiceModalOpen(false)}
            onTakePhoto={() => takePicture(CameraSource.Camera)}
            onChooseGallery={() => takePicture(CameraSource.Photos)}
        />
      </Modal>
       <Modal isOpen={isFontSizeModalOpen} onClose={() => setIsFontSizeModalOpen(false)} title="Select Font Size">
        <FontSizeModal onSelect={handleFontSizeSelect} />
      </Modal>
      <Modal isOpen={isUnsavedChangesModalOpen} onClose={() => setIsUnsavedChangesModalOpen(false)} title="Unsaved Changes">
         <p className="text-slate-600 dark:text-text-secondary mb-6">You have unsaved changes. Do you want to save them?</p>
        <div className="flex justify-end gap-2">
          <button onClick={() => setIsUnsavedChangesModalOpen(false)} className="px-5 py-2 rounded-full font-semibold hover:bg-slate-100 dark:hover:bg-border-color">Cancel</button>
          <button onClick={() => { setIsUnsavedChangesModalOpen(false); onBack(); }} className="px-5 py-2 rounded-full font-semibold text-red-500 hover:bg-red-500/10">Discard</button>
          <button onClick={() => { setIsUnsavedChangesModalOpen(false); handleSave(); }} className="px-5 py-2 rounded-full bg-accent text-white font-semibold">Save</button>
        </div>
      </Modal>

      <div className="w-full text-right text-xs font-medium text-slate-500 dark:text-text-secondary px-4 py-1 bg-white dark:bg-primary border-t border-slate-200 dark:border-border-color">
        Characters: {characterCount}
      </div>
      <footer className="w-full bg-slate-100 dark:bg-secondary">
        <div className="max-w-md mx-auto h-20 flex justify-around items-center px-2">
          <div className="flex justify-around items-center w-full">
            <ToolbarButton onClick={() => handleStyleClick('bold')} icon="bold" label="Bold" isActive={activeStyles.has('bold')} />
            <ToolbarButton onClick={() => handleStyleClick('italic')} icon="italic" label="Italic" isActive={activeStyles.has('italic')} />
            <ToolbarButton onClick={() => handleStyleClick('underline')} icon="underline" label="Underline" isActive={activeStyles.has('underline')} />
            <ToolbarButton onClick={handleAlignmentClick} icon={alignmentIconMap[alignment]} label="Align" />
            <ToolbarButton onClick={() => setIsFontSizeModalOpen(true)} icon="fontSize" label="Size" />
            <div className="w-px h-12 bg-slate-300 dark:bg-border-color"></div>
            <ToolbarButton onClick={() => setIsImageChoiceModalOpen(true)} icon="image" label="Image" />
            <ToolbarButton onClick={isListening ? stopListening : () => setIsLanguageModalOpen(true)} icon="like" label="Speak" isActive={isListening} />
            <ToolbarButton onClick={handleRecordVoice} icon="mic" label="Record" isActive={isRecording} />
          </div>
        </div>
      </footer>
    </div>
  );
};

export default NoteEditorScreen;
