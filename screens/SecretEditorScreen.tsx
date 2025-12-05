import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SecretNote, MediaAttachment } from '../types';
import Icon from '../components/Icon';
import Modal from '../components/Modal';
import { useAppContext } from '../context/AppContext';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { VoiceRecorder } from 'capacitor-voice-recorder';
import { Keyboard } from '@capacitor/keyboard';
import { Capacitor } from '@capacitor/core';

interface SecretEditorScreenProps {
    note: SecretNote | null;
    onSave: (note: SecretNote) => void;
    onUpdateNote: (note: SecretNote) => void;
    onBack: () => void;
    onDelete: (noteId: string) => void;
    registerBackHandler: (handler: (() => boolean) | null) => void;
}

type Alignment = 'justify' | 'left' | 'right' | 'center';

const SecretEditorScreen: React.FC<SecretEditorScreenProps> = ({
    note,
    onSave,
    onUpdateNote,
    onBack,
    onDelete,
    registerBackHandler,
}) => {
    const { settings } = useAppContext();
    const isNewNote = !note;

    const [title, setTitle] = useState(note?.title || '');
    const [media, setMedia] = useState<MediaAttachment[]>(note?.media || []);
    const [isRecording, setIsRecording] = useState(false);
    const [activeModal, setActiveModal] = useState<string | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const [currentAlignment, setCurrentAlignment] = useState<Alignment>('left');

    const contentEditableRef = useRef<HTMLDivElement>(null);
    const initialContentRef = useRef(note?.content || '');
    const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Track if we need to show unsaved changes dialog
    const checkUnsavedChanges = useCallback(() => {
        const currentContent = contentEditableRef.current?.innerHTML || '';
        const titleChanged = title !== (note?.title || '');
        const contentChanged = currentContent !== initialContentRef.current;
        const mediaChanged = JSON.stringify(media) !== JSON.stringify(note?.media || []);
        return titleChanged || contentChanged || mediaChanged;
    }, [title, media, note]);

    // Register back handler for unsaved changes
    useEffect(() => {
        const handler = () => {
            if (checkUnsavedChanges()) {
                setActiveModal('unsaved');
                return true; // Block navigation
            }
            return false; // Allow navigation
        };
        registerBackHandler(handler);
        return () => registerBackHandler(null);
    }, [registerBackHandler, checkUnsavedChanges]);

    // Handle keyboard events
    useEffect(() => {
        if (Capacitor.isNativePlatform()) {
            const showListener = Keyboard.addListener('keyboardWillShow', () => {
                setKeyboardVisible(true);
            });
            const hideListener = Keyboard.addListener('keyboardWillHide', () => {
                setKeyboardVisible(false);
            });
            return () => {
                showListener.then(l => l.remove());
                hideListener.then(l => l.remove());
            };
        }
    }, []);

    // Auto-save functionality
    useEffect(() => {
        if (settings.autoSave && !isNewNote && note) {
            autoSaveIntervalRef.current = setInterval(() => {
                if (checkUnsavedChanges()) {
                    handleSave(true);
                }
            }, 5000);
            return () => {
                if (autoSaveIntervalRef.current) {
                    clearInterval(autoSaveIntervalRef.current);
                }
            };
        }
    }, [settings.autoSave, isNewNote, note, checkUnsavedChanges]);

    // Set initial content
    useEffect(() => {
        if (contentEditableRef.current && note?.content) {
            contentEditableRef.current.innerHTML = note.content;
        }
    }, []);

    const handleSave = (isAutoSave = false) => {
        const content = contentEditableRef.current?.innerHTML || '';
        const now = new Date().toISOString();

        const savedNote: SecretNote = {
            id: note?.id || now,
            title: title || 'Untitled',
            content,
            media,
            createdAt: note?.createdAt || now,
            lastModified: now,
        };

        if (!isAutoSave) {
            onSave(savedNote);
        } else {
            // For auto-save, update the note without navigating back
            onUpdateNote(savedNote);
            initialContentRef.current = content;
            setHasUnsavedChanges(false);
        }
    };

    const handleDelete = () => {
        if (note) {
            onDelete(note.id);
        } else {
            onBack();
        }
    };

    const handleDiscardAndBack = () => {
        setActiveModal(null);
        onBack();
    };

    // Text formatting commands
    const execCommand = (command: string, value?: string) => {
        document.execCommand(command, false, value);
        contentEditableRef.current?.focus();
        setHasUnsavedChanges(true);
    };

    const handleAlignment = (align: Alignment) => {
        setCurrentAlignment(align);
        execCommand(`justify${align.charAt(0).toUpperCase() + align.slice(1)}`);
    };

    // Image handling
    const addImage = async (source: 'camera' | 'gallery') => {
        try {
            const image = await Camera.getPhoto({
                quality: 80,
                allowEditing: false,
                resultType: CameraResultType.DataUrl,
                source: source === 'camera' ? CameraSource.Camera : CameraSource.Photos,
            });
            if (image.dataUrl) {
                const newMedia: MediaAttachment = {
                    id: Date.now().toString(),
                    type: 'image',
                    src: image.dataUrl,
                };
                setMedia(prev => [...prev, newMedia]);
                setHasUnsavedChanges(true);
            }
        } catch (err) {
            console.error('Camera error:', err);
        }
        setActiveModal(null);
    };

    // Audio recording
    const toggleRecording = async () => {
        if (isRecording) {
            try {
                const result = await VoiceRecorder.stopRecording();
                if (result.value?.recordDataBase64) {
                    const audioSrc = `data:audio/aac;base64,${result.value.recordDataBase64}`;
                    const newMedia: MediaAttachment = {
                        id: Date.now().toString(),
                        type: 'audio',
                        src: audioSrc,
                    };
                    setMedia(prev => [...prev, newMedia]);
                    setHasUnsavedChanges(true);
                }
            } catch (err) {
                console.error('Stop recording error:', err);
            }
            setIsRecording(false);
        } else {
            try {
                const permission = await VoiceRecorder.requestAudioRecordingPermission();
                if (permission.value) {
                    await VoiceRecorder.startRecording();
                    setIsRecording(true);
                }
            } catch (err) {
                console.error('Start recording error:', err);
            }
        }
    };

    const removeMedia = (id: string) => {
        setMedia(prev => prev.filter(m => m.id !== id));
        setHasUnsavedChanges(true);
    };

    return (
        <div className="h-full flex flex-col bg-white dark:bg-primary text-slate-800 dark:text-text-primary">
            {/* Header */}
            <header className="p-3 flex items-center gap-2 border-b border-slate-200 dark:border-border-color flex-shrink-0 bg-white dark:bg-primary z-10">
                <button onClick={onBack} className="p-2 -ml-2">
                    <Icon name="back" />
                </button>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => { setTitle(e.target.value); setHasUnsavedChanges(true); }}
                    placeholder="Note title..."
                    className="flex-1 bg-transparent text-lg font-semibold focus:outline-none"
                />
                <button onClick={() => handleSave(false)} className="p-2 text-accent">
                    <Icon name="save" />
                </button>
                <button onClick={() => setActiveModal('delete')} className="p-2 text-red-500">
                    <Icon name="trash" />
                </button>
            </header>

            {/* Formatting Toolbar */}
            <div className="flex items-center gap-1 p-2 border-b border-slate-200 dark:border-border-color overflow-x-auto flex-shrink-0">
                <button onClick={() => execCommand('bold')} className="p-2 hover:bg-slate-100 dark:hover:bg-border-color rounded">
                    <span className="font-bold">B</span>
                </button>
                <button onClick={() => execCommand('italic')} className="p-2 hover:bg-slate-100 dark:hover:bg-border-color rounded">
                    <span className="italic">I</span>
                </button>
                <button onClick={() => execCommand('underline')} className="p-2 hover:bg-slate-100 dark:hover:bg-border-color rounded">
                    <span className="underline">U</span>
                </button>
                <div className="w-px h-6 bg-slate-300 dark:bg-border-color mx-1" />
                <button onClick={() => handleAlignment('left')} className={`p-2 hover:bg-slate-100 dark:hover:bg-border-color rounded ${currentAlignment === 'left' ? 'bg-slate-200 dark:bg-border-color' : ''}`}>
                    <Icon name="alignLeft" className="w-4 h-4" />
                </button>
                <button onClick={() => handleAlignment('center')} className={`p-2 hover:bg-slate-100 dark:hover:bg-border-color rounded ${currentAlignment === 'center' ? 'bg-slate-200 dark:bg-border-color' : ''}`}>
                    <Icon name="alignCenter" className="w-4 h-4" />
                </button>
                <button onClick={() => handleAlignment('right')} className={`p-2 hover:bg-slate-100 dark:hover:bg-border-color rounded ${currentAlignment === 'right' ? 'bg-slate-200 dark:bg-border-color' : ''}`}>
                    <Icon name="alignRight" className="w-4 h-4" />
                </button>
                <div className="w-px h-6 bg-slate-300 dark:bg-border-color mx-1" />
                <button onClick={() => execCommand('insertUnorderedList')} className="p-2 hover:bg-slate-100 dark:hover:bg-border-color rounded">
                    <Icon name="list" className="w-4 h-4" />
                </button>
                <button onClick={() => execCommand('insertOrderedList')} className="p-2 hover:bg-slate-100 dark:hover:bg-border-color rounded">
                    <Icon name="listOrdered" className="w-4 h-4" />
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4">
                <div
                    ref={contentEditableRef}
                    contentEditable
                    className="min-h-full focus:outline-none empty:before:content-['Start_writing_your_secret_note...'] empty:before:text-slate-400 dark:empty:before:text-text-secondary"
                    onInput={() => setHasUnsavedChanges(true)}
                />

                {/* Media attachments */}
                {media.length > 0 && (
                    <div className="mt-4 space-y-3">
                        {media.map((item) => (
                            <div key={item.id} className="relative">
                                {item.type === 'image' ? (
                                    <img src={item.src} alt="" className="max-w-full rounded-lg" />
                                ) : (
                                    <audio src={item.src} controls className="w-full" />
                                )}
                                <button
                                    onClick={() => removeMedia(item.id)}
                                    className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full"
                                >
                                    <Icon name="close" className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Bottom Toolbar */}
            {!keyboardVisible && (
                <div className="flex items-center justify-around p-3 border-t border-slate-200 dark:border-border-color flex-shrink-0 bg-white dark:bg-primary pb-safe">
                    <button onClick={() => setActiveModal('image')} className="p-3 hover:bg-slate-100 dark:hover:bg-border-color rounded-lg">
                        <Icon name="image" className="w-6 h-6" />
                    </button>
                    <button onClick={() => setActiveModal('camera')} className="p-3 hover:bg-slate-100 dark:hover:bg-border-color rounded-lg">
                        <Icon name="camera" className="w-6 h-6" />
                    </button>
                    <button
                        onClick={toggleRecording}
                        className={`p-3 rounded-lg ${isRecording ? 'bg-red-500 text-white' : 'hover:bg-slate-100 dark:hover:bg-border-color'}`}
                    >
                        <Icon name="mic" className="w-6 h-6" />
                    </button>
                </div>
            )}

            {/* Modals */}
            <Modal isOpen={activeModal === 'image'} onClose={() => setActiveModal(null)} title="Add Image">
                <div className="space-y-2">
                    <button onClick={() => addImage('camera')} className="w-full text-left p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-border-color transition-colors flex items-center">
                        <Icon name="camera" className="w-5 h-5 mr-3" /> Take Photo
                    </button>
                    <button onClick={() => addImage('gallery')} className="w-full text-left p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-border-color transition-colors flex items-center">
                        <Icon name="image" className="w-5 h-5 mr-3" /> Choose from Gallery
                    </button>
                </div>
            </Modal>

            <Modal isOpen={activeModal === 'delete'} onClose={() => setActiveModal(null)} title="Delete Note?">
                <p className="text-slate-600 dark:text-text-secondary mb-4">This action cannot be undone.</p>
                <div className="flex justify-end gap-2">
                    <button onClick={() => setActiveModal(null)} className="px-4 py-2 rounded-full">Cancel</button>
                    <button onClick={handleDelete} className="px-4 py-2 rounded-full bg-red-500 text-white">Delete</button>
                </div>
            </Modal>

            <Modal isOpen={activeModal === 'unsaved'} onClose={() => setActiveModal(null)} title="Unsaved Changes">
                <p className="text-slate-600 dark:text-text-secondary mb-4">You have unsaved changes. What would you like to do?</p>
                <div className="flex justify-end gap-2">
                    <button onClick={handleDiscardAndBack} className="px-4 py-2 rounded-full text-red-500">Discard</button>
                    <button onClick={() => { handleSave(false); }} className="px-4 py-2 rounded-full bg-accent text-white">Save</button>
                </div>
            </Modal>
        </div>
    );
};

export default SecretEditorScreen;
