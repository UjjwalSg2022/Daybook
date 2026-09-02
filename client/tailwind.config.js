/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F2EFE4',
        'paper-dark': '#E8E3D3',
        ink: '#1E2A38',
        'ink-soft': '#4B5A6B',
        rule: '#C9C2AC',
        ledger: {
          DEFAULT: '#2F5D50',
          light: '#3F7A69',
          dark: '#22453C',
        },
        stamp: '#9B3B3B',
        gold: '#B08D57',
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};