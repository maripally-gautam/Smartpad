import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Note, MediaAttachment, Reminder } from '../types';
import Icon from '../components/Icon';
import Modal from '../components/Modal';
import { useAppContext } from '../context/AppContext';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { VoiceRecorder } from 'capacitor-voice-recorder';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { Keyboard } from '@capacitor/keyboard';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { Capacitor } from '@capacitor/core';

// -- MODAL COMPONENTS -- //

const LanguageSelectionModal: React.FC<{ onSelect: (lang: string) => void, onClose: () => void }> = ({ onSelect, onClose }) => (
  <div className="space-y-2">
    <button onClick={() => onSelect('en-US')} className="w-full text-left p-3 rounded-lg active:bg-slate-100 dark:active:bg-border-color transition-colors text-white">English</button>
    <button onClick={() => onSelect('hi-IN')} className="w-full text-left p-3 rounded-lg active:bg-slate-100 dark:active:bg-border-color transition-colors text-white">Hindi</button>
    <button onClick={() => onSelect('te-IN')} className="w-full text-left p-3 rounded-lg active:bg-slate-100 dark:active:bg-border-color transition-colors text-white">Telugu</button>
  </div>
);

const ReminderModal: React.FC<{
  reminder: Reminder | undefined,
  onSave: (reminder: Reminder) => void,
  onDelete: () => void,
  onClose: () => void,
  allowNotifications: boolean
}> = ({ reminder, onSave, onDelete, onClose, allowNotifications }) => {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [repeat, setRepeat] = useState<Reminder['repeat']>('none');
  const [customDays, setCustomDays] = useState(0);
  const [customMinutes, setCustomMinutes] = useState(30);
  const [markAsCompleted, setMarkAsCompleted] = useState(false);
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (reminder) {
      const d = new Date(reminder.time);
      setDate(d.toISOString().split('T')[0]);
      setTime(d.toTimeString().substring(0, 5));
      setRepeat(reminder.repeat);
      setMarkAsCompleted(reminder.markAsCompleted || false);
      if (reminder.repeat === 'custom') {
        setCustomDays(reminder.customDays || 0);
        setCustomMinutes(reminder.customMinutes || 30);
      }
    } else {
      // Set to current time + 2 minutes for new reminders
      const d = new Date();
      d.setMinutes(d.getMinutes() + 2);
      setDate(d.toISOString().split('T')[0]);
      setTime(d.toTimeString().substring(0, 5));
      setRepeat('none');
      setCustomDays(0);
      setCustomMinutes(30);
      setMarkAsCompleted(false);
    }
  }, [reminder]);

  // Validate custom interval - minimum 5 minutes when days is 0
  const isValidInterval = customDays > 0 || customMinutes >= 5;

  // Check if the save button should be disabled
  const isSaveDisabled = repeat === 'custom' && !isValidInterval;

  const handleSave = () => {
    // Validate custom repeat interval
    if (repeat === 'custom' && customDays === 0 && customMinutes < 5) {
      setValidationError('Minimum repeat interval is 5 minutes');
      return;
    }

    const [year, month, day] = date.split('-').map(Number);
    const [hours, minutes] = time.split(':').map(Number);
    const reminderDate = new Date(year, month - 1, day, hours, minutes);

    const newReminder: Reminder = {
      time: reminderDate.toISOString(),
      repeat,
      markAsCompleted,
    };

    if (repeat === 'custom') {
      newReminder.customDays = customDays >= 0 ? customDays : 0;
      newReminder.customMinutes = customMinutes;
    }

    onSave(newReminder);
    onClose();
  };

  const handleDeleteAndClose = () => {
    onDelete();
    onClose();
  };

  // Update validation error when values change
  useEffect(() => {
    if (repeat === 'custom' && customDays === 0 && customMinutes < 5) {
      setValidationError('Minimum repeat interval is 5 minutes');
    } else {
      setValidationError('');
    }
  }, [repeat, customDays, customMinutes]);

  // Handle custom minutes change - allow any value but show warning
  const handleCustomMinutesChange = (value: string) => {
    const num = parseInt(value, 10) || 0;
    setCustomMinutes(Math.max(0, num));
  };

  return (
    <div className="space-y-4">
      {/* Notifications disabled warning */}
      {!allowNotifications && (
        <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <Icon name="bell" className="w-5 h-5 text-amber-500" />
          <p className="text-sm text-amber-600 dark:text-amber-400">
            Notifications are turned off. Enable them in Settings to receive reminders.
          </p>
        </div>
      )}
      <div className="flex gap-4">
        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-slate-100 dark:bg-border-color p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent" />
        <input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full bg-slate-100 dark:bg-border-color p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent" />
      </div>
      <select value={repeat} onChange={e => setRepeat(e.target.value as any)} className="w-full bg-slate-100 dark:bg-border-color p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent">
        <option value="none">Does not repeat</option>
        <option value="hourly">Hourly</option>
        <option value="daily">Daily</option>
        <option value="weekly">Weekly</option>
        <option value="monthly">Monthly</option>
        <option value="yearly">Yearly</option>
        <option value="custom">Custom</option>
      </select>
      {repeat === 'custom' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-600 dark:text-text-secondary">Repeat every</span>
            <input
              type="number"
              value={customDays}
              onChange={e => setCustomDays(Math.max(0, parseInt(e.target.value, 10) || 0))}
              className="w-16 bg-slate-100 dark:bg-border-color p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-center"
              min="0"
            />
            <span className="text-slate-600 dark:text-text-secondary">days</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-600 dark:text-text-secondary">and</span>
            <input
              type="number"
              value={customMinutes}
              onChange={e => handleCustomMinutesChange(e.target.value)}
              className={`w-16 bg-slate-100 dark:bg-border-color p-2 rounded-lg focus:outline-none focus:ring-2 text-center ${customDays === 0 && customMinutes < 5 ? 'ring-2 ring-red-400 focus:ring-red-400' : 'focus:ring-accent'
                }`}
              min="0"
            />
            <span className="text-slate-600 dark:text-text-secondary">minutes</span>
          </div>
          {validationError && (
            <p className="text-sm text-red-500 font-medium">{validationError}</p>
          )}
        </div>
      )}
      {/* Mark as completed checkbox - only show for non-repeating reminders */}
      {repeat === 'none' && (
        <label className="flex items-center gap-3 p-2 cursor-pointer">
          <input
            type="checkbox"
            checked={markAsCompleted}
            onChange={e => setMarkAsCompleted(e.target.checked)}
            className="w-5 h-5 rounded border-2 border-slate-400 dark:border-text-secondary accent-accent"
          />
          <span className="text-slate-700 dark:text-text-primary">Mark as completed after notification</span>
        </label>
      )}
      <div className="flex justify-between items-center pt-4">
        {reminder && <button onClick={handleDeleteAndClose} className="text-red-500 font-semibold">Delete</button>}
        <div className="flex gap-2 ml-auto">
          <button onClick={onClose} className="px-4 py-2 rounded-full font-semibold text-slate-600 dark:text-text-secondary">Cancel</button>
          <button
            onClick={handleSave}
            disabled={isSaveDisabled}
            className={`px-4 py-2 rounded-full font-semibold transition-all ${isSaveDisabled
              ? 'bg-slate-300 dark:bg-slate-600 text-slate-500 dark:text-slate-400 cursor-not-allowed'
              : 'bg-accent text-white active:scale-95'
              }`}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

