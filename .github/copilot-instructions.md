# Smartpad - Copilot Instructions

## Project Overview
Smartpad is a React + TypeScript mobile notes app built with Capacitor for Android deployment. It uses Vite for bundling and Tailwind CSS for styling.

## Architecture

### Screen-based Navigation (No Router)
Navigation is managed via `useNavigationHistory` hook using browser history API - not React Router. The `App.tsx` renders screens conditionally based on `currentScreen` state:
- `'list'` → `NotesListScreen` (default)
- `'editor'` → `NoteEditorScreen`
- `'settings'` → `SettingsScreen`

Navigate using: `navigate(screen, noteId?)` and `goBack()`. The `registerBackHandler` pattern allows screens to intercept back navigation (e.g., for unsaved changes).

### State Management
- **Global state**: `AppContext` provides `notes`, `setNotes`, `settings`, `setSettings`
- **Persistence**: `useLocalStorage<T>(key, initial)` hook syncs state to localStorage
- **No external state library** - React Context + hooks only

### Custom Hooks Pattern (`hooks/`)
All cross-cutting concerns are encapsulated in hooks:
| Hook | Purpose |
|------|---------|
| `useLocalStorage` | Persistent state with localStorage |
| `useNavigationHistory` | Screen navigation + history management |
| `useTheme` | Toggles `dark` class on `<html>` |
| `useCapacitorSetup` | Splash screen, status bar, Android back button |
| `useLocalNotifications` | Schedule/cancel reminder notifications |

### Types (`types.ts`)
Core types: `Note`, `MediaAttachment`, `Reminder`, `Settings`, `Screen`, `Theme`. Always import from `./types` - never inline these interfaces.

## Styling Conventions

### Tailwind + Dark Mode
- Use `dark:` prefix for dark mode variants
- Custom colors from Tailwind config: `bg-primary`, `bg-secondary`, `text-primary`, `text-secondary`, `border-color`, `accent`
- Pattern: `bg-white dark:bg-primary` for backgrounds, `text-slate-800 dark:text-text-primary` for text

### Component Structure
- Interactive elements use `transition-colors` and `hover:` states
- Focus states: `focus:outline-none focus:ring-2 focus:ring-accent`
- Active tap feedback: `active:scale-95`

## Capacitor Integration

### Native Features
- **Camera**: `@capacitor/camera` for image capture/gallery
- **Voice Recording**: `capacitor-voice-recorder` for audio notes
- **TTS**: `@capacitor-community/text-to-speech` for read-aloud
- **Notifications**: `@capacitor/local-notifications` for reminders
- **Keyboard**: `@capacitor/keyboard` for mobile keyboard handling

### Android Back Button
Handled in `useCapacitorSetup`. Screens can block back navigation by registering a handler via `registerBackHandler((handler) => boolean)`.

## Key Files Reference
- `App.tsx` - Root component, screen routing, note CRUD operations
- `types.ts` - All TypeScript interfaces
- `constants.ts` - Initial settings defaults
- `capacitor.config.ts` - Plugin configuration (splash, status bar, notifications)
- `components/Icon.tsx` - SVG icon component with `name` prop mapping

## Development Commands
```bash
npm install          # Install dependencies
npm run dev          # Start Vite dev server (port 3000)
npm run build        # TypeScript check + Vite build to dist/
npm run lint         # Run ESLint on TypeScript files
```

## Android Build Process
Full workflow from source to APK:
```bash
npm run build        # 1. Build web assets to dist/
npx cap sync         # 2. Sync web assets + plugins to android/
npx cap open android # 3. Open in Android Studio
```
In Android Studio: **Build > Build Bundle(s) / APK(s) > Build APK(s)**

APK output location: `android/app/build/outputs/apk/debug/app-debug.apk`

For live reload during development:
```bash
npx cap run android  # Build and run on connected device/emulator
```

## Environment Variables
Create `.env.local` with:
```
GEMINI_API_KEY=your_api_key_here
```
Accessed via `process.env.GEMINI_API_KEY` (configured in `vite.config.ts`).

## Common Patterns

### Creating Modals
Use the `Modal` component from `components/Modal.tsx`:
```tsx
<Modal isOpen={isOpen} onClose={handleClose} title="Modal Title">
  {/* content */}
</Modal>
```

### Adding Icons
Add SVG path to `icons` object in `components/Icon.tsx`, then use `<Icon name="iconName" className="w-5 h-5" />`.

### Note Operations
All note mutations flow through `App.tsx` handlers (`handleSaveNote`, `handleUpdateNote`, `deleteNoteById`) which update the `notes` array via `setNotes`.
