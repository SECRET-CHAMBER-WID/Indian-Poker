import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base: '#eaf0f6',
        ink: '#243142',
        muted: '#667085',
        mint: '#4db6ac',
        coral: '#ff7f6e',
        amber: '#f3b44b',
        plum: '#7e6bc4'
      },
      boxShadow: {
        neu: '10px 10px 22px rgba(163, 177, 198, 0.55), -10px -10px 22px rgba(255, 255, 255, 0.9)',
        'neu-sm': '6px 6px 14px rgba(163, 177, 198, 0.45), -6px -6px 14px rgba(255, 255, 255, 0.85)',
        'neu-inset': 'inset 6px 6px 12px rgba(163, 177, 198, 0.48), inset -6px -6px 12px rgba(255, 255, 255, 0.9)'
      }
    }
  },
  plugins: []
} satisfies Config;
