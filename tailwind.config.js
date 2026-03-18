/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#f8f9fa',
        foreground: '#1f2937',
        accent: '#6dd25e',
        muted: '#e5e7eb',
        mutedForeground: '#6b7280',
        chatUser: '#6dd25e',
        chatAI: '#ffffff',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
