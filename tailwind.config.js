/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F9F8F4',
        ink: '#111827',
        saffron: '#D97706',
        emerald: '#059669',
        'stone-border': '#E5E7EB',
      },
      fontFamily: {
        display: ['Fraunces', 'serif'],
        sans: ['"Plus Jakarta Sans"', '"Noto Sans Bengali"', 'sans-serif'],
        calligraphy: ['Galada', 'cursive'],
      },
    },
  },
  plugins: [],
};
