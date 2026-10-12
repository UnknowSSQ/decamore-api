import type { Config } from 'tailwindcss';

/** 颜色一律写成 CSS 变量引用（定义在 app/globals.css），组件里用语义化类名而非硬编码色值 */
const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--c-bg) / <alpha-value>)',
        'bg-soft': 'rgb(var(--c-bg-soft) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        ink: 'rgb(var(--c-text) / <alpha-value>)',
        muted: 'rgb(var(--c-muted) / <alpha-value>)',
        'ink-2': 'rgb(var(--c-ink-2) / <alpha-value>)',
        'ink-3': 'rgb(var(--c-ink-3) / <alpha-value>)',
        'ink-4': 'rgb(var(--c-ink-4) / <alpha-value>)',
        hair: 'rgb(var(--c-hair) / <alpha-value>)',
        wash: 'rgb(var(--c-wash) / <alpha-value>)',
        'wash-2': 'rgb(var(--c-wash-2) / <alpha-value>)',
        scrim: 'rgb(var(--c-scrim) / <alpha-value>)',
        'ink-warn': 'rgb(var(--c-ink-warn) / <alpha-value>)',
        primary: 'rgb(var(--c-primary) / <alpha-value>)',
        'primary-dark': 'rgb(var(--c-primary-dark) / <alpha-value>)',
        accent: 'rgb(var(--c-accent) / <alpha-value>)',
        line: 'rgb(var(--c-line) / <alpha-value>)',
        danger: 'rgb(var(--c-danger) / <alpha-value>)',
        'danger-soft': 'rgb(var(--c-danger-soft) / <alpha-value>)',
        warn: 'rgb(var(--c-warn) / <alpha-value>)',
        'warn-soft': 'rgb(var(--c-warn-soft) / <alpha-value>)',
        ok: 'rgb(var(--c-ok) / <alpha-value>)',
        sage: 'rgb(var(--tint-sage) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        serif: ['var(--font-serif)'],
        mono: ['var(--font-mono)'],
      },
      spacing: {
        // dsp- 前缀是为了不覆盖 Tailwind 默认刻度
        'dsp-1': '8px',
        'dsp-2': '16px',
        'dsp-3': '24px',
        'dsp-4': '32px',
        'dsp-5': '48px',
        'dsp-6': '72px',
        'dsp-7': '104px',
        topbar: '64px',
      },
      borderRadius: {
        sm: '10px',
        md: '18px',
        lg: '28px',
        field: '14px',
      },
      boxShadow: {
        soft: '0 18px 50px rgba(37, 50, 41, 0.08)',
        lift: '0 26px 60px rgba(37, 50, 41, 0.13)',
        card: '0 6px 24px rgba(37, 50, 41, 0.04)',
        pop: '0 22px 60px rgba(37, 50, 41, 0.16)',
      },
      maxWidth: {
        docs: '1400px',
      },
      transitionTimingFunction: {
        dec: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(22px)' },
          to: { opacity: '1', transform: 'none' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '22%': { transform: 'translateX(-6px)' },
          '46%': { transform: 'translateX(5px)' },
          '72%': { transform: 'translateX(-3px)' },
        },
        drift: {
          from: { transform: 'translate3d(0, 0, 0)' },
          to: { transform: 'translate3d(0, -13px, 0)' },
        },
        'toast-in': {
          from: { opacity: '0', transform: 'translateY(10px) scale(0.98)' },
          to: { opacity: '1', transform: 'none' },
        },
        'drawer-in-right': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'none' },
        },
        // toast 底部进度条；这里的 animation 不带时长，由组件按 duration 内联注入
        'toast-progress': {
          from: { transform: 'scaleX(1)' },
          to: { transform: 'scaleX(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.65s cubic-bezier(0.22, 0.61, 0.36, 1) both',
        'fade-in': 'fade-in 0.4s ease both',
        shake: 'shake 0.42s cubic-bezier(0.22, 0.61, 0.36, 1)',
        drift: 'drift 11s cubic-bezier(0.22, 0.61, 0.36, 1) infinite alternate',
        'toast-in': 'toast-in 0.32s cubic-bezier(0.22, 0.61, 0.36, 1) both',
        'drawer-in-right': 'drawer-in-right 0.3s cubic-bezier(0.22, 0.61, 0.36, 1) both',
        'toast-progress': 'toast-progress linear forwards',
      },
    },
  },
  plugins: [],
};

export default config;
