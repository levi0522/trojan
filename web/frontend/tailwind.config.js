/** @type {import('tailwindcss').Config} */
import animate from 'tailwindcss-animate'

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: 'var(--color-paper)',
        paper2: 'var(--color-paper-2)',
        paper3: 'var(--color-paper-3)',
        ink: 'var(--color-ink)',
        ink2: 'var(--color-ink-2)',
        muted: 'var(--color-muted)',
        rule: 'var(--color-rule)',
        rule2: 'var(--color-rule-2)',
        accent: 'var(--color-accent)',
        accentInk: 'var(--color-accent-ink)',
        accentSoft: 'var(--color-accent-soft)',
        cool: 'var(--color-cool)',
        coolSoft: 'var(--color-cool-soft)',
        ok: 'var(--color-ok)',
        okSoft: 'var(--color-ok-soft)',
        bad: 'var(--color-bad)',
        badSoft: 'var(--color-bad-soft)',
      },
      fontFamily: {
        sans: 'var(--font-body)',
        display: 'var(--font-display)',
        mono: 'var(--font-outlier)',
      },
      borderRadius: {
        card: 'var(--radius-card)',
        pill: 'var(--radius-pill)',
      },
    },
  },
  plugins: [animate],
}
