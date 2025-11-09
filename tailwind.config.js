/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // Matches your setup
  content: [
    "./*.{html,js}", // Scans all HTML/JS files
  ],
  theme: {
    extend: {},
  },
  plugins: [
    require('@tailwindcss/typography'), // For your 'prose' class
  ],
}
