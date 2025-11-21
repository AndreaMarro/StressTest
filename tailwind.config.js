/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'neo': '4px 4px 0px 0px rgba(0,0,0,1)',
        'neo-sm': '2px 2px 0px 0px rgba(0,0,0,1)',
        'neo-lg': '8px 8px 0px 0px rgba(0,0,0,1)',
      },
      colors: {
        'neo-lime': '#a3e635',
        'neo-blue': '#60a5fa',
        'neo-red': '#f87171',
        'neo-yellow': '#fef08a',
        'neo-purple': '#c084fc',
        'neo-bg': '#fdfbf7',
      }
    },
  },
  plugins: [],
}
