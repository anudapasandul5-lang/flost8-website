/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy:     '#1A1535',
        purple:   '#7B3FF5',
        cyan:     '#78F4F5',
        red:      '#E63946',
        lime:     '#CCFF00',
        'hot-pink': '#FF6FAA',
        orange:   '#E07040',
        cream:    '#F5F0E8',
        'off-black': '#111118',
      },
      fontFamily: {
        display: ['Bebas Neue', 'sans-serif'],
        script:  ['Caveat', 'cursive'],
        body:    ['Outfit', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
