/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      boxShadow: {
        'neo': '4px 4px 0px 0px rgba(0,0,0,1)',
        'neo-sm': '2px 2px 0px 0px rgba(0,0,0,1)',
        'neo-lg': '8px 8px 0px 0px rgba(0,0,0,1)',
      },
      colors: {
        terminal: {
          black: 'rgb(var(--terminal-black) / <alpha-value>)',
          dark: 'rgb(var(--terminal-dark) / <alpha-value>)',
          text: 'rgb(var(--terminal-text) / <alpha-value>)',
          green: 'rgb(var(--terminal-green) / <alpha-value>)',
          red: 'rgb(var(--terminal-red) / <alpha-value>)',
          dim: 'rgb(var(--terminal-dim) / <alpha-value>)',
          accent: 'rgb(var(--terminal-accent) / <alpha-value>)',
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Courier Prime"', 'monospace'],
      },
      backgroundImage: {
        'grid-pattern': "linear-gradient(to right, #1a1a1a 1px, transparent 1px), linear-gradient(to bottom, #1a1a1a 1px, transparent 1px)",
      },
      animation: {
        'blink': 'blink 1s step-end infinite',
        'scanline': 'scanline 8s linear infinite',
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        }
      }
    },
  },
  plugins: [],
}
