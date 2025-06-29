/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      screens: {
        'xs': '480px',
      },
      minHeight: {
        '0': '0',
        'screen-content': 'calc(100vh - 4rem)',
      },
      maxHeight: {
        'screen-content': 'calc(100vh - 4rem)',
      },
    },
  },
  plugins: [],
};