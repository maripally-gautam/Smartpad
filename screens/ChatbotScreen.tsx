import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import Icon from '../components/Icon';
import { ChatMessage, ChatConversation, Note, Settings } from '../types';
import useChatbot from '../hooks/useChatbot';
import { Keyboard } from '@capacitor/keyboard';
import { Capacitor } from '@capacitor/core';

interface ChatbotScreenProps {
    onBack: () => void;
    onGoToSettings: () => void;
    onCreateNote: (note: Omit<Note, 'id' | 'lastModified'>) => string;
    onUpdateNote: (note: Note) => void;
    onDeleteNote: (noteId: string) => void;
    onUpdateSettings: (settings: Partial<Settings>) => void;
}

// Chat bubble component with smooth animations
const ChatBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
    const isUser = message.role === 'user';
    const isSystem = message.role === 'system';

    if (isSystem) {
        return (
            <div className="flex justify-center my-2 animate-fade-in">
                <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-4 py-2 rounded-xl text-sm max-w-[90%] shadow-sm">
                    {message.content}
                </div>
            </div>
        );
    }

    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3 animate-slide-up`}>
            <div
                className={`max-w-[85%] px-4 py-3 rounded-2xl shadow-md transition-all duration-200 ${isUser
                    ? 'bg-gradient-to-br from-blue-500 via-blue-600 to-cyan-500 text-white rounded-br-md shadow-blue-500/25'
                    : 'bg-white dark:bg-gray-800/90 text-slate-800 dark:text-white rounded-bl-md backdrop-blur-sm border border-slate-200/50 dark:border-gray-700/50'
                    }`}
            >
                {!isUser && (
                    <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-sm">
                            <Icon name="sparkles" className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-xs font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">Sparky</span>
                    </div>
                )}
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                {message.functionCall && (
                    <div className="mt-2 pt-2 border-t border-blue-300/30 dark:border-gray-600/50">
                        <p className="text-xs opacity-80 flex items-center gap-1">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                            Action: {message.functionCall.name}
                        </p>
                    </div>
                )}
                <p className={`text-xs mt-1.5 ${isUser ? 'text-white/70' : 'text-slate-400 dark:text-gray-500'}`}>
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
            </div>
        </div>
    );
};

// Typing indicator with blue theme
const TypingIndicator: React.FC = () => (
    <div className="flex justify-start mb-3 animate-fade-in">
        <div className="bg-white dark:bg-gray-800/90 px-4 py-3 rounded-2xl rounded-bl-md shadow-md backdrop-blur-sm border border-slate-200/50 dark:border-gray-700/50">
            <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-sm">
                    <Icon name="sparkles" className="w-3 h-3 text-white" />
                </div>
                <div className="flex gap-1.5">
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
            </div>
        </div>
    </div>
);

// Quick suggestions with colorful icons
const quickSuggestions = [
    { icon: '📝', text: 'Create a note' },
    { icon: '📋', text: 'List my notes' },
    { icon: '🔍', text: 'Search notes' },
    { icon: '⏰', text: 'Set a reminder' },
    { icon: '🌙', text: 'Change theme' },
    { icon: '📊', text: 'App status' },
];

// History sidebar
const HistorySidebar: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    conversations: ChatConversation[];
    currentId: string | null;
    onSelect: (id: string) => void;
    onDelete: (id: string) => void;
    onNewChat: () => void;
    onClearAll: () => void;
}> = ({ isOpen, onClose, conversations, currentId, onSelect, onDelete, onNewChat, onClearAll }) => {
    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
            <div className="fixed left-0 top-0 bottom-0 w-72 bg-white dark:bg-gray-900 z-50 shadow-xl flex flex-col animate-slide-in-left">
                <div className="p-4 border-b border-slate-200 dark:border-gray-700 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white">Chat History</h2>
                    <button onClick={onClose} className="p-2 rounded-full active:bg-slate-100 dark:active:bg-gray-800">
                        <Icon name="close" className="w-5 h-5 text-slate-600 dark:text-gray-400" />
                    </button>
                </div>

                <div className="p-3">
                    <button
                        onClick={() => { onNewChat(); onClose(); }}
                        className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-500 via-blue-600 to-cyan-500 text-white rounded-xl font-semibold transition-all active:scale-95 shadow-lg shadow-blue-500/25"
                    >
                        <Icon name="plus" className="w-5 h-5" />
                        New Chat
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {conversations.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 dark:text-gray-500">
                            <Icon name="chat" className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No chat history yet</p>
                        </div>
                    ) : (
                        conversations.map(conv => (
                            <div
                                key={conv.id}
                                className={`group flex items-center gap-2 p-3 rounded-xl cursor-pointer transition-all duration-200 ${conv.id === currentId
                                    ? 'bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-500 shadow-sm'
                                    : 'bg-slate-50 dark:bg-gray-800 active:bg-blue-50/50 dark:active:bg-gray-700 border-2 border-transparent'
                                    }`}
                                onClick={() => { onSelect(conv.id); onClose(); }}
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-800 dark:text-white truncate">
                                        {conv.title}
                                    </p>
                                    <p className="text-xs text-slate-400 dark:text-gray-500">
                                        {conv.messages.length} messages • {new Date(conv.lastMessageAt).toLocaleDateString()}
                                    </p>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onDelete(conv.id); }}
                                    className="p-2 rounded-full opacity-100 active:bg-red-100 dark:active:bg-red-900/30 transition-all"
                                >
                                    <Icon name="trash" className="w-4 h-4 text-red-500" />
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {conversations.length > 0 && (
                    <div className="p-3 border-t border-slate-200 dark:border-gray-700">
                        <button
                            onClick={() => { onClearAll(); onClose(); }}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-red-500 active:bg-red-50 dark:active:bg-red-900/20 rounded-xl transition-colors"
                        >
                            <Icon name="trash" className="w-4 h-4" />
                            Clear All History
                        </button>
                    </div>
                )}
            </div>
        </>
    );
};

const ChatbotScreen: React.FC<ChatbotScreenProps> = ({
    onBack,
    onGoToSettings,
    onCreateNote,
    onUpdateNote,
    onDeleteNote,
    onUpdateSettings,
}) => {
    const { notes, settings } = useAppContext();
    const [inputValue, setInputValue] = useState('');
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const {
        conversations,
        currentConversation,
        currentConversationId,
        isLoading,
        error,
        sendMessage,
        createConversation,
        selectConversation,
        deleteConversation,
        clearAllConversations,
        setError,
    } = useChatbot({
        apiKey: settings.geminiApiKey,
        notes,
        settings,
        onCreateNote,
        onUpdateNote,
        onDeleteNote,
        onUpdateSettings,
    });

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [currentConversation?.messages]);

    // Handle keyboard on mobile - fast response
    useEffect(() => {
        if (Capacitor.isNativePlatform()) {
            let keyboardHeight = 0;

            const showListener = Keyboard.addListener('keyboardWillShow', (info) => {
                keyboardHeight = info.keyboardHeight;
                // Immediate scroll without delay
                requestAnimationFrame(() => {
                    messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
                });
            });

            const didShowListener = Keyboard.addListener('keyboardDidShow', () => {
                // Ensure visibility after keyboard is fully shown
                messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
            });

            return () => {
                showListener.then(listener => listener.remove());
                didShowListener.then(listener => listener.remove());
            };
        }
    }, []);

    const handleSend = useCallback(() => {
        if (inputValue.trim() && !isLoading) {
            sendMessage(inputValue);
            setInputValue('');
            // Keep keyboard open by refocusing after send
            requestAnimationFrame(() => {
                inputRef.current?.focus();
            });
        }
    }, [inputValue, isLoading, sendMessage]);

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleSuggestionClick = (suggestion: string) => {
        setInputValue(suggestion);
        inputRef.current?.focus();
    };

    const hasApiKey = !!settings.geminiApiKey;

    return (
        <div className="h-full flex flex-col bg-slate-50 dark:bg-primary">
            {/* Header with blue gradient */}
            <header className="p-4 flex items-center gap-3 border-b border-slate-200/80 dark:border-gray-700/80 flex-shrink-0 bg-white/95 dark:bg-gray-900/95 z-10 backdrop-blur-sm">
                <button
                    onClick={onBack}
                    className="p-2 -ml-2 rounded-full transition-all duration-200 active:bg-slate-100 dark:active:bg-gray-800 active:scale-95"
                >
                    <Icon name="back" className="w-5 h-5 text-slate-800 dark:text-white" />
                </button>

                <div className="flex-1 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-400 flex items-center justify-center shadow-lg shadow-blue-500/30">
                        <Icon name="sparkles" className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-500 bg-clip-text text-transparent">
                            Sparky
                        </h1>
                        <p className="text-xs text-slate-500 dark:text-gray-400 flex items-center gap-1">
                            {hasApiKey ? (
                                <><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> AI Assistant</>
                            ) : 'API key required'}
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => setIsHistoryOpen(true)}
                    className="p-2 rounded-full active:bg-slate-100 dark:active:bg-gray-800 transition-all duration-200 active:scale-95"
                >
                    <Icon name="history" className="w-5 h-5 text-slate-600 dark:text-gray-400" />
                </button>
            </header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4">
                {!hasApiKey ? (
                    <div className="h-full flex flex-col items-center justify-center text-center px-4 animate-fade-in">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/10">
                            <Icon name="key" className="w-10 h-10 text-blue-500" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
                            API Key Required
                        </h2>
                        <p className="text-slate-500 dark:text-gray-400 mb-4 max-w-xs">
                            To chat with Sparky, please add your Gemini API key in Settings.
                        </p>
                        <button
                            onClick={onGoToSettings}
                            className="px-6 py-3 bg-gradient-to-r from-blue-500 via-blue-600 to-cyan-500 text-white rounded-xl font-semibold transition-all active:scale-95 shadow-lg shadow-blue-500/30"
                        >
                            Go to Settings
                        </button>
                    </div>
                ) : !currentConversation || currentConversation.messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center animate-fade-in">
                        <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-400 flex items-center justify-center mb-6 shadow-2xl shadow-blue-500/40">
                            <Icon name="sparkles" className="w-12 h-12 text-white" />
                            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 animate-ping opacity-20"></div>
                        </div>
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent mb-2">
                            Hi there! I'm Sparky ✨
                        </h2>
                        <p className="text-slate-500 dark:text-gray-400 mb-6 text-center max-w-sm">
                            Your AI assistant for Smartpad. I can create notes, set reminders, change settings, and more!
                        </p>

                        <div className="w-full max-w-sm">
                            <p className="text-xs text-slate-400 dark:text-gray-500 mb-3 text-center uppercase tracking-wider font-medium">
                                Quick Actions
                            </p>
                            <div className="grid grid-cols-2 gap-2.5">
                                {quickSuggestions.map((suggestion, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleSuggestionClick(suggestion.text)}
                                        className="flex items-center gap-2.5 px-4 py-3.5 bg-white dark:bg-gray-800/80 rounded-xl text-sm text-slate-700 dark:text-gray-200 active:bg-blue-500 active:text-white transition-all duration-200 active:scale-95 shadow-sm border border-slate-100 dark:border-gray-700/50"
                                    >
                                        <span className="text-base">{suggestion.icon}</span>
                                        <span className="font-medium">{suggestion.text}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {currentConversation.messages.map(message => (
                            <ChatBubble key={message.id} message={message} />
                        ))}
                        {isLoading && <TypingIndicator />}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            {/* Input - optimized for fast keyboard response */}
            {hasApiKey && (
                <div className="p-4 border-t border-slate-200/80 dark:border-gray-700/80 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm flex-shrink-0" style={{ willChange: 'transform' }}>
                    {error && (
                        <div className="mb-3 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-xl text-sm flex items-center justify-between shadow-sm">
                            <span>{error}</span>
                            <button onClick={() => setError(null)} className="ml-2 active:bg-red-200 dark:active:bg-red-800/50 rounded-full p-1 transition-colors">
                                <Icon name="close" className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    <div className="flex items-center gap-3">
                        <input
                            ref={inputRef}
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyPress={handleKeyPress}
                            onFocus={() => {
                                // Ensure input is visible immediately on focus
                                requestAnimationFrame(() => {
                                    messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
                                });
                            }}
                            placeholder="Ask Sparky anything..."
                            disabled={isLoading}
                            className="flex-1 bg-slate-100 dark:bg-gray-800/80 border-2 border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-gray-800 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none transition-colors duration-100 shadow-sm focus:shadow-md focus:shadow-blue-500/10"
                        />
                        <button
                            onClick={handleSend}
                            disabled={!inputValue.trim() || isLoading}
                            className={`p-3 rounded-xl transition-all duration-200 active:scale-90 ${inputValue.trim() && !isLoading
                                ? 'bg-gradient-to-r from-blue-500 via-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/30'
                                : 'bg-slate-200 dark:bg-gray-700 text-slate-400 dark:text-gray-500'
                                }`}
                        >
                            <Icon name="send" className="w-5 h-5 transform rotate-90" />
                        </button>
                    </div>
                </div>
            )}

            {/* History Sidebar */}
            <HistorySidebar
                isOpen={isHistoryOpen}
                onClose={() => setIsHistoryOpen(false)}
                conversations={conversations}
                currentId={currentConversationId}
                onSelect={selectConversation}
                onDelete={deleteConversation}
                onNewChat={createConversation}
                onClearAll={clearAllConversations}
            />
        </div>
    );
};

export default ChatbotScreen;
