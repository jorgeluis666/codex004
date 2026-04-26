/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#17202a',
        carbon: '#24313f',
        lime: '#b6ff5d',
        coral: '#ff6b57',
        pool: '#2bbbd8',
        grape: '#6f5bd7',
        paper: '#f7f6f2',
      },
      boxShadow: {
        soft: '0 18px 60px rgba(23, 32, 42, 0.10)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
