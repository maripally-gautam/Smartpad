import { Note, Settings, Reminder, ReminderRepeat } from '../types';

// Gemini API types
interface GeminiFunctionCall {
    name: string;
    args: Record<string, unknown>;
}

interface GeminiPart {
    text?: string;
    functionCall?: GeminiFunctionCall;
    functionResponse?: {
        name: string;
        response: { result: string };
    };
}

interface GeminiContent {
    role: 'user' | 'model';
    parts: GeminiPart[];
}

interface GeminiResponse {
    candidates?: Array<{
        content: {
            parts: GeminiPart[];
            role: string;
        };
        finishReason: string;
    }>;
    error?: {
        message: string;
        code: number;
    };
}

// Function definitions for Gemini
export const CHATBOT_FUNCTIONS = {
    declarations: [
        {
            name: 'createNote',
            description: 'Create a new note with title and content. Use this when user wants to create, add, or write a new note.',
            parameters: {
                type: 'object',
                properties: {
                    title: {
                        type: 'string',
                        description: 'The title of the note',
                    },
                    content: {
                        type: 'string',
                        description: 'The content/body of the note (can include HTML formatting)',
                    },
                    isPinned: {
                        type: 'boolean',
                        description: 'Whether to pin the note to top',
                    },
                    isFavourite: {
                        type: 'boolean',
                        description: 'Whether to mark as favourite',
                    },
                },
                required: ['title', 'content'],
            },
        },
        {
            name: 'editNote',
            description: 'Edit an existing note by its ID. Use this to update title, content, or properties of an existing note.',
            parameters: {
                type: 'object',
                properties: {
                    noteId: {
                        type: 'string',
                        description: 'The ID of the note to edit',
                    },
                    title: {
                        type: 'string',
                        description: 'New title (optional)',
                    },
                    content: {
                        type: 'string',
                        description: 'New content (optional)',
                    },
                    isPinned: {
                        type: 'boolean',
                        description: 'Pin status (optional)',
                    },
                    isFavourite: {
                        type: 'boolean',
                        description: 'Favourite status (optional)',
                    },
                    isCompleted: {
                        type: 'boolean',
                        description: 'Completion status (optional)',
                    },
                },
                required: ['noteId'],
            },
        },
        {
            name: 'deleteNote',
            description: 'Delete a note by its ID. Ask for confirmation before deleting.',
            parameters: {
                type: 'object',
                properties: {
                    noteId: {
                        type: 'string',
                        description: 'The ID of the note to delete',
                    },
                },
                required: ['noteId'],
            },
        },
        {
            name: 'searchNotes',
            description: 'Search for notes by title or content. Returns matching notes.',
            parameters: {
                type: 'object',
                properties: {
                    query: {
                        type: 'string',
                        description: 'Search query to find in note titles or content',
                    },
                    filter: {
                        type: 'string',
                        enum: ['all', 'pinned', 'favourite', 'completed', 'pending', 'with-reminder'],
                        description: 'Filter notes by status',
                    },
                },
                required: ['query'],
            },
        },
        {
            name: 'listNotes',
            description: 'Get a list of all notes with optional filtering. Use this to see what notes exist.',
            parameters: {
                type: 'object',
                properties: {
                    filter: {
                        type: 'string',
                        enum: ['all', 'pinned', 'favourite', 'completed', 'pending', 'with-reminder'],
                        description: 'Filter to apply',
                    },
                    limit: {
                        type: 'number',
                        description: 'Maximum number of notes to return',
                    },
                },
                required: [],
            },
        },
        {
            name: 'setReminder',
            description: 'Set a reminder for a note. The reminder will notify the user at the specified time.',
            parameters: {
                type: 'object',
                properties: {
                    noteId: {
                        type: 'string',
                        description: 'The ID of the note to set reminder for',
                    },
                    time: {
                        type: 'string',
                        description: 'ISO date-time string for when to remind (e.g., "2024-12-25T10:00:00")',
                    },
                    repeat: {
                        type: 'string',
                        enum: ['none', 'hourly', 'daily', 'weekly', 'monthly', 'yearly'],
                        description: 'How often to repeat the reminder',
                    },
                },
                required: ['noteId', 'time'],
            },
        },
        {
            name: 'removeReminder',
            description: 'Remove a reminder from a note.',
            parameters: {
                type: 'object',
                properties: {
                    noteId: {
                        type: 'string',
                        description: 'The ID of the note to remove reminder from',
                    },
                },
                required: ['noteId'],
            },
        },
        {
            name: 'toggleNoteStatus',
            description: 'Toggle pin, favourite, or completed status of a note.',
            parameters: {
                type: 'object',
                properties: {
                    noteId: {
                        type: 'string',
                        description: 'The ID of the note',
                    },
                    status: {
                        type: 'string',
                        enum: ['pin', 'favourite', 'completed'],
                        description: 'Which status to toggle',
                    },
                },
                required: ['noteId', 'status'],
            },
        },
        {
            name: 'changeTheme',
            description: 'Change the app theme to light or dark mode.',
            parameters: {
                type: 'object',
                properties: {
                    theme: {
                        type: 'string',
                        enum: ['light', 'dark'],
                        description: 'The theme to set',
                    },
                },
                required: ['theme'],
            },
        },
        {
            name: 'updateSettings',
            description: 'Update app settings like auto-save, notifications, etc.',
            parameters: {
                type: 'object',
                properties: {
                    autoSave: {
                        type: 'boolean',
                        description: 'Enable/disable auto-save',
                    },
                    allowNotifications: {
                        type: 'boolean',
                        description: 'Enable/disable notifications',
                    },
                    deleteCompletedTasks: {
                        type: 'boolean',
                        description: 'Automatically delete completed tasks',
                    },
                },
                required: [],
            },
        },
        {
            name: 'getAppStatus',
            description: 'Get current app status including note counts, settings, etc.',
            parameters: {
                type: 'object',
                properties: {},
                required: [],
            },
        },
    ],
};

