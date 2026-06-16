/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#e6f1fb',
          100: '#b5d4f4',
          400: '#378add',
          600: '#185fa5',
          900: '#042c53',
        },
        green: {
          500: '#1d9e75',
          700: '#0f6e56',
        },
        red: {
          500: '#e24b4a',
          700: '#a32d2d',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
