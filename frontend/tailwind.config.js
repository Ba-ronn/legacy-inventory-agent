/** @type {import('tailwindcss').Config} */
const token = (name) => `rgb(var(${name}) / <alpha-value>)`;

export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* Surfaces, back to front. */
        canvas: token('--c-canvas'),
        surface: {
          DEFAULT: token('--c-surface'),
          raised: token('--c-surface-raised'),
          sunken: token('--c-surface-sunken'),
        },
        line: {
          DEFAULT: token('--c-line'),
          strong: token('--c-line-strong'),
        },

        /* Content. */
        ink: {
          DEFAULT: token('--c-ink'),
          muted: token('--c-ink-muted'),
          faint: token('--c-ink-faint'),
          inverse: token('--c-ink-inverse'),
        },

        /* Brand. */
        primary: {
          DEFAULT: token('--c-primary'),
          hover: token('--c-primary-hover'),
          soft: token('--c-primary-soft'),
          on: token('--c-on-primary'),
        },
        accent: {
          DEFAULT: token('--c-accent'),
          soft: token('--c-accent-soft'),
        },

        /* Status — never reuse brand colours for these. */
        danger: {
          DEFAULT: token('--c-danger'),
          soft: token('--c-danger-soft'),
        },
        warning: {
          DEFAULT: token('--c-warning'),
          soft: token('--c-warning-soft'),
        },
        success: {
          DEFAULT: token('--c-success'),
          soft: token('--c-success-soft'),
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        /* A fluid display scale so the hero never overwhelms a laptop. */
        'display-lg': ['clamp(2.5rem, 1.6rem + 3.6vw, 4rem)', { lineHeight: '1.04', letterSpacing: '-0.03em' }],
        'display': ['clamp(1.9rem, 1.4rem + 2vw, 2.75rem)', { lineHeight: '1.1', letterSpacing: '-0.025em' }],
      },
      borderRadius: {
        card: '1rem',
        field: '0.75rem',
        pill: '999px',
      },
      boxShadow: {
        /* Layered, low-opacity shadows read as depth; one huge blur reads as fog. */
        soft: '0 1px 2px rgb(var(--c-shadow) / 0.06), 0 2px 8px rgb(var(--c-shadow) / 0.06)',
        card: '0 1px 2px rgb(var(--c-shadow) / 0.08), 0 8px 24px -8px rgb(var(--c-shadow) / 0.14)',
        lift: '0 2px 4px rgb(var(--c-shadow) / 0.08), 0 16px 40px -12px rgb(var(--c-shadow) / 0.22)',
        glow: '0 0 0 1px rgb(var(--c-primary) / 0.25), 0 8px 32px -8px rgb(var(--c-primary) / 0.35)',
      },
      keyframes: {
        'fade-rise': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'none' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'none' },
        },
        'slide-left': {
          from: { opacity: '0', transform: 'translateX(14px)' },
          to: { opacity: '1', transform: 'none' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'bounce-dot': {
          '0%, 80%, 100%': { transform: 'translateY(0)', opacity: '0.4' },
          '40%': { transform: 'translateY(-5px)', opacity: '1' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.9)', opacity: '0.7' },
          '70%': { transform: 'scale(1.7)', opacity: '0' },
          '100%': { transform: 'scale(1.7)', opacity: '0' },
        },
        drift: {
          '0%, 100%': { transform: 'translate3d(0, 0, 0) scale(1)' },
          '50%': { transform: 'translate3d(0, -18px, 0) scale(1.04)' },
        },
      },
      animation: {
        'fade-rise': 'fade-rise 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-in': 'fade-in 0.4s ease-out both',
        'scale-in': 'scale-in 0.35s cubic-bezier(0.22, 1, 0.36, 1) both',
        'slide-left': 'slide-left 0.35s cubic-bezier(0.22, 1, 0.36, 1) both',
        shimmer: 'shimmer 1.6s infinite',
        'bounce-dot': 'bounce-dot 1.2s infinite ease-in-out',
        'pulse-ring': 'pulse-ring 2.4s cubic-bezier(0.22, 1, 0.36, 1) infinite',
        drift: 'drift 14s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
