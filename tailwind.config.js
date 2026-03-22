/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#1c1710',
          surface: '#2a2318',
          border: '#3d3426',
          amber: '#EF9F27',
          amberDark: '#854F0B',
          muted: '#888780',
          faint: '#555048',
        },
      },
    },
  },
  plugins: [],
};
