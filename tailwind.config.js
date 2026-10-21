/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: '#000000',
          subtle: '#09090b',
          card: '#121215',
          elevated: '#1a1a1f',
        },
        border: {
          subtle: '#27272a',
          strong: '#3f3f46',
          brand: '#E1306C',
        },
        brand: {
          pink: '#E1306C',
          rose: '#D62976',
          purple: '#833AB4',
          orange: '#F58529',
          red: '#FD1D1D',
          blue: '#0095F6',
          dark: '#121215',
          card: '#18181b',
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'card': '0 2px 10px rgba(0, 0, 0, 0.4)',
        'card-hover': '0 8px 30px rgba(0, 0, 0, 0.6)',
        'brand': '0 4px 14px 0 rgba(225, 48, 108, 0.35)',
      }
    },
  },
  plugins: [],
}
