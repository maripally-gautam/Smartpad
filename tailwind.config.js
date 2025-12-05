/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./screens/**/*.{js,ts,jsx,tsx}",
        "./hooks/**/*.{js,ts,jsx,tsx}",
        "./context/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                // Dark mode colors - richer, more vibrant
                'primary': '#111827',        // Darker, deeper background
                'secondary': '#1F2937',      // Slightly lighter secondary
                'accent': '#3B82F6',         // Vibrant blue accent
                'accent-light': '#60A5FA',   // Lighter accent for hover
                'text-primary': '#F9FAFB',   // Bright white text
                'text-secondary': '#9CA3AF', // Softer gray for secondary text
                'border-color': '#374151',   // Visible but subtle borders
                // Accent colors for variety
                'success': '#10B981',        // Green for success states
                'warning': '#F59E0B',        // Amber for warnings
                'danger': '#EF4444',         // Red for danger/delete
                'info': '#06B6D4',           // Cyan for info
                'purple-accent': '#8B5CF6',  // Purple for special states
            }
        }
    },
    plugins: [],
}
