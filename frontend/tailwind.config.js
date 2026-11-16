/** Nodemore design tokens: brand black + violet, lilac working surfaces, Sora display, Noto body (covers Sinhala & Tamil). */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: '#000000',
        violet: { 50: '#F5F0FF', 100: '#EADFFF', 200: '#D4BEFF', 300: '#B48CFF', 400: '#9A5CFF', 500: '#7B2FF7', 600: '#6A1FE0', 700: '#5716B8', 800: '#43128C', 900: '#2E0C61' },
        mist: '#F4F2FA',
        slate: { 950: '#14111F' },
        live: '#FF3B5C',
      },
      fontFamily: {
        display: ['Sora', '"Noto Sans Sinhala"', '"Noto Sans Tamil"', 'system-ui', 'sans-serif'],
        sans: ['"Noto Sans"', '"Noto Sans Sinhala"', '"Noto Sans Tamil"', 'system-ui', 'sans-serif'],
      },
      borderRadius: { panel: '18px' },
      boxShadow: { panel: '0 1px 0 rgba(20,17,31,.04), 0 8px 24px -12px rgba(46,12,97,.18)' },
    },
  },
  plugins: [],
};
