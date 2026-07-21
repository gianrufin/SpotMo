/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './admin.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // "Tokyo Neon" — Material 3 tonal roles, theme-aware via CSS variables.
        // brand/brandsoft/brandsoftfg are kept as aliases for primary/
        // primary-container so the ~20 existing call sites didn't need touching.
        brand: 'rgb(var(--c-primary) / <alpha-value>)',
        onbrand: 'rgb(var(--c-on-primary) / <alpha-value>)',
        brandsoft: 'rgb(var(--c-brand-soft) / <alpha-value>)',
        brandsoftfg: 'rgb(var(--c-brand-soft-fg) / <alpha-value>)',

        secondary: 'rgb(var(--c-secondary) / <alpha-value>)',
        onsecondary: 'rgb(var(--c-on-secondary) / <alpha-value>)',
        secondarysoft: 'rgb(var(--c-secondary-container) / <alpha-value>)',
        secondarysoftfg: 'rgb(var(--c-on-secondary-container) / <alpha-value>)',

        tertiary: 'rgb(var(--c-tertiary) / <alpha-value>)',
        ontertiary: 'rgb(var(--c-on-tertiary) / <alpha-value>)',
        tertiarysoft: 'rgb(var(--c-tertiary-container) / <alpha-value>)',
        tertiarysoftfg: 'rgb(var(--c-on-tertiary-container) / <alpha-value>)',

        errorc: 'rgb(var(--c-error) / <alpha-value>)',

        // Theme-aware semantic tokens (flip in dark mode via CSS variables)
        ink: 'rgb(var(--c-fg) / <alpha-value>)', // primary text + inverse pill bg
        onink: 'rgb(var(--c-on-fg) / <alpha-value>)', // text/icons on an ink surface
        muted: 'rgb(var(--c-muted) / <alpha-value>)', // secondary text
        surface: 'rgb(var(--c-surface) / <alpha-value>)', // subtle fill
        hairline: 'rgb(var(--c-line) / <alpha-value>)', // borders
        card: 'rgb(var(--c-card) / <alpha-value>)', // elevated surface
        bg: 'rgb(var(--c-bg) / <alpha-value>)', // screen background
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
        // Material 3 elevation levels (approx. official spec shadow pairs)
        soft: '0 1px 2px 0 rgba(0,0,0,0.30), 0 1px 3px 1px rgba(0,0,0,0.15)', // elevation 1
        card: '0 1px 2px 0 rgba(0,0,0,0.30), 0 2px 6px 2px rgba(0,0,0,0.15)', // elevation 2
        float: '0 4px 8px 3px rgba(0,0,0,0.15), 0 1px 3px 0 rgba(0,0,0,0.30)', // elevation 3
        fab: '0 6px 10px 4px rgba(0,0,0,0.15), 0 2px 3px 0 rgba(0,0,0,0.30)', // elevation 4
        pin: '0 6px 16px -4px rgba(0,0,0,0.45)',
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
        ripple: {
          from: { transform: 'scale(0)', opacity: '0.35' },
          to: { transform: 'scale(1)', opacity: '0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out',
        'slide-up': 'slide-up 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
        ripple: 'ripple 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
};