const ImageChoiceModal: React.FC<{ onClose: () => void; onTakePhoto: () => void; onChooseGallery: () => void; }> = ({ onClose, onTakePhoto, onChooseGallery }) => (
  <div className="space-y-2">
    <button onClick={onTakePhoto} className="w-full text-left p-3 rounded-lg active:bg-slate-100 dark:active:bg-border-color transition-colors flex items-center text-white">
      <Icon name="camera" className="w-5 h-5 mr-3" /> Take Photo
    </button>
    <button onClick={onChooseGallery} className="w-full text-left p-3 rounded-lg active:bg-slate-100 dark:active:bg-border-color transition-colors flex items-center text-white">
      <Icon name="image" className="w-5 h-5 mr-3" /> Choose from Gallery
    </button>
  </div>
);

const FontSizeModal: React.FC<{ onSelect: (size: number) => void; }> = ({ onSelect }) => (
  <div className="flex justify-around items-center p-2">
    <button onClick={() => onSelect(2)} className="px-4 py-2 text-sm rounded-lg active:bg-slate-100 dark:active:bg-border-color transition-colors text-white">Small</button>
    <button onClick={() => onSelect(3)} className="px-4 py-2 text-base rounded-lg active:bg-slate-100 dark:active:bg-border-color transition-colors text-white">Normal</button>
    <button onClick={() => onSelect(5)} className="px-4 py-2 text-lg rounded-lg active:bg-slate-100 dark:active:bg-border-color transition-colors text-white">Large</button>
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
  executePendingNavigation?: () => void;
}

