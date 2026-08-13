/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './lms/**/*.{ts,tsx}',
    './App.tsx',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Folder 1 NERMAI IAS color system
        background: '#0B0B14',
        surface: '#1a1a2e',
        surfaceHighlight: '#252542',
        accent: '#8B0000',
        'accent-light': '#B22222',
        primary: '#6B0000',
        textPrimary: '#FFFFFF',
        textSecondary: '#9CA3AF',
        error: '#FF3333',
        success: '#22C55E',
        warning: '#F59E0B',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
    },
  },
  plugins: [],
};
