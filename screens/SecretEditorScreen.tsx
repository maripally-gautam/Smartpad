import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SecretNote, MediaAttachment } from '../types';
import Icon from '../components/Icon';
import Modal from '../components/Modal';
import { useAppContext } from '../context/AppContext';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { VoiceRecorder } from 'capacitor-voice-recorder';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { Keyboard } from '@capacitor/keyboard';
import { Capacitor } from '@capacitor/core';

// -- MODAL COMPONENTS -- //

const ImageChoiceModal: React.FC<{ onClose: () => void; onTakePhoto: () => void; onChooseGallery: () => void; }> = ({ onClose, onTakePhoto, onChooseGallery }) => (
    <div className="space-y-2">
        <button onClick={onTakePhoto} className="w-full text-left p-3 rounded-lg active:bg-slate-100 dark:active:bg-border-color transition-colors flex items-center text-slate-800 dark:text-white">
            <Icon name="camera" className="w-5 h-5 mr-3" /> Take Photo
        </button>
        <button onClick={onChooseGallery} className="w-full text-left p-3 rounded-lg active:bg-slate-100 dark:active:bg-border-color transition-colors flex items-center text-slate-800 dark:text-white">
            <Icon name="image" className="w-5 h-5 mr-3" /> Choose from Gallery
        </button>
    </div>
);

const FontSizeModal: React.FC<{ onSelect: (size: number) => void; }> = ({ onSelect }) => (
    <div className="flex justify-around items-center p-2">
        <button onClick={() => onSelect(2)} className="px-4 py-2 text-sm rounded-lg active:bg-slate-100 dark:active:bg-border-color transition-colors text-slate-800 dark:text-white">Small</button>
        <button onClick={() => onSelect(3)} className="px-4 py-2 text-base rounded-lg active:bg-slate-100 dark:active:bg-border-color transition-colors text-slate-800 dark:text-white">Normal</button>
        <button onClick={() => onSelect(5)} className="px-4 py-2 text-lg rounded-lg active:bg-slate-100 dark:active:bg-border-color transition-colors text-slate-800 dark:text-white">Large</button>
    </div>
);

// -- MAIN EDITOR COMPONENT -- //

interface SecretEditorScreenProps {
    note: SecretNote | null;
    onSave: (note: SecretNote) => void;
    onUpdateNote: (note: SecretNote) => void;
    onBack: () => void;
    onDelete: (noteId: string) => void;
    registerBackHandler: (handler: (() => boolean) | null) => void;
    executePendingNavigation?: () => void;
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

const SecretEditorScreen: React.FC<SecretEditorScreenProps> = ({ note, onSave, onUpdateNote, onBack, onDelete, registerBackHandler, executePendingNavigation }) => {
    const { settings } = useAppContext();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [media, setMedia] = useState<MediaAttachment[]>([]);
    const [characterCount, setCharacterCount] = useState(0);
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const [selectedImage, setSelectedImage] = useState<MediaAttachment | null>(null);
    const [hasBeenEdited, setHasBeenEdited] = useState(false);

    const [isRecording, setIsRecording] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isUnsavedChangesModalOpen, setIsUnsavedChangesModalOpen] = useState(false);
    const [isFontSizeModalOpen, setIsFontSizeModalOpen] = useState(false);
    const [isImageChoiceModalOpen, setIsImageChoiceModalOpen] = useState(false);

    const [activeStyles, setActiveStyles] = useState<Set<string>>(new Set());
    const [alignment, setAlignment] = useState<Alignment>('left');

    const contentRef = useRef<HTMLDivElement>(null);
    const initialNoteRef = useRef<SecretNote | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const scrollableRef = useRef<HTMLDivElement>(null);
    const toolbarRef = useRef<HTMLDivElement>(null);
    const keyboardHeightRef = useRef(0);

