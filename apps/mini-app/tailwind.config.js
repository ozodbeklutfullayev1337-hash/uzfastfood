/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ivory: '#FAF7F2',
        cream: '#F2ECE1',
        obsidian: '#0F0F0F',
        crimson: '#B91C1C',
        gold: '#C59B27',
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        luxury: '0 20px 50px -12px rgba(15, 15, 15, 0.14)',
        gold: '0 10px 30px -5px rgba(197, 155, 39, 0.35)',
      },
    },
  },
  plugins: [],
};