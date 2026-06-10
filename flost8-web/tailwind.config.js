/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy:     '#302A66',
        purple:   '#AE43F7',
        cyan:     '#70F0F2',
        red:      '#F20D0D',
        lime:     '#CCFF00',
        'hot-pink': '#FF6FAA',
        orange:   '#E07040',
        cream:    '#F5F0E8',
        'off-black': '#111118',
      },
      fontFamily: {
        display: ['Bebas Neue', 'sans-serif'],
        script:  ['Hyperwave', 'cursive'],
        body:    ['Circe', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
