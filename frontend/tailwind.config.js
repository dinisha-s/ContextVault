/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          50: '#F2F7F4',
          100: '#E2ECE6',
          200: '#C4D9CD',
          300: '#9CBFA9',
          400: '#6D9773', // Sage
          500: '#3D6F4B',
          600: '#235338',
          700: '#154530',
          800: '#0C3B2E', // Deep Forest Green (Primary)
          900: '#07261E',
          950: '#031410',
        },
        sage: {
          light: '#F0F5F1',
          surface: '#E7EFE9',
          border: '#C2D6C6',
          DEFAULT: '#6D9773', // Sage / Muted Green (Secondary)
          dark: '#4D7553',
        },
        amber: {
          light: '#FFF8E6',
          DEFAULT: '#FFBA00', // Warm Amber / Gold (Accent)
          hover: '#E5A700',
          dark: '#B38300',
        },
        bronze: {
          light: '#F8F4EE',
          surface: '#F1E9DF',
          border: '#D8C3AA',
          DEFAULT: '#BB8A52', // Earthy Bronze / Caramel (Borders & Warm Accents)
          dark: '#8C6434',
        },
        neu: {
          bg: '#F5F7F5',
          surface: '#EBF1EC',
          light: '#FFFFFF',
          dark: '#D0DDD2',
          heading: '#0C3B2E',
          body: '#1B3B32',
          muted: '#516D56',
        }
      },
      boxShadow: {
        'neu-raised': '7px 7px 16px #D0DDD2, -7px -7px 16px #FFFFFF',
        'neu-raised-sm': '3px 3px 8px #D0DDD2, -3px -3px 8px #FFFFFF',
        'neu-raised-lg': '12px 12px 24px #D0DDD2, -12px -12px 24px #FFFFFF',
        'neu-inset': 'inset 3px 3px 6px #D0DDD2, inset -3px -3px 6px #FFFFFF',
        'neu-inset-sm': 'inset 2px 2px 4px #D0DDD2, inset -2px -2px 4px #FFFFFF',
        'neu-forest': '4px 4px 14px rgba(12, 59, 46, 0.35), -2px -2px 8px #FFFFFF',
        'neu-amber': '3px 3px 10px rgba(255, 186, 0, 0.4), -2px -2px 6px #FFFFFF',
      }
    },
  },
  plugins: [],
}
