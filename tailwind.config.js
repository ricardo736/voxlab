/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./www/index.html",
    "./pitch-perfector2/index.html",
    "./*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {},
  },
  plugins: [],
}
