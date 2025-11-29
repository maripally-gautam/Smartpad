import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Note, MediaAttachment, Reminder } from '../types';
import Icon from '../components/Icon';
import Modal from '../components/Modal';
import { useAppContext } from '../context/AppContext';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { VoiceRecorder } from 'capacitor-voice-recorder';
import { TextToSpeech } from '@capacitor-community/text-to-speech';

// -- MODAL COMPONENTS -- //

const LanguageSelectionModal: React.FC<{ onSelect: (lang: string) => void, onClose: () => void }> = ({ onSelect, onClose }) => (
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

const ImageChoiceModal: React.FC<{ onClose: () => void; onTakePhoto: () => void; onChooseGallery: () => void; }> = ({ onClose, onTakePhoto, onChooseGallery }) => (
  <div className="space-y-2">
    <button onClick={onTakePhoto} className="w-full text-left p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-border-color transition-colors flex items-center">
      <Icon name="camera" className="w-5 h-5 mr-3" /> Take Photo
    </button>
    <button onClick={onChooseGallery} className="w-full text-left p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-border-color transition-colors flex items-center">
      <Icon name="image" className="w-5 h-5 mr-3" /> Choose from Gallery
    </button>
  </div>
);

const FontSizeModal: React.FC<{ onSelect: (size: number) => void; }> = ({ onSelect }) => (
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
  registerBackHandler: (handler: (() => boolean) | null) => void;
}

const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;

if (recognition) {
  recognition.continuous = true;
  recognition.interimResults = false; // Changed to false to prevent duplicates
  recognition.maxAlternatives = 1;
}

type Alignment = 'justify' | 'left' | 'right' | 'center';

// Request audio permissions function
const requestAudioPermissions = async () => {
  try {
    const permission = await VoiceRecorder.requestAudioRecordingPermission();
    return permission.value;
  } catch (error) {
    console.error('Error requesting audio permission:', error);
    return false;
  }
};

const NoteEditorScreen: React.FC<NoteEditorScreenProps> = ({ note, onSave, onUpdateNote, onBack, onDelete, registerBackHandler }) => {
  const { settings } = useAppContext();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [media, setMedia] = useState<MediaAttachment[]>([]);
  const [reminder, setReminder] = useState<Reminder | undefined>(undefined);
  const [characterCount, setCharacterCount] = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [toolbarBottom, setToolbarBottom] = useState(0);
  const [selectedImage, setSelectedImage] = useState<MediaAttachment | null>(null);

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
  const recognitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const initialWindowHeight = useRef(window.innerHeight);

  // Keyboard detection and toolbar positioning using visualViewport API
  useEffect(() => {
    let lastHeight = window.innerHeight;

    const updateToolbarPosition = () => {
      if (window.visualViewport) {
        const viewport = window.visualViewport;
        const screenHeight = window.innerHeight;

        // Calculate keyboard height based on viewport
        const keyboardHeight = screenHeight - viewport.height - viewport.offsetTop;

        // Only update if there's a meaningful change (prevents micro-bouncing)
        const newBottom = Math.max(0, keyboardHeight);

        // Use requestAnimationFrame for smoother updates
        requestAnimationFrame(() => {
          setToolbarBottom(newBottom);
          // Keyboard is visible if viewport height is significantly less than screen height
          setKeyboardVisible(keyboardHeight > 100);
        });

        lastHeight = viewport.height;
      }
    };

    // Initial setup
    initialWindowHeight.current = window.innerHeight;

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateToolbarPosition);
      window.visualViewport.addEventListener('scroll', updateToolbarPosition);
      // Initial call
      updateToolbarPosition();
    }

    // Also listen for window resize as fallback
    window.addEventListener('resize', updateToolbarPosition);

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateToolbarPosition);
        window.visualViewport.removeEventListener('scroll', updateToolbarPosition);
      }
      window.removeEventListener('resize', updateToolbarPosition);
    };
  }, []);

  // Auto-focus the content area when the component mounts to show keyboard
  useEffect(() => {
    // Small delay to ensure the component is fully rendered
    const timer = setTimeout(() => {
      if (contentRef.current) {
        contentRef.current.focus();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Check permissions on mount
  useEffect(() => {
    const checkPermissions = async () => {
      const hasPermission = await requestAudioPermissions();
      if (!hasPermission) {
        console.log('Microphone permission not granted');
      }
    };
    checkPermissions();
  }, []);

  // Cleanup TTS when component unmounts
  useEffect(() => {
    return () => {
      // Stop TTS when leaving the screen
      TextToSpeech.stop().catch(() => { });
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

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

  // Register back handler for device back button
  useEffect(() => {
    const backHandler = () => {
      if (noteHasChanged()) {
        setIsUnsavedChangesModalOpen(true);
        return true; // Block navigation
      }
      return false; // Allow navigation
    };

    registerBackHandler(backHandler);

    // Cleanup: unregister when component unmounts
    return () => {
      registerBackHandler(null);
    };
  }, [noteHasChanged, registerBackHandler]);

  /**
   * Sanitize HTML content before saving:
   * - Convert &nbsp; to regular spaces
   * - Remove trailing whitespace from content
   * - Clean up multiple consecutive spaces
   */
  const sanitizeContent = (html: string): string => {
    if (!html) return '';

    // Replace &nbsp; with regular space
    let sanitized = html.replace(/&nbsp;/g, ' ');

    // Replace multiple consecutive spaces with single space (but preserve line breaks)
    sanitized = sanitized.replace(/  +/g, ' ');

    // Remove trailing spaces before closing tags
    sanitized = sanitized.replace(/\s+(<\/[^>]+>)/g, '$1');

    // Remove trailing spaces at the very end
    sanitized = sanitized.replace(/\s+$/, '');

    // Remove leading spaces at the very beginning
    sanitized = sanitized.replace(/^\s+/, '');

    return sanitized;
  };

  const createNoteObject = (): Note => ({
    id: note?.id || new Date().toISOString(),
    title: title || 'Untitled Note',
    content: sanitizeContent(contentRef.current?.innerHTML || ''),
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
      // Clear any existing timeout
      if (recognitionTimeoutRef.current) {
        clearTimeout(recognitionTimeoutRef.current);
      }

      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' ';
        }
      }

      if (finalTranscript && contentRef.current) {
        contentRef.current.focus();
        document.execCommand('insertText', false, finalTranscript);
        handleContentInput();
      }

      // Restart recognition after a pause
      recognitionTimeoutRef.current = setTimeout(() => {
        if (isListening && recognition) {
          try {
            recognition.stop();
            setTimeout(() => {
              if (isListening) {
                recognition.start();
              }
            }, 100);
          } catch (error) {
            console.log('Recognition restart error:', error);
          }
        }
      }, 1000);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'no-speech' || event.error === 'audio-capture') {
        // Don't show alert for these common errors, just restart
        if (isListening) {
          setTimeout(() => {
            try {
              if (recognition && isListening) {
                recognition.start();
              }
            } catch (error) {
              console.log('Restart error:', error);
            }
          }, 100);
        }
      } else if (event.error !== 'aborted') {
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      // Auto-restart if still listening
      if (isListening) {
        setTimeout(() => {
          try {
            if (recognition && isListening) {
              recognition.start();
            }
          } catch (error) {
            console.log('Auto-restart error:', error);
          }
        }, 100);
      }
    };

    return () => {
      if (recognitionTimeoutRef.current) {
        clearTimeout(recognitionTimeoutRef.current);
      }
      if (recognition && isListening) {
        try {
          recognition.stop();
        } catch (error) {
          console.log('Cleanup error:', error);
        }
      }
    };
  }, [isListening]);

  const startListening = async (lang: string) => {
    if (!recognition) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    const hasPermission = await requestAudioPermissions();
    if (!hasPermission) {
      alert('Microphone permission denied. Please enable it in settings.');
      return;
    }

    setIsLanguageModalOpen(false);

    // Stop if already listening
    if (isListening) {
      try {
        recognition.stop();
      } catch (error) {
        console.log('Stop error:', error);
      }
    }

    recognition.lang = lang;

    try {
      setIsListening(true);
      recognition.start();
    } catch (error) {
      console.error('Failed to start listening:', error);
      alert('Failed to start speech recognition');
      setIsListening(false);
    }
  };

  const stopListening = () => {
    setIsListening(false);
    if (recognitionTimeoutRef.current) {
      clearTimeout(recognitionTimeoutRef.current);
    }
    if (recognition) {
      try {
        recognition.stop();
      } catch (error) {
        console.log('Stop error:', error);
      }
    }
  };

  const handleSave = () => {
    // Unregister back handler before saving to allow navigation
    registerBackHandler(null);
    onSave(createNoteObject());
  };
  const handleDeleteConfirm = () => {
    // Unregister back handler before deleting to allow navigation
    registerBackHandler(null);
    if (note) onDelete(note.id);
    setIsDeleteModalOpen(false);
  };

  const handleBackPress = () => {
    if (noteHasChanged()) setIsUnsavedChangesModalOpen(true);
    else onBack();
  };

  const handleDiscard = () => {
    // Unregister back handler before discarding to allow navigation
    registerBackHandler(null);
    setIsUnsavedChangesModalOpen(false);
    onBack();
  };

  const handleTextToSpeech = async () => {
    try {
      if (isSpeaking) {
        // Stop speaking
        await TextToSpeech.stop();
        setIsSpeaking(false);
      } else {
        // Get text to speak - combine title and content
        const textContent = contentRef.current?.innerText || '';
        const textToSpeak = (title || 'Untitled Note') + '. ' + textContent;

        if (!textToSpeak.trim() || textToSpeak.trim() === '.') {
          alert('No content to read. Please add a title or description first.');
          return;
        }

        setIsSpeaking(true);

        await TextToSpeech.speak({
          text: textToSpeak,
          lang: 'en-US',
          rate: 1.0,
          pitch: 1.0,
          volume: 1.0,
          category: 'ambient',
        });

        // Speech finished
        setIsSpeaking(false);
      }
    } catch (error) {
      console.error('Text-to-Speech error:', error);
      setIsSpeaking(false);
      // Fallback to Web Speech API if native TTS fails
      if ('speechSynthesis' in window) {
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.cancel();
        } else {
          const textContent = contentRef.current?.innerText || '';
          const textToSpeak = (title || 'Untitled Note') + '. ' + textContent;
          const utterance = new SpeechSynthesisUtterance(textToSpeak);
          utterance.onend = () => setIsSpeaking(false);
          utterance.onerror = () => setIsSpeaking(false);
          window.speechSynthesis.speak(utterance);
          setIsSpeaking(true);
        }
      }
    }
  };

  const handleRecordVoice = async () => {
    if (isRecording) {
      try {
        const result = await VoiceRecorder.stopRecording();
        if (result.value && result.value.recordDataBase64) {
          const audioSrc = `data:audio/aac;base64,${result.value.recordDataBase64}`;
          setMedia(prev => [...prev, { id: new Date().toISOString(), type: 'audio', src: audioSrc }]);
        }
      } catch (error) {
        console.error("Error stopping recording:", error);
        alert("Failed to stop recording");
      }
      setIsRecording(false);
    } else {
      const hasPermission = await requestAudioPermissions();
      if (!hasPermission) {
        alert("Microphone permission is required to record audio.");
        return;
      }

      try {
        await VoiceRecorder.startRecording();
        setIsRecording(true);
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
    } catch (error: any) {
      // Check if user cancelled the operation - don't show error in this case
      const errorMessage = error?.message?.toLowerCase() || '';
      const isCancelled =
        errorMessage.includes('cancel') ||
        errorMessage.includes('user denied') ||
        errorMessage.includes('no image') ||
        errorMessage.includes('user cancelled') ||
        errorMessage.includes('dismissed') ||
        error?.code === 'RESULT_CANCELED' ||
        error === 'User cancelled photos app' ||
        error === 'No image picked';

      if (!isCancelled) {
        console.error('Error taking picture:', error);
        alert('Failed to capture image. Please check camera permissions.');
      }
    }
    setIsImageChoiceModalOpen(false);
  };

  const handleDeleteMedia = (mediaId: string) => setMedia(prev => prev.filter(m => m.id !== mediaId));

  const handleFontSizeSelect = (size: number) => {
    document.execCommand('fontSize', false, size.toString());
    contentRef.current?.focus();
    setIsFontSizeModalOpen(false);
  };

  const ToolbarButton: React.FC<{ onClick: () => void; icon: string; label: string; isActive?: boolean; }> = ({ onClick, icon, label, isActive }) => (
    <button onClick={onClick} className={`flex flex-col items-center justify-center p-2 text-xs w-16 h-16 transition-colors duration-200 focus:outline-none ${isActive ? 'text-accent' : 'text-slate-600 dark:text-text-secondary hover:text-slate-900 dark:hover:text-text-primary'}`} aria-label={label}>
      <Icon name={icon} className="w-5 h-5 mb-1" /> <span>{label}</span>
    </button>
  );

  const imageMedia = media.filter(m => m.type === 'image');
  const audioMedia = media.filter(m => m.type === 'audio');

  // Toolbar height for content padding - only needed when keyboard is visible
  const toolbarHeight = 88; // character count bar (~24px) + toolbar (~64px)
  // Reserve space at bottom for toolbar position (when keyboard is hidden)
  const reservedBottomSpace = toolbarHeight;

  return (
    <div
      ref={containerRef}
      className="h-full flex flex-col bg-white dark:bg-primary text-slate-900 dark:text-text-primary overflow-hidden"
    >
      {/* Header - Editor toolbar */}
      <header className="flex-shrink-0 p-3 flex justify-between items-center border-b border-slate-200 dark:border-border-color bg-white dark:bg-primary z-20">
        <button onClick={handleBackPress} className="p-2 -ml-2 flex items-center gap-1 text-slate-600 dark:text-text-secondary hover:text-slate-900 dark:hover:text-text-primary">
          <Icon name="back" />
          <span className="text-sm font-medium">Back</span>
        </button>
        <div className="flex items-center gap-2">
          <button onClick={handleTextToSpeech} className="p-2"><Icon name={isSpeaking ? 'stop' : 'tts'} /></button>
          <button onClick={() => setIsReminderModalOpen(true)} className={`p-2 ${reminder ? 'text-accent' : ''}`}>
            <Icon name={reminder ? 'reminder-active' : 'reminder'} />
          </button>
          {note && <button onClick={() => setIsDeleteModalOpen(true)} className="p-2 text-red-500 hover:text-red-400"><Icon name="trash" /></button>}
          <button onClick={handleSave} className="bg-accent text-white px-4 py-1.5 rounded-full font-semibold text-sm">Done</button>
        </div>
      </header>

      {/* Main Content Area - Full height layout with reserved space for toolbar at bottom */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-3 flex flex-col gap-3 h-full">
            {/* Title Input */}
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              className="bg-transparent text-xl font-bold placeholder-slate-400 dark:placeholder-text-secondary focus:outline-none flex-shrink-0 p-3 border border-slate-200 dark:border-border-color rounded-lg"
            />

            {/* Content Editor - Full height, fills available space */}
            <div
              className="relative border border-slate-200 dark:border-border-color rounded-lg overflow-hidden flex flex-col flex-1"
              style={{ minHeight: '200px' }}
            >
              <div
                ref={contentRef}
                contentEditable
                onInput={handleContentInput}
                className="bg-transparent text-slate-800 dark:text-text-primary focus:outline-none w-full flex-1 p-3 overflow-y-auto"
                style={{ wordWrap: 'break-word', overflowWrap: 'break-word', minHeight: '100%' }}
              />
              {!content.replace(/<[^>]*>?/gm, ' ').trim() && (
                <div
                  className="absolute top-0 left-0 right-0 p-3 text-slate-400 dark:text-text-secondary pointer-events-none"
                  aria-hidden="true"
                >
                  Start writing here...
                </div>
              )}
            </div>

            {/* Image Media Grid */}
            {imageMedia.length > 0 && (
              <div className="flex-shrink-0">
                <div className="grid grid-cols-3 gap-2">
                  {imageMedia.map(item => (
                    <div key={item.id} className="relative aspect-square">
                      {/* Image - clickable to open preview */}
                      <img
                        src={item.src}
                        alt="attachment"
                        className="rounded-lg w-full h-full object-cover cursor-pointer"
                        onClick={() => setSelectedImage(item)}
                      />
                      {/* Delete button - always visible */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteMedia(item.id);
                        }}
                        className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-lg z-10"
                        aria-label="Remove image"
                      >
                        <Icon name="plus" className="w-4 h-4 transform rotate-45" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Audio Media List */}
            {audioMedia.length > 0 && (
              <div className="flex-shrink-0 space-y-2">
                {audioMedia.map(item => (
                  <div key={item.id} className="relative group flex items-center gap-2 bg-slate-100 dark:bg-secondary p-2 rounded-lg">
                    <audio controls src={item.src} className="w-full h-8" />
                    <button onClick={() => handleDeleteMedia(item.id)} className="flex-shrink-0 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Remove media"><Icon name="plus" className="w-3 h-3 transform rotate-45" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Reserved space for toolbar when keyboard is hidden - this keeps layout consistent */}
        <div
          className="flex-shrink-0 bg-white dark:bg-primary"
          style={{ height: `${reservedBottomSpace}px` }}
        />
      </div>

      {/* Bottom Toolbar - Fixed position, attached to keyboard when visible */}
      <div
        className="fixed left-0 right-0 bottom-0 bg-white dark:bg-primary border-t border-slate-200 dark:border-border-color z-50"
        style={{
          transform: `translateY(-${toolbarBottom}px)`,
          willChange: 'transform'
        }}
      >
        {/* Character Count */}
        <div className="w-full text-right text-xs font-medium text-slate-500 dark:text-text-secondary px-3 py-1 border-b border-slate-200 dark:border-border-color">
          Characters: {characterCount}
        </div>

        {/* Formatting Toolbar */}
        <footer className="w-full bg-slate-100 dark:bg-secondary">
          <div className="max-w-full mx-auto h-16 flex justify-around items-center px-2 overflow-x-auto">
            <div className="flex justify-around items-center min-w-max gap-1">
              <ToolbarButton onClick={() => handleStyleClick('bold')} icon="bold" label="Bold" isActive={activeStyles.has('bold')} />
              <ToolbarButton onClick={() => handleStyleClick('italic')} icon="italic" label="Italic" isActive={activeStyles.has('italic')} />
              <ToolbarButton onClick={() => handleStyleClick('underline')} icon="underline" label="Underline" isActive={activeStyles.has('underline')} />
              <ToolbarButton onClick={handleAlignmentClick} icon={alignmentIconMap[alignment]} label="Align" />
              <ToolbarButton onClick={() => setIsFontSizeModalOpen(true)} icon="fontSize" label="Size" />
              <div className="w-px h-10 bg-slate-300 dark:bg-border-color"></div>
              <ToolbarButton onClick={() => setIsImageChoiceModalOpen(true)} icon="image" label="Image" />
              <ToolbarButton onClick={isListening ? stopListening : () => setIsLanguageModalOpen(true)} icon="like" label="Speak" isActive={isListening} />
              <ToolbarButton onClick={handleRecordVoice} icon="mic" label="Record" isActive={isRecording} />
            </div>
          </div>
        </footer>
      </div>

      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Delete Note?">
        <p className="text-slate-600 dark:text-text-secondary mb-6">This action is permanent and cannot be undone.</p>
        <div className="flex justify-center gap-4">
          <button onClick={() => setIsDeleteModalOpen(false)} className="px-6 py-2 rounded-full bg-slate-200 dark:bg-border-color text-slate-800 dark:text-text-primary font-semibold">Cancel</button>
          <button onClick={handleDeleteConfirm} className="px-6 py-2 rounded-full bg-red-600 text-white font-semibold">Delete</button>
        </div>
      </Modal>
      <Modal isOpen={isLanguageModalOpen} onClose={() => setIsLanguageModalOpen(false)} title="Select Language">
        <LanguageSelectionModal onSelect={startListening} onClose={() => setIsLanguageModalOpen(false)} />
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
          <button onClick={handleDiscard} className="px-5 py-2 rounded-full font-semibold text-red-500 hover:bg-red-500/10">Discard</button>
          <button onClick={() => { setIsUnsavedChangesModalOpen(false); handleSave(); }} className="px-5 py-2 rounded-full bg-accent text-white font-semibold">Save</button>
        </div>
      </Modal>

      {/* Image Preview Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white p-2 bg-black/50 rounded-full"
            onClick={() => setSelectedImage(null)}
          >
            <Icon name="plus" className="w-6 h-6 transform rotate-45" />
          </button>
          <img
            src={selectedImage.src}
            alt="Preview"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

    </div>
  );
};

export default NoteEditorScreen;