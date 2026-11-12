/** @type {import('tailwindcss').Config} */
import animate from 'tailwindcss-animate'

// 让 bg-cool/20 之类的透明度修饰符对 CSS 变量颜色生效
const c = (v) => `color-mix(in oklab, var(${v}) calc(<alpha-value> * 100%), transparent)`

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: c('--color-paper'),
        paper2: c('--color-paper-2'),
        paper3: c('--color-paper-3'),
        ink: c('--color-ink'),
        ink2: c('--color-ink-2'),
        muted: c('--color-muted'),
        rule: c('--color-rule'),
        rule2: c('--color-rule-2'),
        accent: c('--color-accent'),
        accentInk: c('--color-accent-ink'),
        accentSoft: c('--color-accent-soft'),
        cool: c('--color-cool'),
        coolSoft: c('--color-cool-soft'),
        ok: c('--color-ok'),
        okSoft: c('--color-ok-soft'),
        bad: c('--color-bad'),
        badSoft: c('--color-bad-soft'),
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
