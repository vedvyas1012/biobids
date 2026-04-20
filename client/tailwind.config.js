/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#2d6a4f', light: '#40916c', dark: '#1b4332', 50: '#f0fdf4', 100: '#dcfce7' },
        accent: { DEFAULT: '#f77f00', light: '#fb8c00', dark: '#e65100' },
      },
    },
  },
  plugins: [],
};
