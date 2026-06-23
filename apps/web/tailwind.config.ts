import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#070d15',
        'bg-dark': '#0a131e',
        'bg-card': 'rgba(255,255,255,0.022)',
        'bg-hover': 'rgba(255,255,255,0.04)',
        gold: '#c2a35a',
        'gold-dim': 'rgba(194,163,90,0.15)',
        green: '#56c48a',
        'green-dim': 'rgba(86,196,138,0.12)',
        red: '#e07a7a',
        'red-dim': 'rgba(224,122,122,0.12)',
        blue: '#5aa9e6',
        'blue-dim': 'rgba(90,169,230,0.12)',
        yellow: '#e0c14f',
        'yellow-dim': 'rgba(224,193,79,0.12)',
        purple: '#b08ce0',
        'purple-dim': 'rgba(176,140,224,0.12)',
        'text-primary': '#e9eef4',
        'text-secondary': '#aebdcf',
        'text-muted': '#7e93a8',
        'text-dim': '#6b7e93',
        border: 'rgba(255,255,255,0.08)',
        'border-gold': 'rgba(194,163,90,0.3)',
      },
      fontFamily: {
        sans: ['Vazirmatn', 'system-ui', 'sans-serif'],
      },
      animation: {
        livePulse: 'livePulse 2s infinite',
        fadeUp: 'fadeUp 0.4s ease both',
        barGrow: 'barGrow 0.8s ease both',
      },
      keyframes: {
        livePulse: {
          '0%': { boxShadow: '0 0 0 0 rgba(86,196,138,.55)' },
          '70%': { boxShadow: '0 0 0 7px rgba(86,196,138,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(86,196,138,0)' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'none' },
        },
        barGrow: {
          from: { transform: 'scaleX(0)' },
          to: { transform: 'scaleX(1)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
