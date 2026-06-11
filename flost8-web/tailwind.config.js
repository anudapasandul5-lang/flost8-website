/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        /* legacy — KEEP for bookings page */
        navy:     '#302A66',
        purple:   '#AE43F7',
        cyan:     '#70F0F2',
        red:      '#F20D0D',
        lime:     '#CCFF00',
        'hot-pink': '#FF6FAA',
        orange:   '#E07040',
        cream:    '#F5F0E8',
        'off-black': '#111118',
        /* rebuild — single-purple system (homepage) */
        base:     '#120917',
        'base-raise': '#1B0F24',
        ink:      '#FFFFFF',
        accent:   '#9D14FF',
        'accent-ink': '#C88BFF',
      },
      fontFamily: {
        display: ['Bebas Neue', 'sans-serif'],
        script:  ['Hyperwave', 'cursive'],
        body:    ['Circe', 'sans-serif'],
        grotesk: ['Space Grotesk', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