    // Keyboard detection
    useEffect(() => {
        let keyboardShowListener: any;
        let keyboardHideListener: any;
        let keyboardWillShowListener: any;
        let keyboardWillHideListener: any;

        const setupKeyboardListeners = async () => {
            try {
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

    // Auto-focus the content area when component mounts
    useEffect(() => {
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

    // Preload TTS engine for faster first read - do this immediately on mount
    useEffect(() => {
        const preloadTTS = async () => {
            try {
                await TextToSpeech.speak({
                    text: ' ',
                    lang: 'en-US',
                    rate: 1.0,
                    pitch: 1.0,
                    volume: 0,
                    category: 'ambient',
                });
            } catch (error) {
                if ('speechSynthesis' in window) {
                    // Ensure voices are loaded
                    window.speechSynthesis.getVoices();
                    const utterance = new SpeechSynthesisUtterance(' ');
                    utterance.volume = 0;
                    window.speechSynthesis.speak(utterance);
                }
            }
        };
        // No delay - start preloading immediately
        preloadTTS();
    }, []);

    // Cleanup TTS when component unmounts
    useEffect(() => {
        return () => {
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
        const currentContentTrimmed = currentContent.trim().replace(/<br\s*\/?>/gi, '');

        if (!initialNoteRef.current) {
            const hasContent = title.trim() !== '' || currentContentTrimmed !== '' || media.length > 0;
            return hasContent || hasBeenEdited;
        }

        return initialNoteRef.current.title !== title ||
            initialNoteRef.current.content !== currentContent ||
            JSON.stringify(initialNoteRef.current.media) !== JSON.stringify(media);
    }, [title, media, settings.autoSave, hasBeenEdited]);

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

        return () => {
            registerBackHandler(null);
        };
    }, [noteHasChanged, registerBackHandler]);

    const sanitizeContent = (html: string): string => {
        if (!html) return '';
        let sanitized = html.replace(/&nbsp;/g, ' ');
        sanitized = sanitized.replace(/  +/g, ' ');
        sanitized = sanitized.replace(/\s+(<\/[^>]+>)/g, '$1');
        sanitized = sanitized.replace(/\s+$/, '');
        sanitized = sanitized.replace(/^\s+/, '');
        return sanitized;
    };

    const createNoteObject = (): SecretNote => ({
        id: note?.id || new Date().toISOString(),
        title: title || 'Untitled Secret',
        content: sanitizeContent(contentRef.current?.innerHTML || ''),
        media: media,
        createdAt: note?.createdAt || new Date().toISOString(),
        lastModified: new Date().toISOString(),
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
            if (contentRef.current) {
                contentRef.current.innerHTML = note.content;
                setCharacterCount(countCharacters(note.content));
            }
        } else {
            setTitle(''); setContent(''); setMedia([]);
            if (contentRef.current) {
                contentRef.current.innerHTML = '';
                contentRef.current.focus();
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
    }, [settings.autoSave, title, content, media, onUpdateNote]);

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

    const handleSave = () => {
        registerBackHandler(null);
        onSave(createNoteObject());
    };

    const handleSaveAndNavigate = () => {
        registerBackHandler(null);
        setIsUnsavedChangesModalOpen(false);
        const noteToSave = createNoteObject();
        onUpdateNote(noteToSave);
        if (executePendingNavigation) {
            executePendingNavigation();
        } else {
            onBack();
        }
    };

    const handleDeleteConfirm = () => {
        registerBackHandler(null);
        if (note) onDelete(note.id);
        setIsDeleteModalOpen(false);
    };

    const handleBackPress = () => {
        if (noteHasChanged()) setIsUnsavedChangesModalOpen(true);
        else onBack();
    };

    const handleDiscard = () => {
        registerBackHandler(null);
        setIsUnsavedChangesModalOpen(false);
        if (executePendingNavigation) {
            executePendingNavigation();
        } else {
            onBack();
        }
    };

    const handleTextToSpeech = async () => {
        try {
            if (isSpeaking) {
                await TextToSpeech.stop();
                setIsSpeaking(false);
            } else {
                const textContent = contentRef.current?.innerText || '';
                const textToSpeak = (title || 'Untitled Secret') + '. ' + textContent;

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

                setIsSpeaking(false);
            }
        } catch (error) {
            console.error('Text-to-Speech error:', error);
            setIsSpeaking(false);
            if ('speechSynthesis' in window) {
                if (window.speechSynthesis.speaking) {
                    window.speechSynthesis.cancel();
                } else {
                    const textContent = contentRef.current?.innerText || '';
                    const textToSpeak = (title || 'Untitled Secret') + '. ' + textContent;
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
        if (!hasBeenEdited) {
            setHasBeenEdited(true);
        }
    };

    const handleStyleClick = (command: string) => {
        document.execCommand(command, false);
        updateToolbarState();
    };

    const handleAlignmentClick = () => {
        const alignments: Alignment[] = ['left', 'center', 'right', 'justify'];
        const nextAlignment = alignments[(alignments.indexOf(alignment) + 1) % alignments.length];
        const commandMap = { justify: 'justifyFull', left: 'justifyLeft', right: 'justifyRight', center: 'justifyCenter' };
        document.execCommand(commandMap[nextAlignment], false);
        setAlignment(nextAlignment);
    };

    const alignmentIconMap: { [key in Alignment]: string } = { justify: 'list', left: 'alignLeft', center: 'alignCenter', right: 'alignRight' };

    const takePicture = async (source: CameraSource) => {
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
        setIsFontSizeModalOpen(false);
    };

    const ToolbarButton: React.FC<{ onClick: () => void; icon: string; label: string; isActive?: boolean; }> = ({ onClick, icon, label, isActive }) => (
        <button
            onTouchStart={(e) => {
                e.preventDefault();
            }}
            onMouseDown={(e) => {
                e.preventDefault();
            }}
            onClick={(e) => {
                e.preventDefault();
                onClick();
            }}
            className={`flex flex-col items-center justify-center p-2 text-xs w-16 h-16 transition-colors duration-75 focus:outline-none ${isActive ? 'text-accent' : 'text-slate-700 dark:text-white'}`}
            aria-label={label}
        >
            <Icon name={icon} className="w-5 h-5 mb-1" /> <span>{label}</span>
        </button>
    );

    const imageMedia = media.filter(m => m.type === 'image');
    const audioMedia = media.filter(m => m.type === 'audio');
    const toolbarHeight = 88;

    return (
        <div
            ref={containerRef}
            className="h-full flex flex-col bg-white dark:bg-primary text-slate-900 dark:text-text-primary overflow-hidden"
        >
            {/* Header */}
            <header className="flex-shrink-0 p-3 flex justify-between items-center border-b border-slate-200 dark:border-border-color bg-white dark:bg-primary z-20">
                <button onClick={handleBackPress} className="p-2 -ml-2 flex items-center gap-1 text-slate-800 dark:text-white">
                    <Icon name="back" />
                    <span className="text-sm font-medium">Back</span>
                </button>
                <div className="flex items-center gap-2">
                    {note && <button onMouseDown={(e) => e.preventDefault()} onClick={() => setIsDeleteModalOpen(true)} className="p-2 text-red-500"><Icon name="trash" /></button>}
                    <button onClick={handleSave} className="bg-accent text-white px-4 py-1.5 rounded-full font-semibold text-sm">Done</button>
                </div>
            </header>

            {/* Main Content Area */}
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
                        className="bg-transparent text-xl font-bold placeholder-slate-400 dark:placeholder-text-secondary focus:outline-none flex-shrink-0 p-3 border border-slate-200 dark:border-border-color rounded-lg text-slate-800 dark:text-white"
                    />

                    {/* Content Editor */}
                    <div
                        className="relative border border-slate-200 dark:border-border-color rounded-lg flex-1"
                        style={{ minHeight: '200px' }}
                    >
                        <div
                            ref={contentRef}
                            contentEditable
                            onInput={handleContentInput}
                            className="bg-transparent text-slate-800 dark:text-white focus:outline-none w-full h-full p-3"
                            style={{ wordWrap: 'break-word', overflowWrap: 'break-word', minHeight: '200px' }}
                        />
                        {!content.replace(/<[^>]*>?/gm, ' ').trim() && (
                            <div
                                className="absolute top-0 left-0 right-0 p-3 text-slate-400 dark:text-text-secondary pointer-events-none"
                                aria-hidden="true"
                            >
                                Start writing your secret note...
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
                                                <img
                                                    src={item.src}
                                                    alt="attachment"
                                                    className="rounded-lg w-full h-full object-cover cursor-pointer"
                                                    onClick={() => setSelectedImage(item)}
                                                />
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

            {/* Bottom Toolbar - Fixed at bottom */}
            <div
                ref={toolbarRef}
                className="fixed left-0 right-0 bottom-0 bg-white dark:bg-primary border-t border-slate-200 dark:border-border-color z-50"
                onTouchStart={(e) => e.stopPropagation()}
                onTouchMove={(e) => {
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

            <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Delete Secret?">
                <p className="text-slate-600 dark:text-text-secondary mb-6">This action is permanent and cannot be undone.</p>
                <div className="flex justify-center gap-4">
                    <button onClick={() => setIsDeleteModalOpen(false)} className="px-6 py-2 rounded-full bg-slate-200 dark:bg-border-color text-slate-800 dark:text-text-primary font-semibold">Cancel</button>
                    <button onClick={handleDeleteConfirm} className="px-6 py-2 rounded-full bg-red-600 text-white font-semibold">Delete</button>
                </div>
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
                <p className="text-slate-600 dark:text-white/60 mb-6">You have unsaved changes. Do you want to save them?</p>
                <div className="flex justify-end gap-2">
                    <button onClick={() => setIsUnsavedChangesModalOpen(false)} className="px-5 py-2 rounded-full font-semibold text-slate-800 dark:text-white">Cancel</button>
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

export default SecretEditorScreen;