// Web Speech API for browser fallback
const WebSpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
const webRecognition = WebSpeechRecognition ? new WebSpeechRecognition() : null;

if (webRecognition) {
  webRecognition.continuous = true;
  webRecognition.interimResults = false;
  webRecognition.maxAlternatives = 1;
}

// Check if we should use native speech recognition
const useNativeSpeechRecognition = Capacitor.isNativePlatform();

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

const getCommonPrefixLength = (a: string, b: string) => {
  const max = Math.min(a.length, b.length);
  let idx = 0;
  while (idx < max && a[idx] === b[idx]) {
    idx += 1;
  }
  return idx;
};

const NoteEditorScreen: React.FC<NoteEditorScreenProps> = ({ note, onSave, onUpdateNote, onBack, onDelete, registerBackHandler, executePendingNavigation }) => {
  const { settings } = useAppContext();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [media, setMedia] = useState<MediaAttachment[]>([]);
  const [reminder, setReminder] = useState<Reminder | undefined>(undefined);
  const [characterCount, setCharacterCount] = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<MediaAttachment | null>(null);
  const [hasBeenEdited, setHasBeenEdited] = useState(false); // Track if user made any edits

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
  const shouldKeepListeningRef = useRef<boolean>(false);
  const activeLanguageRef = useRef<string>('en-US');
  const lastNativeTranscriptRef = useRef<string>('');
  const lastWebTranscriptRef = useRef<string>('');
  const nativeRestartTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollableRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const initialWindowHeight = useRef(window.innerHeight);
  const keyboardHeightRef = useRef(0);

  // Keyboard detection - improved timing for smooth toolbar positioning
  useEffect(() => {
    let keyboardShowListener: any;
    let keyboardHideListener: any;
    let keyboardWillShowListener: any;
    let keyboardWillHideListener: any;

    const setupKeyboardListeners = async () => {
      try {
        // Listen to keyboardWillShow for faster response
        keyboardWillShowListener = await Keyboard.addListener('keyboardWillShow', (info) => {
          keyboardHeightRef.current = info.keyboardHeight;
          setKeyboardVisible(true);
        });

        keyboardShowListener = await Keyboard.addListener('keyboardDidShow', (info) => {
          keyboardHeightRef.current = info.keyboardHeight;
          setKeyboardVisible(true);
        });

        keyboardWillHideListener = await Keyboard.addListener('keyboardWillHide', () => {
          setKeyboardVisible(false);
        });

        keyboardHideListener = await Keyboard.addListener('keyboardDidHide', () => {
          keyboardHeightRef.current = 0;
          setKeyboardVisible(false);
        });
      } catch (error) {
        console.log('Capacitor Keyboard not available');
      }
    };

    setupKeyboardListeners();

    return () => {
      if (keyboardWillShowListener) keyboardWillShowListener.remove();
      if (keyboardShowListener) keyboardShowListener.remove();
      if (keyboardWillHideListener) keyboardWillHideListener.remove();
      if (keyboardHideListener) keyboardHideListener.remove();
    };
  }, []);

  // Auto-focus the content area when the component mounts to show keyboard
  useEffect(() => {
    // Wait for layout to stabilize before focusing
    // Use multiple requestAnimationFrame calls to ensure DOM is fully ready
    let rafId: number;
    let timer: NodeJS.Timeout;

    const focusContent = () => {
      rafId = requestAnimationFrame(() => {
        rafId = requestAnimationFrame(() => {
          if (contentRef.current) {
            contentRef.current.focus();
          }
        });
      });
    };

    // Delay to ensure screen transition is complete
    timer = setTimeout(focusContent, 300);

    return () => {
      clearTimeout(timer);
      if (rafId) cancelAnimationFrame(rafId);
    };
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

  // Preload TTS engine for faster first read
  useEffect(() => {
    const preloadTTS = async () => {
      try {
        // Speak empty string to initialize the TTS engine without audible output
        await TextToSpeech.speak({
          text: ' ',
          lang: 'en-US',
          rate: 1.0,
          pitch: 1.0,
          volume: 0, // Silent preload
          category: 'ambient',
        });
      } catch (error) {
        // Fallback: preload Web Speech API
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(' ');
          utterance.volume = 0;
          window.speechSynthesis.speak(utterance);
        }
      }
    };
    // Slight delay to not interfere with initial render
    const timer = setTimeout(preloadTTS, 500);
    return () => clearTimeout(timer);
  }, []);

  // Cleanup TTS and Speech Recognition when component unmounts
  useEffect(() => {
    return () => {
      // Stop TTS when leaving the screen
      TextToSpeech.stop().catch(() => { });
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      // Stop speech recognition when leaving the screen
      shouldKeepListeningRef.current = false;
      if (useNativeSpeechRecognition) {
        SpeechRecognition.stop().catch(() => { });
      } else if (webRecognition) {
        try {
          webRecognition.stop();
        } catch (error) {
          // Ignore errors during cleanup
        }
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
    const currentContentTrimmed = currentContent.trim().replace(/<br\s*\/?>/gi, '');

    if (!initialNoteRef.current) {
      // For new notes: check if there's any content OR if user has made any edits
      const hasContent = title.trim() !== '' || currentContentTrimmed !== '' || media.length > 0;
      // If user edited and then cleared everything, still show the prompt
      return hasContent || hasBeenEdited;
    }

    // For existing notes: compare with initial state
    return initialNoteRef.current.title !== title ||
      initialNoteRef.current.content !== currentContent ||
      JSON.stringify(initialNoteRef.current.media) !== JSON.stringify(media) ||
      JSON.stringify(initialNoteRef.current.reminder) !== JSON.stringify(reminder);
  }, [title, media, reminder, settings.autoSave, hasBeenEdited]);

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

  // Track the last transcript we received to detect duplicates
  const lastTranscriptRef = useRef<string>('');

  // Native speech recognition with partialResults: true for real-time transcription
  // This gives us text as user speaks, not after they stop
  useEffect(() => {
    if (!useNativeSpeechRecognition) return;

    let partialResultsListener: any = null;
    let listeningStateListener: any = null;

    const setupListeners = async () => {
      // Listen for partial results - this fires as user speaks
      partialResultsListener = await SpeechRecognition.addListener(
        'partialResults',
        (data: { matches: string[] }) => {
          if (!data.matches || data.matches.length === 0) return;
          if (!shouldKeepListeningRef.current) return;
          if (!contentRef.current) return;

          const fullTranscript = (data.matches[0] || '').trim();

          // Skip if empty or same as last
          if (!fullTranscript || fullTranscript === lastTranscriptRef.current) return;

          const lastTranscript = lastTranscriptRef.current;

          // Only add text if the new transcript is longer and starts with the old one
          // This ensures we only add NEW characters, never repeat
          if (fullTranscript.length > lastTranscript.length && fullTranscript.startsWith(lastTranscript)) {
            const newText = fullTranscript.slice(lastTranscript.length);

            if (newText) {
              contentRef.current.focus();
              document.execCommand('insertText', false, newText);
              const html = contentRef.current.innerHTML;
              setContent(html);
              setCharacterCount(countCharacters(html));

              // Update tracking
              lastTranscriptRef.current = fullTranscript;
            }
          } else if (lastTranscript === '') {
            // First transcript of the session
            contentRef.current.focus();
            document.execCommand('insertText', false, fullTranscript);
            const html = contentRef.current.innerHTML;
            setContent(html);
            setCharacterCount(countCharacters(html));
            lastTranscriptRef.current = fullTranscript;
          }
          // If transcript got shorter or is completely different, ignore it (it's a correction we don't handle)
        }
      );

      // Listen for state changes - when Android stops due to silence
      // Update UI IMMEDIATELY when state changes - no delays
      listeningStateListener = await SpeechRecognition.addListener(
        'listeningState',
        (state: { status: string }) => {
          // Immediate state update - no async, no delays
          if (state.status === 'stopped') {
            shouldKeepListeningRef.current = false;
            setIsListening(false);
          } else if (state.status === 'started') {
            // Confirm listening started
            setIsListening(true);
          }
        }
      );
    };

    setupListeners();

    return () => {
      if (partialResultsListener) {
        partialResultsListener.remove();
      }
      if (listeningStateListener) {
        listeningStateListener.remove();
      }
    };
  }, []);

  // Ref to track if we should keep listening (for auto-restart)

  // Web Speech API fallback for browser
  useEffect(() => {
    if (useNativeSpeechRecognition || !webRecognition) return;

    webRecognition.onresult = (event: any) => {
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
        const previous = lastWebTranscriptRef.current;
        let addition = finalTranscript;

        if (finalTranscript.startsWith(previous)) {
          addition = finalTranscript.slice(previous.length);
        } else if (previous.startsWith(finalTranscript)) {
          addition = '';
        } else {
          const overlap = getCommonPrefixLength(previous, finalTranscript);
          addition = finalTranscript.slice(overlap);
        }

        if (addition.trim()) {
          contentRef.current.focus();
          document.execCommand('insertText', false, addition);
          const html = contentRef.current.innerHTML;
          setContent(html);
          setCharacterCount(countCharacters(html));
          lastWebTranscriptRef.current = finalTranscript.trim();
        }
      }

      // Restart recognition after a pause
      recognitionTimeoutRef.current = setTimeout(() => {
        if (isListening && webRecognition) {
          try {
            webRecognition.stop();
            setTimeout(() => {
              if (isListening) {
                webRecognition.start();
              }
            }, 100);
          } catch (error) {
            console.log('Recognition restart error:', error);
          }
        }
      }, 1000);
    };

    webRecognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'no-speech' || event.error === 'audio-capture') {
        // Don't show alert for these common errors, just restart
        if (isListening) {
          setTimeout(() => {
            try {
              if (webRecognition && isListening) {
                webRecognition.start();
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

    webRecognition.onend = () => {
      // Auto-restart if still listening
      if (isListening) {
        setTimeout(() => {
          try {
            if (webRecognition && isListening) {
              webRecognition.start();
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
      if (webRecognition && isListening) {
        try {
          webRecognition.stop();
        } catch (error) {
          console.log('Cleanup error:', error);
        }
      }
    };
  }, [isListening]);

  const startListening = async (lang: string) => {
    setIsLanguageModalOpen(false);
    activeLanguageRef.current = lang;    // Request speech recognition permission for native
    if (useNativeSpeechRecognition) {
      try {
        const permissionStatus = await SpeechRecognition.requestPermissions();
        if (permissionStatus.speechRecognition !== 'granted') {
          alert('Speech recognition permission denied. Please enable it in settings.');
          return;
        }

        // Check if speech recognition is available
        const available = await SpeechRecognition.available();
        if (!available.available) {
          alert('Speech recognition is not available on this device.');
          return;
        }

        // Stop if already listening
        if (isListening) {
          shouldKeepListeningRef.current = false;
          await SpeechRecognition.stop();
        }

        // Reset tracking ref for new session
        lastTranscriptRef.current = '';

        // Set flag and UI state BEFORE starting - instant visual feedback
        shouldKeepListeningRef.current = true;
        setIsListening(true);

        // Start with partialResults: true for real-time transcription
        await SpeechRecognition.start({
          language: lang,
          partialResults: true,
          popup: false,
          maxResults: 1,
        });
      } catch (error) {
        console.error('Failed to start native speech recognition:', error);
        alert('Failed to start speech recognition');
        setIsListening(false);
      }
    } else {
      // Fallback to Web Speech API for browser
      if (!webRecognition) {
        alert('Speech recognition is not supported in this browser.');
        return;
      }

      const hasPermission = await requestAudioPermissions();
      if (!hasPermission) {
        alert('Microphone permission denied. Please enable it in settings.');
        return;
      }

      // Stop if already listening
      if (isListening) {
        try {
          webRecognition.stop();
        } catch (error) {
          console.log('Stop error:', error);
        }
      }

      webRecognition.lang = lang;
      lastWebTranscriptRef.current = '';

      try {
        setIsListening(true);
        webRecognition.start();
      } catch (error) {
        console.error('Failed to start listening:', error);
        alert('Failed to start speech recognition');
        setIsListening(false);
      }
    }
  };

  const stopListening = async () => {
    // Set state IMMEDIATELY - instant visual feedback
    setIsListening(false);
    shouldKeepListeningRef.current = false;
    lastNativeTranscriptRef.current = '';
    lastWebTranscriptRef.current = '';
    lastTranscriptRef.current = '';

    if (recognitionTimeoutRef.current) {
      clearTimeout(recognitionTimeoutRef.current);
    }

    if (useNativeSpeechRecognition) {
      try {
        await SpeechRecognition.stop();
      } catch (error) {
        console.log('Native stop error:', error);
      }
    } else if (webRecognition) {
      try {
        webRecognition.stop();
      } catch (error) {
        console.log('Stop error:', error);
      }
    }
  };

  const handleSave = () => {
    // Stop any active listening/recording before navigating
    if (isListening) stopListening();
    // Unregister back handler before saving to allow navigation
    registerBackHandler(null);
    onSave(createNoteObject());
  };

  // Save and navigate to pending target (used by unsaved changes modal)
  const handleSaveAndNavigate = () => {
    // Stop any active listening/recording before navigating
    if (isListening) stopListening();
    // Unregister back handler before saving to allow navigation
    registerBackHandler(null);
    setIsUnsavedChangesModalOpen(false);

    // First save the note
    const noteToSave = createNoteObject();
    onUpdateNote(noteToSave);

    // Then navigate to pending target or go back
    if (executePendingNavigation) {
      executePendingNavigation();
    } else {
      onBack();
    }
  };
  const handleDeleteConfirm = () => {
    // Stop any active listening/recording before navigating
    if (isListening) stopListening();
    // Unregister back handler before deleting to allow navigation
    registerBackHandler(null);
    if (note) onDelete(note.id);
    setIsDeleteModalOpen(false);
  };

  const handleBackPress = () => {
    if (noteHasChanged()) setIsUnsavedChangesModalOpen(true);
    else {
      // Stop any active listening before navigating
      if (isListening) stopListening();
      onBack();
    }
  };

  const handleDiscard = () => {
    // Stop any active listening before discarding
    if (isListening) stopListening();
    // Unregister back handler before discarding to allow navigation
    registerBackHandler(null);
    setIsUnsavedChangesModalOpen(false);
    // Navigate to pending target or just go back
    if (executePendingNavigation) {
      executePendingNavigation();
    } else {
      onBack();
    }
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
    // Mark as edited when user types
    if (!hasBeenEdited) {
      setHasBeenEdited(true);
    }
  };

  const handleStyleClick = (command: string) => {
    // Prevent keyboard from hiding
    document.execCommand(command, false);
    // Don't blur - keep focus on content area
    updateToolbarState();
  };

  const handleAlignmentClick = () => {
    const alignments: Alignment[] = ['justify', 'left', 'right', 'center'];
    const nextAlignment = alignments[(alignments.indexOf(alignment) + 1) % alignments.length];
    const commandMap = { justify: 'justifyFull', left: 'justifyLeft', right: 'justifyRight', center: 'justifyCenter' };
    document.execCommand(commandMap[nextAlignment], false);
    // Don't call focus to prevent keyboard toggle
    setAlignment(nextAlignment);
  };
  const alignmentIconMap: { [key in Alignment]: string } = { justify: 'list', left: 'alignLeft', center: 'alignCenter', right: 'alignRight' };

  const takePicture = async (source: CameraSource) => {
    // Close modal first
    setIsImageChoiceModalOpen(false);

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
  };

  const handleDeleteMedia = (mediaId: string) => setMedia(prev => prev.filter(m => m.id !== mediaId));

  const handleFontSizeSelect = (size: number) => {
    document.execCommand('fontSize', false, size.toString());
    // Don't refocus to prevent keyboard toggle
    setIsFontSizeModalOpen(false);
  };

  const ToolbarButton: React.FC<{ onClick: () => void; icon: string; label: string; isActive?: boolean; }> = ({ onClick, icon, label, isActive }) => (
    <button onClick={onClick} className={`flex flex-col items-center justify-center p-2 text-xs w-16 h-16 transition-colors duration-75 focus:outline-none ${isActive ? 'text-accent' : 'text-white'}`} aria-label={label}>
      <Icon name={icon} className="w-5 h-5 mb-1" /> <span>{label}</span>
    </button>
  );

  // Simple tap handler for speech-to-text button
  const handleSpeechButtonClick = () => {
    if (isListening) {
      stopListening();
    } else {
      setIsLanguageModalOpen(true);
    }
  };

  const imageMedia = media.filter(m => m.type === 'image');
  const audioMedia = media.filter(m => m.type === 'audio');

  // Toolbar height for content padding
  const toolbarHeight = 88; // character count bar (~24px) + toolbar (~64px)

  return (
    <div
      ref={containerRef}
      className="h-full flex flex-col bg-white dark:bg-primary text-slate-900 dark:text-text-primary overflow-hidden"
    >
      {/* Header - Editor toolbar */}
      <header className="flex-shrink-0 p-3 flex justify-between items-center border-b border-slate-200 dark:border-border-color bg-white dark:bg-primary z-20">
        <button onClick={handleBackPress} className="p-2 -ml-2 flex items-center gap-1 text-white">
          <Icon name="back" />
          <span className="text-sm font-medium">Back</span>
        </button>
        <div className="flex items-center gap-2">
          {/* Speech-to-Text button - WhatsApp style circular mic button */}
          <button
            onClick={handleSpeechButtonClick}
            className="relative flex items-center justify-center w-10 h-10"
          >
            {/* Pulse rings - only render when listening, instant sync */}
            <span
              className={`absolute inset-0 rounded-full bg-accent transition-opacity duration-100 ${isListening ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
              style={{
                animation: isListening ? 'pulse-ring 1s ease-out infinite' : 'none',
                transform: 'scale(1)'
              }}
            />
            <span
              className={`absolute inset-0 rounded-full bg-accent transition-opacity duration-100 ${isListening ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
              style={{
                animation: isListening ? 'pulse-ring 1s ease-out infinite 0.3s' : 'none',
                transform: 'scale(1)'
              }}
            />
            {/* Main circular button - always visible */}
            <div className="relative w-10 h-10 rounded-full bg-accent flex items-center justify-center z-10">
              <Icon name="mic" className="w-5 h-5 text-white" />
            </div>
          </button>
          <button onClick={() => setIsReminderModalOpen(true)} className={`p-2 ${reminder ? 'text-accent' : ''}`}>
            <Icon name={reminder ? 'reminder-active' : 'reminder'} />
          </button>
          {note && <button onClick={() => setIsDeleteModalOpen(true)} className="p-2 text-red-500"><Icon name="trash" /></button>}
          <button onClick={handleSave} className="bg-accent text-white px-4 py-1.5 rounded-full font-semibold text-sm">Done</button>
        </div>
      </header>

      {/* Main Content Area - Single scrollbar for entire page */}
      <div
        ref={scrollableRef}
        className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin"
        style={{ paddingBottom: `${toolbarHeight}px` }}
      >
        <div className="p-3 flex flex-col gap-3 min-h-full">
          {/* Title Input */}
          <input
            type="text"
            value={title}
            onChange={(e) => { setTitle(e.target.value); if (!hasBeenEdited) setHasBeenEdited(true); }}
            placeholder="Title"
            className="bg-transparent text-xl font-bold placeholder-slate-400 dark:placeholder-text-secondary focus:outline-none flex-shrink-0 p-3 border border-slate-200 dark:border-border-color rounded-lg text-white"
          />

          {/* Content Editor - grows to fill space */}
          <div
            className="relative border border-slate-200 dark:border-border-color rounded-lg flex-1"
            style={{ minHeight: '200px' }}
          >
            <div
              ref={contentRef}
              contentEditable
              onInput={handleContentInput}
              className="bg-transparent text-white focus:outline-none w-full h-full p-3"
              style={{ wordWrap: 'break-word', overflowWrap: 'break-word', minHeight: '200px' }}
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

          {/* Media Section */}
          {(imageMedia.length > 0 || audioMedia.length > 0) && (
            <div className="flex-shrink-0">
              {/* Image Media Grid */}
              {imageMedia.length > 0 && (
                <div className="mb-2">
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
                <div className="space-y-2">
                  {audioMedia.map(item => (
                    <div key={item.id} className="relative flex items-center gap-2 bg-slate-100 dark:bg-secondary p-2 rounded-lg">
                      <audio controls src={item.src} className="w-full h-8" />
                      <button onClick={() => handleDeleteMedia(item.id)} className="flex-shrink-0 bg-red-600 text-white rounded-full p-1.5" aria-label="Remove media"><Icon name="plus" className="w-3 h-3 transform rotate-45" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Toolbar - Fixed at bottom of visible area */}
      <div
        ref={toolbarRef}
        className="fixed left-0 right-0 bottom-0 bg-white dark:bg-primary border-t border-slate-200 dark:border-border-color z-50"
        onTouchStart={(e) => e.stopPropagation()}
        onTouchMove={(e) => {
          // Only prevent default if trying to scroll vertically on toolbar
          e.stopPropagation();
        }}
      >
        {/* Character Count */}
        <div className="w-full text-right text-xs font-medium text-slate-500 dark:text-text-secondary px-3 py-1 border-b border-slate-200 dark:border-border-color">
          Characters: {characterCount}
        </div>

        {/* Formatting Toolbar */}
        <footer className="w-full bg-slate-100 dark:bg-secondary">
          <div className="max-w-full mx-auto h-14 flex items-center px-2 overflow-x-auto overflow-y-hidden overscroll-contain scrollbar-thin" style={{ touchAction: 'pan-x', scrollbarWidth: 'thin', WebkitOverflowScrolling: 'touch' }}>
            <div className="flex items-center min-w-max gap-1">
              <ToolbarButton onClick={() => handleStyleClick('bold')} icon="bold" label="Bold" isActive={activeStyles.has('bold')} />
              <ToolbarButton onClick={() => handleStyleClick('italic')} icon="italic" label="Italic" isActive={activeStyles.has('italic')} />
              <ToolbarButton onClick={() => handleStyleClick('underline')} icon="underline" label="Underline" isActive={activeStyles.has('underline')} />
              <ToolbarButton onClick={handleAlignmentClick} icon={alignmentIconMap[alignment]} label="Align" />
              <ToolbarButton onClick={() => setIsFontSizeModalOpen(true)} icon="fontSize" label="Size" />
              <div className="w-px h-10 bg-slate-300 dark:bg-border-color"></div>
              <ToolbarButton onClick={() => setIsImageChoiceModalOpen(true)} icon="image" label="Image" />
              <ToolbarButton onClick={handleTextToSpeech} icon={isSpeaking ? 'stop' : 'tts'} label={isSpeaking ? 'Stop' : 'Read'} isActive={isSpeaking} />
              <ToolbarButton onClick={handleRecordVoice} icon="mic" label={isRecording ? 'Recording...' : 'Record'} isActive={isRecording} />
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
        <ReminderModal reminder={reminder} onSave={setReminder} onDelete={() => setReminder(undefined)} onClose={() => setIsReminderModalOpen(false)} allowNotifications={settings.allowNotifications} />
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
        <p className="text-white/60 mb-6">You have unsaved changes. Do you want to save them?</p>
        <div className="flex justify-end gap-2">
          <button onClick={() => setIsUnsavedChangesModalOpen(false)} className="px-5 py-2 rounded-full font-semibold text-white">Cancel</button>
          <button onClick={handleDiscard} className="px-5 py-2 rounded-full font-semibold text-red-500 active:bg-red-500/10">Discard</button>
          <button onClick={handleSaveAndNavigate} className="px-5 py-2 rounded-full bg-accent text-white font-semibold active:scale-95">Save</button>
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