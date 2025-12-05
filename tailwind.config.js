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
                'primary': '#0F172A',
                'secondary': '#1E293B',
                'accent': '#38BDF8',
                'text-primary': '#F8FAFC',
                'text-secondary': '#94A3B8',
                'border-color': '#334155',
            }
        }
    },
    plugins: [],
}
