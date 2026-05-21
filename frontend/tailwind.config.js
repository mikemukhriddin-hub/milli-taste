/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fcf8f2',
          100: '#f7ecd9',
          200: '#eed7b2',
          300: '#e1b980',
          400: '#d39851',
          500: '#c5782f', // Warm amber brand color for foods
          600: '#b66125',
          700: '#974b20',
          800: '#7a3c1e',
          900: '#63331b',
        },
        dark: {
          50: '#f6f6f6',
          100: '#e7e7e7',
          200: '#d1d1d1',
          300: '#b0b0b0',
          400: '#888888',
          500: '#6d6d6d',
          600: '#5d5d5d',
          700: '#4f4f4f',
          800: '#373737',
          900: '#222222',
          950: '#0f0f11'
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'premium': '0 8px 30px rgb(0, 0, 0, 0.12)',
        'premium-hover': '0 12px 40px rgb(0, 0, 0, 0.2)',
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
      }
    },
  },
  plugins: [],
}
