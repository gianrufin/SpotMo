/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // SpotMo brand palette (muted, flat green — static across themes)
        brand: {
          DEFAULT: '#2F7D5A',
          50: '#EEF6F1',
          100: '#DBEBE2',
          200: '#B4D6C6',
          300: '#82B7A0',
          400: '#4E967A',
          500: '#2F7D5A',
          600: '#276A4C',
          700: '#1F5540',
        },
        // Theme-aware semantic tokens (flip in dark mode via CSS variables)
        ink: 'rgb(var(--c-fg) / <alpha-value>)', // primary text + inverse pill bg
        onink: 'rgb(var(--c-on-fg) / <alpha-value>)', // text/icons on an ink surface
        muted: 'rgb(var(--c-muted) / <alpha-value>)', // secondary text
        surface: 'rgb(var(--c-surface) / <alpha-value>)', // subtle fill
        hairline: 'rgb(var(--c-line) / <alpha-value>)', // borders
        card: 'rgb(var(--c-card) / <alpha-value>)', // elevated surface
        bg: 'rgb(var(--c-bg) / <alpha-value>)', // screen background
        brandsoft: 'rgb(var(--c-brand-soft) / <alpha-value>)', // tinted brand fill
        brandsoftfg: 'rgb(var(--c-brand-soft-fg) / <alpha-value>)', // text on tint
      },
      fontFamily: {
        // Inter is the app-wide default now — `font-serif` intentionally
        // maps to it too, so every existing heading/label just becomes Inter
        // without touching each usage. `font-title` is the one deliberate
        // exception: reserved for event titles only.
        serif: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        title: ['"Instrument Serif"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontWeight: {
        // Inter 300 is the default per brand guidelines
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        soft: '0 4px 24px -8px rgba(17, 24, 39, 0.12)',
        card: '0 8px 30px -12px rgba(17, 24, 39, 0.18)',
        float: '0 12px 40px -12px rgba(17, 24, 39, 0.25)',
        pin: '0 6px 16px -4px rgba(17, 24, 39, 0.35)',
      },
      backdropBlur: {
        xs: '2px',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out',
        'slide-up': 'slide-up 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
};
