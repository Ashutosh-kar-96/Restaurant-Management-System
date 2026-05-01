/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary:   { DEFAULT: '#FF6B35', 50: '#FFF4F0', 100: '#FFE4D9', 500: '#FF6B35', 600: '#E55A25', 700: '#C44A18' },
        secondary: { DEFAULT: '#1A1A2E', 500: '#1A1A2E', 600: '#16213E', 700: '#0F3460' },
        accent:    { DEFAULT: '#F7C59F', 500: '#F7C59F' },
        success:   '#22C55E',
        warning:   '#F59E0B',
        danger:    '#EF4444',
        info:      '#3B82F6',
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      boxShadow: {
        card: '0 2px 8px rgba(0,0,0,0.08)',
        modal: '0 20px 60px rgba(0,0,0,0.15)',
      },
      animation: {
        'fade-in':    'fadeIn 0.2s ease-out',
        'slide-up':   'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'pulse-soft': 'pulseSoft 2s infinite',
      },
      keyframes: {
        fadeIn:    { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp:   { from: { opacity: 0, transform: 'translateY(10px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        slideDown: { from: { opacity: 0, transform: 'translateY(-10px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        pulseSoft: { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.7 } },
      },
    },
  },
  plugins: [],
};
