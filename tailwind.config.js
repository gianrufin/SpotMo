/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // SpotMo brand palette
        brand: {
          DEFAULT: '#10B981', // emerald accent
          50: '#ECFDF5',
          100: '#D1FAE5',
          200: '#A7F3D0',
          300: '#6EE7B7',
          400: '#34D399',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
        },
        ink: '#111827', // near-black text / primary buttons
        muted: '#6B7280', // gray
        surface: '#F1F5F9', // light surface
        hairline: '#E5E7EB', // borders
      },
      fontFamily: {
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
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
