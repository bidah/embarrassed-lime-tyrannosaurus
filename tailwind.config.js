/** @type {import('tailwindcss').Config} */
// Mirrors the "Nocturne" tokens in src/theme.ts so `className` stays on-system.
module.exports = {
  content: ['./index.ts', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#08080B',
          900: '#0E0E13',
          850: '#14141A',
          800: '#1B1B23',
          700: '#26262F',
          600: '#34343F',
          500: '#4A4A57',
          400: '#6E6E7C',
          300: '#9A9AA8',
          200: '#C7C7D1',
          100: '#E6E6EC',
          50: '#F5F5F8',
        },
        iris: { 400: '#A396FF', 500: '#8B7CFF', 600: '#7262F2', 700: '#5B4BD6' },
        mint: '#4FE0B0',
        amber: '#FFB547',
        coral: '#FF6B6B',
        sky: '#5AC8FA',
        rose: '#FF7AC6',
        lime: '#B8F05A',
      },
      borderRadius: { xs: '6px', sm: '10px', md: '14px', lg: '20px', xl: '28px' },
    },
  },
  plugins: [],
};
