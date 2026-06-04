/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Quicksand', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#F5F3FF',
          100: '#EDE9FE',
          200: '#DDD6FE',
          300: '#C4B5FD',
          400: '#A78BFA',
          500: '#8B5CF6',
          600: '#7C3AED',
          700: '#6D28D9',
        },
        pastel: {
          purple: {
            light: '#F5F3FF',
            border: '#DDD6FE',
            text: '#7C3AED',
            solid: '#8B5CF6',
          },
          green: {
            light: '#ECFDF5',
            border: '#A7F3D0',
            text: '#059669',
            solid: '#10B981',
          },
          pink: {
            light: '#FFF1F2',
            border: '#FECDD3',
            text: '#E11D48',
            solid: '#F43F5E',
          },
          orange: {
            light: '#FFF7ED',
            border: '#FFEDD5',
            text: '#D97706',
            solid: '#F97316',
          },
          blue: {
            light: '#F0F9FF',
            border: '#BAE6FD',
            text: '#0284C7',
            solid: '#3B82F6',
          }
        }
      }
    },
  },
  plugins: [],
}
