import { useState, useCallback, useRef, useEffect } from 'react';
import { ChatMessage, ChatConversation, Note, Settings } from '../types';
import { sendMessageToGemini } from '../services/geminiService';
import useLocalStorage from './useLocalStorage';

interface GeminiContent {
    role: 'user' | 'model';
    parts: Array<{
        text?: string;
        functionCall?: { name: string; args: Record<string, unknown> };
        functionResponse?: { name: string; response: { result: string } };
    }>;
}

interface UseChatbotProps {
    apiKey: string;
    notes: Note[];
    settings: Settings;
    onCreateNote: (note: Omit<Note, 'id' | 'lastModified'>) => string;
    onUpdateNote: (note: Note) => void;
    onDeleteNote: (noteId: string) => void;
    onUpdateSettings: (settings: Partial<Settings>) => void;
}

export default function useChatbot({
    apiKey,
    notes,
    settings,
    onCreateNote,
    onUpdateNote,
    onDeleteNote,
    onUpdateSettings,
}: UseChatbotProps) {
    const [conversations, setConversations] = useLocalStorage<ChatConversation[]>('chatConversations', []);
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Keep track of Gemini conversation history for context
    const conversationHistoryRef = useRef<GeminiContent[]>([]);

    // Get current conversation
    const currentConversation = conversations.find(c => c.id === currentConversationId) || null;

    // Create a new conversation
    const createConversation = useCallback(() => {
        const newConversation: ChatConversation = {
            id: Date.now().toString(),
            title: 'New Chat',
            messages: [],
            createdAt: new Date().toISOString(),
            lastMessageAt: new Date().toISOString(),
        };
        setConversations(prev => [newConversation, ...prev]);
        setCurrentConversationId(newConversation.id);
        conversationHistoryRef.current = [];
        return newConversation.id;
    }, [setConversations]);

    // Select a conversation
    const selectConversation = useCallback((conversationId: string) => {
        const conversation = conversations.find(c => c.id === conversationId);
        if (conversation) {
            setCurrentConversationId(conversationId);
            // Rebuild conversation history from messages
            conversationHistoryRef.current = conversation.messages
                .filter(m => m.role !== 'system')
                .map(m => ({
                    role: m.role === 'user' ? 'user' : 'model',
                    parts: [{ text: m.content }],
                })) as GeminiContent[];
        }
    }, [conversations]);

    // Delete a conversation
    const deleteConversation = useCallback((conversationId: string) => {
        setConversations(prev => prev.filter(c => c.id !== conversationId));
        if (currentConversationId === conversationId) {
            setCurrentConversationId(null);
            conversationHistoryRef.current = [];
        }
    }, [setConversations, currentConversationId]);

    // Clear all conversations
    const clearAllConversations = useCallback(() => {
        setConversations([]);
        setCurrentConversationId(null);
        conversationHistoryRef.current = [];
    }, [setConversations]);

    // Send a message
    const sendMessage = useCallback(async (content: string) => {
        if (!apiKey) {
            setError('Please set your Gemini API key in Settings');
            return;
        }

        if (!content.trim()) return;

        // Create conversation if needed
        let convId = currentConversationId;
        if (!convId) {
            convId = createConversation();
        }

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: content.trim(),
            timestamp: new Date().toISOString(),
        };

        // Add user message to conversation
        setConversations(prev => prev.map(c => {
            if (c.id === convId) {
                const isFirstMessage = c.messages.length === 0;
                return {
                    ...c,
                    messages: [...c.messages, userMessage],
                    title: isFirstMessage ? content.trim().slice(0, 30) + (content.length > 30 ? '...' : '') : c.title,
                    lastMessageAt: new Date().toISOString(),
                };
            }
            return c;
        }));

        setIsLoading(true);
        setError(null);

        try {
            const { response, functionCalls } = await sendMessageToGemini(
                apiKey,
                conversationHistoryRef.current,
                content,
                notes,
                settings,
                {
                    createNote: onCreateNote,
                    updateNote: onUpdateNote,
                    deleteNote: onDeleteNote,
                    updateSettings: onUpdateSettings,
                }
            );

            // Update conversation history
            conversationHistoryRef.current.push(
                { role: 'user', parts: [{ text: content }] },
                { role: 'model', parts: [{ text: response }] }
            );

            // Create assistant message
            const assistantMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: response,
                timestamp: new Date().toISOString(),
                functionCall: functionCalls.length > 0 ? {
                    name: functionCalls.map(f => f.name).join(', '),
                    args: functionCalls.reduce((acc, f) => ({ ...acc, [f.name]: f.args }), {}),
                    result: functionCalls.map(f => f.result).join('\n'),
                } : undefined,
            };

            // Add assistant message to conversation
            setConversations(prev => prev.map(c => {
                if (c.id === convId) {
                    return {
                        ...c,
                        messages: [...c.messages, assistantMessage],
                        lastMessageAt: new Date().toISOString(),
                    };
                }
                return c;
            }));

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to get response';
            setError(errorMessage);

            // Add error message to conversation
            const errorMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'system',
                content: `⚠️ Error: ${errorMessage}`,
                timestamp: new Date().toISOString(),
            };

            setConversations(prev => prev.map(c => {
                if (c.id === convId) {
                    return {
                        ...c,
                        messages: [...c.messages, errorMsg],
                        lastMessageAt: new Date().toISOString(),
                    };
                }
                return c;
            }));
        } finally {
            setIsLoading(false);
        }
    }, [apiKey, currentConversationId, createConversation, notes, settings, onCreateNote, onUpdateNote, onDeleteNote, onUpdateSettings, setConversations]);

    // Initialize with first conversation or create new one
    useEffect(() => {
        if (!currentConversationId && conversations.length > 0) {
            selectConversation(conversations[0].id);
        }
    }, [conversations, currentConversationId, selectConversation]);

    return {
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
    };
}
