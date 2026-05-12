/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Highly Curated Premium Palette from Coolors.co
        // https://coolors.co/050505-1b1b1e-373f51-008dd5-df3b57
        background: '#050505', // Deep Obsidian
        surface: '#1b1b1e',    // Rich Charcoal
        surface_light: '#373f51', // Slate Grey
        primary: {
          DEFAULT: '#008dd5',  // Electric Blue
          hover: '#007bb5',
        },
        secondary: {
          DEFAULT: '#df3b57',  // Vibrant Crimson/Rose
          hover: '#c8344e',
        },
        accent: '#008dd5',
        text: {
          DEFAULT: '#ffffff',
          muted: '#a1a1aa', // zinc-400
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
        outfit: ['Outfit', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
