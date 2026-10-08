/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        /* rebuild — single-purple system */
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
