/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'primary': '#0ea5e9', // sky-500
        'success': '#22c55e', // green-500
        'warning': '#f97316', // orange-500
        'danger': '#ef4444', // red-500
      }
    },
  },
  plugins: [],
}
