/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        groww: {
          green: '#00D09C',
          red: '#EB5B3C',
          dark: '#0D1117',
          card: '#161B22',
          border: '#30363D'
        }
      }
    },
  },
  plugins: [],
}