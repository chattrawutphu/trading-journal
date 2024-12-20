/** @type {import('tailwindcss').Config} */
import forms from '@tailwindcss/forms';
import typography from '@tailwindcss/typography';
import aspectRatio from '@tailwindcss/aspect-ratio';

export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Purple theme colors
        theme: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7e22ce',
          800: '#6b21a8',
          900: '#581c87',
        },
        // Light mode colors
        light: {
          bg: '#ffffff',
          card: '#f3f4f6',
          hover: '#f9fafb',
          border: '#e5e7eb',
          text: '#1f2937',
          'text-muted': '#6b7280',
        },
        // Dark mode colors
        dark: {
          bg: '#0f172a',
          card: '#1e293b',
          hover: '#334155',
          border: '#334155',
          text: '#f1f5f9',
          'text-muted': '#94a3b8',
        }
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s ease-in-out infinite',
        'slide-in': 'slideIn 0.6s ease-out forwards',
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        'chart': 'draw 3s ease-in-out infinite',
        'chart-delayed': 'draw 3s ease-in-out 1.5s infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        slideIn: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        draw: {
          '0%': { 'stroke-dashoffset': '1000' },
          '100%': { 'stroke-dashoffset': '0' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-purple': 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)',
        'gradient-purple-dark': 'linear-gradient(135deg, #6b21a8 0%, #4c1d95 100%)',
        'grid-pattern': "url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')",
      },
      fontFamily: {
        sans: ['Inter var', 'sans-serif'],
      },
      spacing: {
        '72': '18rem',
        '84': '21rem',
        '96': '24rem',
      },
      maxWidth: {
        '8xl': '88rem',
        '9xl': '96rem',
      },
      scale: {
        '102': '1.02',
      },
      zIndex: {
        '-1': '-1',
      },
      transitionDuration: {
        '400': '400ms',
      },
      backdropBlur: {
        xs: '2px',
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            color: theme('colors.dark.text'),
            a: {
              color: theme('colors.theme.400'),
              '&:hover': {
                color: theme('colors.theme.300'),
              },
            },
            h1: {
              color: theme('colors.dark.text'),
            },
            h2: {
              color: theme('colors.dark.text'),
            },
            h3: {
              color: theme('colors.dark.text'),
            },
            h4: {
              color: theme('colors.dark.text'),
            },
            strong: {
              color: theme('colors.dark.text'),
            },
            code: {
              color: theme('colors.dark.text'),
              backgroundColor: theme('colors.dark.card'),
              paddingLeft: '4px',
              paddingRight: '4px',
              paddingTop: '2px',
              paddingBottom: '2px',
              borderRadius: '0.375rem',
            },
            'code::before': {
              content: '""',
            },
            'code::after': {
              content: '""',
            },
          },
        },
      }),
      fontSize: {
          xxs: '10px', // Custom class for 10px text size
      },
    },
  },
  plugins: [
    forms,
    typography,
    aspectRatio,
  ],
};