// System prompt for the chatbot
export const SYSTEM_PROMPT = `You are Sparky, a friendly and helpful AI assistant for the Smartpad notes app. You're enthusiastic, concise, and love using emojis to express yourself! 🌟

**Your Capabilities:**
- Create, edit, delete, and search notes
- Set and remove reminders on notes
- Toggle note statuses (pin, favourite, completed)
- Change app theme (light/dark)
- Adjust app settings (auto-save, notifications)
- Provide app status and statistics

**Important Rules:**
1. NEVER mention or access the Secrets feature - it's password-protected and private
2. Always confirm before deleting notes
3. Be helpful and proactive - suggest related actions
4. Keep responses brief but friendly
5. Use function calls to perform actions, don't just describe what you could do
6. When creating notes, ask for title and content if not provided
7. When searching, show results clearly with note titles
8. For reminders, help users pick appropriate times

**Your Personality:**
- Cheerful and encouraging 🎉
- Use relevant emojis naturally
- Celebrate user achievements
- Offer helpful tips about the app

Remember: You're here to make note-taking delightful! ✨`;

// Execute a function call
export async function executeFunctionCall(
    functionCall: GeminiFunctionCall,
    notes: Note[],
    settings: Settings,
    handlers: {
        createNote: (note: Omit<Note, 'id' | 'lastModified'>) => string;
        updateNote: (note: Note) => void;
        deleteNote: (noteId: string) => void;
        updateSettings: (settings: Partial<Settings>) => void;
    }
): Promise<string> {
    const { name, args } = functionCall;

    switch (name) {
        case 'createNote': {
            const newId = handlers.createNote({
                title: (args.title as string) || 'Untitled Note',
                content: (args.content as string) || '',
                media: [],
                isPinned: (args.isPinned as boolean) || false,
                isFavourite: (args.isFavourite as boolean) || false,
                isCompleted: false,
            });
            return JSON.stringify({
                success: true,
                message: `Created note "${args.title}" with ID ${newId}`,
                noteId: newId,
            });
        }

        case 'editNote': {
            const noteId = args.noteId as string;
            const note = notes.find(n => n.id === noteId);
            if (!note) {
                return JSON.stringify({ success: false, error: 'Note not found' });
            }
            const updatedNote: Note = {
                ...note,
                title: (args.title as string) ?? note.title,
                content: (args.content as string) ?? note.content,
                isPinned: (args.isPinned as boolean) ?? note.isPinned,
                isFavourite: (args.isFavourite as boolean) ?? note.isFavourite,
                isCompleted: (args.isCompleted as boolean) ?? note.isCompleted,
                lastModified: new Date().toISOString(),
            };
            handlers.updateNote(updatedNote);
            return JSON.stringify({
                success: true,
                message: `Updated note "${updatedNote.title}"`,
            });
        }

        case 'deleteNote': {
            const noteId = args.noteId as string;
            const note = notes.find(n => n.id === noteId);
            if (!note) {
                return JSON.stringify({ success: false, error: 'Note not found' });
            }
            handlers.deleteNote(noteId);
            return JSON.stringify({
                success: true,
                message: `Deleted note "${note.title}"`,
            });
        }

        case 'searchNotes': {
            const query = (args.query as string).toLowerCase();
            const filter = args.filter as string;
            let results = notes.filter(note => {
                const titleMatch = note.title.toLowerCase().includes(query);
                const contentMatch = note.content.replace(/<[^>]*>/g, '').toLowerCase().includes(query);
                return titleMatch || contentMatch;
            });

            if (filter && filter !== 'all') {
                results = results.filter(note => {
                    switch (filter) {
                        case 'pinned': return note.isPinned;
                        case 'favourite': return note.isFavourite;
                        case 'completed': return note.isCompleted;
                        case 'pending': return !note.isCompleted;
                        case 'with-reminder': return !!note.reminder;
                        default: return true;
                    }
                });
            }

            return JSON.stringify({
                success: true,
                count: results.length,
                notes: results.map(n => ({
                    id: n.id,
                    title: n.title,
                    preview: n.content.replace(/<[^>]*>/g, '').substring(0, 100),
                    isPinned: n.isPinned,
                    isFavourite: n.isFavourite,
                    isCompleted: n.isCompleted,
                    hasReminder: !!n.reminder,
                })),
            });
        }

        case 'listNotes': {
            const filter = args.filter as string;
            const limit = (args.limit as number) || 10;
            let results = [...notes];

            if (filter && filter !== 'all') {
                results = results.filter(note => {
                    switch (filter) {
                        case 'pinned': return note.isPinned;
                        case 'favourite': return note.isFavourite;
                        case 'completed': return note.isCompleted;
                        case 'pending': return !note.isCompleted;
                        case 'with-reminder': return !!note.reminder;
                        default: return true;
                    }
                });
            }

            results = results.slice(0, limit);

            return JSON.stringify({
                success: true,
                count: results.length,
                total: notes.length,
                notes: results.map(n => ({
                    id: n.id,
                    title: n.title,
                    preview: n.content.replace(/<[^>]*>/g, '').substring(0, 100),
                    isPinned: n.isPinned,
                    isFavourite: n.isFavourite,
                    isCompleted: n.isCompleted,
                    hasReminder: !!n.reminder,
                    lastModified: n.lastModified,
                })),
            });
        }

        case 'setReminder': {
            const noteId = args.noteId as string;
            const note = notes.find(n => n.id === noteId);
            if (!note) {
                return JSON.stringify({ success: false, error: 'Note not found' });
            }
            const reminder: Reminder = {
                time: args.time as string,
                repeat: (args.repeat as ReminderRepeat) || 'none',
            };
            const updatedNote: Note = {
                ...note,
                reminder,
                lastModified: new Date().toISOString(),
            };
            handlers.updateNote(updatedNote);
            return JSON.stringify({
                success: true,
                message: `Set reminder for "${note.title}" at ${new Date(reminder.time).toLocaleString()}`,
            });
        }

        case 'removeReminder': {
            const noteId = args.noteId as string;
            const note = notes.find(n => n.id === noteId);
            if (!note) {
                return JSON.stringify({ success: false, error: 'Note not found' });
            }
            const { reminder: _, ...noteWithoutReminder } = note;
            const updatedNote: Note = {
                ...noteWithoutReminder,
                lastModified: new Date().toISOString(),
            };
            handlers.updateNote(updatedNote);
            return JSON.stringify({
                success: true,
                message: `Removed reminder from "${note.title}"`,
            });
        }

        case 'toggleNoteStatus': {
            const noteId = args.noteId as string;
            const status = args.status as string;
            const note = notes.find(n => n.id === noteId);
            if (!note) {
                return JSON.stringify({ success: false, error: 'Note not found' });
            }
            const updatedNote: Note = { ...note, lastModified: new Date().toISOString() };
            switch (status) {
                case 'pin':
                    updatedNote.isPinned = !note.isPinned;
                    break;
                case 'favourite':
                    updatedNote.isFavourite = !note.isFavourite;
                    break;
                case 'completed':
                    updatedNote.isCompleted = !note.isCompleted;
                    break;
            }
            handlers.updateNote(updatedNote);
            return JSON.stringify({
                success: true,
                message: `Toggled ${status} for "${note.title}"`,
                newValue: status === 'pin' ? updatedNote.isPinned : status === 'favourite' ? updatedNote.isFavourite : updatedNote.isCompleted,
            });
        }

        case 'changeTheme': {
            const theme = args.theme as 'light' | 'dark';
            handlers.updateSettings({ theme });
            return JSON.stringify({
                success: true,
                message: `Changed theme to ${theme} mode`,
            });
        }

        case 'updateSettings': {
            const updates: Partial<Settings> = {};
            if (typeof args.autoSave === 'boolean') updates.autoSave = args.autoSave;
            if (typeof args.allowNotifications === 'boolean') updates.allowNotifications = args.allowNotifications;
            if (typeof args.deleteCompletedTasks === 'boolean') updates.deleteCompletedTasks = args.deleteCompletedTasks;
            handlers.updateSettings(updates);
            return JSON.stringify({
                success: true,
                message: `Updated settings: ${Object.keys(updates).join(', ')}`,
            });
        }

        case 'getAppStatus': {
            const pinnedCount = notes.filter(n => n.isPinned).length;
            const favouriteCount = notes.filter(n => n.isFavourite).length;
            const completedCount = notes.filter(n => n.isCompleted).length;
            const withReminderCount = notes.filter(n => n.reminder).length;
            return JSON.stringify({
                success: true,
                status: {
                    totalNotes: notes.length,
                    pinnedNotes: pinnedCount,
                    favouriteNotes: favouriteCount,
                    completedNotes: completedCount,
                    pendingNotes: notes.length - completedCount,
                    notesWithReminders: withReminderCount,
                    theme: settings.theme,
                    autoSave: settings.autoSave,
                    notifications: settings.allowNotifications,
                },
            });
        }

        default:
            return JSON.stringify({ success: false, error: `Unknown function: ${name}` });
    }
}

