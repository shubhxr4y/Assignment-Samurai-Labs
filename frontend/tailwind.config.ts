import type { Config } from 'tailwindcss';

/**
 * Bahi design system.
 *
 * Deliberately small: one neutral ramp with a warm (paper) cast, one brand
 * colour, and three payment-status colours that are never used for anything
 * else. If a colour is not in here, it does not appear in the product.
 */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Warm neutral ramp. Backgrounds are paper, not blue-grey.
        paper: '#FBFAF8',
        surface: '#FFFFFF',
        ink: {
          DEFAULT: '#1B1917',
          muted: '#6B6560',
          subtle: '#8F8880',
        },
        line: {
          DEFAULT: '#E8E4DE',
          strong: '#D6D1C9',
        },
        // Brand: a single ink-indigo. Used for primary actions and nothing else.
        brand: {
          50: '#F0F1FA',
          100: '#DDE0F3',
          200: '#BFC5E8',
          500: '#5563BE',
          600: '#3A4BA0',
          700: '#2E3C82',
          900: '#1E2857',
        },
        // Payment status. Reserved — never decorative.
        paid: { fg: '#14622F', bg: '#E8F4EB', border: '#BFE0C9' },
        partial: { fg: '#8A4B07', bg: '#FDF1E1', border: '#F3D7AE' },
        pending: { fg: '#4A453F', bg: '#F2F0EC', border: '#DFDAD2' },
        // Feedback
        danger: { fg: '#A5271D', bg: '#FCEDEB', border: '#F3C9C4' },
        success: { fg: '#14622F', bg: '#E8F4EB', border: '#BFE0C9' },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['var(--font-serif)', 'ui-serif', 'Georgia', 'serif'],
      },
      fontSize: {
        // A fixed six-step scale. Each step has one job.
        label: ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.06em', fontWeight: '600' }],
        small: ['0.8125rem', { lineHeight: '1.125rem' }],
        body: ['0.875rem', { lineHeight: '1.375rem' }],
        lead: ['1rem', { lineHeight: '1.5rem' }],
        title: ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em' }],
        display: ['1.75rem', { lineHeight: '2.125rem', letterSpacing: '-0.02em' }],
        figure: ['1.625rem', { lineHeight: '2rem', letterSpacing: '-0.02em' }],
      },
      borderRadius: {
        sm: '0.25rem',
        DEFAULT: '0.375rem',
        md: '0.5rem',
        lg: '0.625rem',
        xl: '0.875rem',
      },
      boxShadow: {
        // Two shadows in the whole product: one for raised surfaces, one for overlays.
        card: '0 1px 2px rgba(27, 25, 23, 0.04)',
        overlay: '0 12px 32px -8px rgba(27, 25, 23, 0.18), 0 2px 8px rgba(27, 25, 23, 0.06)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'scale-in': {
          from: { opacity: '0', transform: 'translateY(4px) scale(0.99)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        'fade-in': 'fade-in 120ms ease-out',
        'scale-in': 'scale-in 140ms cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
