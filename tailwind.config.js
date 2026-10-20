/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--bg) / <alpha-value>)',
        panel: 'rgb(var(--panel) / <alpha-value>)',
        panel2: 'rgb(var(--panel2) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        fg: 'rgb(var(--fg) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        volt: 'rgb(var(--volt) / <alpha-value>)',
        warn: 'rgb(var(--warn) / <alpha-value>)',
        bad: 'rgb(var(--bad) / <alpha-value>)',
        good: 'rgb(var(--good) / <alpha-value>)',
        sky: 'rgb(var(--sky) / <alpha-value>)',
        ground: '#efeeea',
        surface: '#ffffff',
        'surface-2': '#e4e2dc',
        ink: { DEFAULT: '#141413', 2: '#3a3833', 3: '#4a4843' },
        accent: '#d4f046',
      },
      textColor: {
        volt: 'rgb(var(--volt-text) / <alpha-value>)',
      },
      borderRadius: {
        paper: '2px',
      },
      boxShadow: {
        paper: '0 1px 0 #d6d3cb, 0 18px 40px rgba(20, 20, 19, 0.12)',
      },
      fontFamily: {
        sans: ['"Archivo Variable"', 'Archivo', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  safelist: ['text-volt', 'text-warn', 'text-bad', 'text-good', 'bg-volt', 'bg-warn', 'bg-bad', 'bg-good', 'bg-sky'],
  plugins: [],
};
