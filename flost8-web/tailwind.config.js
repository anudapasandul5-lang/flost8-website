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
        steel:    '#5E79A6',
        brick:    '#EA4323',
      },
      fontFamily: {
        display:   ['Bebas Neue', 'sans-serif'],
        script:    ['Hyperwave', 'cursive'],
        body:      ['Circe', 'sans-serif'],
        league:    ['League Gothic', 'sans-serif'],
      },
      spacing: {
        'gutter': 'clamp(1rem, 4vw, 3rem)',
        'section': 'clamp(4rem, 9vw, 7.5rem)',
        'section-tight': 'clamp(2.5rem, 5vw, 4rem)',
      },
      borderRadius: {
        'card': '1.25rem',
        'tile': '1.75rem',
      },
      fontSize: {
        'display-2xl': ['clamp(4.5rem, 11vw, 10rem)', { lineHeight: '0.88' }],
        'display-xl':  ['clamp(3.5rem, 8vw, 7rem)',   { lineHeight: '0.92' }],
        'display-lg':  ['clamp(2.5rem, 5.5vw, 4.5rem)', { lineHeight: '0.95' }],
        'display-md':  ['clamp(1.75rem, 3.5vw, 2.75rem)', { lineHeight: '1' }],
      },
      boxShadow: {
        'pop': '0 6px 0 rgba(17,17,24,0.85)',
        'card': '0 10px 24px rgba(0,0,0,0.25)',
      },
    },
  },
  plugins: [],
}
