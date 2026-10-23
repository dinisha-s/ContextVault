/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        neu: {
          bg: '#EEF2F7',
          surface: '#F4F7FC',
          light: '#FFFFFF',
          dark: '#CBD5E1',
          heading: '#1E293B',
          body: '#334155',
          muted: '#64748B',
          subtle: '#94A3B8',
        },
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          900: '#1e1b4b',
        }
      },
      boxShadow: {
        'neu-raised': '8px 8px 18px #CBD5E1, -8px -8px 18px #FFFFFF',
        'neu-raised-sm': '4px 4px 10px #CBD5E1, -4px -4px 10px #FFFFFF',
        'neu-raised-lg': '12px 12px 26px #CBD5E1, -12px -12px 26px #FFFFFF',
        'neu-inset': 'inset 3px 3px 6px #CBD5E1, inset -3px -3px 6px #FFFFFF',
        'neu-inset-sm': 'inset 2px 2px 4px #CBD5E1, inset -2px -2px 4px #FFFFFF',
        'neu-primary': '4px 4px 14px rgba(59, 130, 246, 0.35), -2px -2px 8px #FFFFFF',
        'neu-glow': '0 0 15px rgba(79, 70, 229, 0.4)',
      }
    },
  },
  plugins: [],
}
