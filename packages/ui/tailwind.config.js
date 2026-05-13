/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          900: 'var(--bg-0)',
          800: 'var(--bg-1)',
          700: 'var(--bg-2)',
          600: 'var(--bg-3)',
          500: 'var(--bg-4)',
          400: 'var(--line)',
          300: 'var(--fg-2)',
          200: 'var(--fg-1)',
          100: 'var(--fg-0)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          soft: 'var(--accent)',
          warm: 'var(--warm)',
          good: 'var(--good)',
          bad: 'var(--bad)',
        },
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