// Send message to Gemini API
export async function sendMessageToGemini(
    apiKey: string,
    conversationHistory: GeminiContent[],
    userMessage: string,
    notes: Note[],
    settings: Settings,
    handlers: {
        createNote: (note: Omit<Note, 'id' | 'lastModified'>) => string;
        updateNote: (note: Note) => void;
        deleteNote: (noteId: string) => void;
        updateSettings: (settings: Partial<Settings>) => void;
    }
): Promise<{ response: string; functionCalls: Array<{ name: string; args: Record<string, unknown>; result: string }> }> {
    // Using gemini-1.5-flash - stable model with generous free tier (15 RPM, 1M tokens/day)
    // Alternative models: gemini-2.5-flash-preview-05-20, gemini-1.5-pro
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    // Build conversation with system prompt
    const contents: GeminiContent[] = [
        ...conversationHistory,
        {
            role: 'user',
            parts: [{ text: userMessage }],
        },
    ];

    const functionCalls: Array<{ name: string; args: Record<string, unknown>; result: string }> = [];
    let currentContents = contents;
    let finalResponse = '';
    let iterations = 0;
    const maxIterations = 5; // Prevent infinite loops

    while (iterations < maxIterations) {
        iterations++;

        const requestBody = {
            contents: currentContents,
            systemInstruction: {
                parts: [{ text: SYSTEM_PROMPT }],
            },
            tools: [{ functionDeclarations: CHATBOT_FUNCTIONS.declarations }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 1024,
            },
        };

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            if (response.status === 429) {
                throw new Error('Rate limit exceeded. Please wait a moment and try again.');
            } else if (response.status === 400) {
                throw new Error('Invalid API key. Please check your key in Settings.');
            } else if (response.status === 403) {
                throw new Error('API key does not have access. Please check your key permissions.');
            } else {
                throw new Error(errorData?.error?.message || `API Error: ${response.status}`);
            }
        }

        const data: GeminiResponse = await response.json();

        if (data.error) {
            throw new Error(data.error.message);
        }

        if (!data.candidates || data.candidates.length === 0) {
            throw new Error('No response from AI');
        }

        const candidate = data.candidates[0];
        const parts = candidate.content.parts;

        // Check for function calls
        const functionCallPart = parts.find(p => p.functionCall);

        if (functionCallPart && functionCallPart.functionCall) {
            const fc = functionCallPart.functionCall;

            // Execute the function
            const result = await executeFunctionCall(fc, notes, settings, handlers);

            functionCalls.push({
                name: fc.name,
                args: fc.args,
                result,
            });

            // Add the model's function call and function response to conversation
            currentContents = [
                ...currentContents,
                {
                    role: 'model',
                    parts: [{ functionCall: fc }],
                },
                {
                    role: 'user',
                    parts: [{
                        functionResponse: {
                            name: fc.name,
                            response: { result },
                        },
                    }],
                },
            ];

            // Continue the loop to get the final text response
            continue;
        }

        // If no function call, we have the final text response
        const textPart = parts.find(p => p.text);
        if (textPart && textPart.text) {
            finalResponse = textPart.text;
        }

        break;
    }

    return { response: finalResponse, functionCalls };
}
