/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#F5F7FB',
        card: '#FFFFFF',
        'navy-primary': '#17365A',
        'navy-secondary': '#24486F',
        'blue-primary': '#3478CC',
        'blue-light': '#EAF2FF',
        'text-primary': '#172D4A',
        'text-secondary': '#6B7890',
        border: '#E1E7EF',
        positive: '#16845D',
        negative: '#D84E4E',
        warning: '#D99120',
      },
      spacing: {
        '4.5': '1.125rem',
        '8.5': '2.125rem',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'card': '12px',
        'card-lg': '16px',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(23,45,74,0.06), 0 1px 2px rgba(23,45,74,0.04)',
        'card-hover': '0 4px 12px rgba(23,45,74,0.10), 0 2px 4px rgba(23,45,74,0.06)',
        'dropdown': '0 8px 24px rgba(23,45,74,0.12)',
      },
    },
  },
  plugins: [],
}
