/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "var(--ink)",
          muted: "var(--ink-muted)",
        },
        charcoal: "var(--charcoal)",
        paper: {
          DEFAULT: "var(--paper)",
          raised: "var(--paper-raised)",
        },
        taupe: "var(--taupe)",
        hairline: "var(--hairline)",
        brass: {
          DEFAULT: "var(--brass)",
          deep: "var(--brass-deep)",
        },
        forest: "var(--forest)",
        rust: "var(--rust)",
        amber: {
          flag: "var(--amber-flag)",
        },
      },
      fontFamily: {
        serif: ['Fraunces', 'Source Serif 4', 'serif'],
        sans: ['Inter', 'Public Sans', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"IBM Plex Mono"', 'monospace'],
      },
      borderRadius: {
        sm: '2px',
        md: '4px',
        lg: '6px',
        xl: '6px',
        '2xl': '6px',
        '3xl': '6px',
      },
      boxShadow: {
        sm: 'none',
        DEFAULT: 'none',
        md: 'none',
        lg: 'none',
        xl: 'none',
        '2xl': 'none',
        inner: 'none',
      }
    },
  },
  plugins: [],
}
