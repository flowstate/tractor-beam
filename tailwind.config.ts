import { type Config } from 'tailwindcss'
import { fontFamily } from 'tailwindcss/defaultTheme'

export default {
  content: ['./src/**/*.tsx'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-geist-sans)', ...fontFamily.sans],
        mono: ['var(--font-geist-mono)', ...fontFamily.mono],
      },
      colors: {
        // Text colors - cooler alternatives to black/white
        text: {
          dark: '#1A202C',
          medium: '#4A5568',
          light: '#F7FAFC',
        },
        // Primary/action colors
        primary: {
          DEFAULT: '#3182CE',
          hover: '#2B6CB0',
        },
        // Status colors - desaturated and refined
        status: {
          optimal: '#38A169',
          warning: '#ED8936',
          critical: '#E53E3E',
        },
        // Location colors
        location: {
          west: '#2196F3',
          south: '#9C27B0',
          heartland: '#FF9800',
        },
        // Supplier colors - improved contrast
        supplier: {
          elite: '#2B6CB0',
          crank: '#00897B',
          atlas: '#9C4221',
          bolt: '#6B46C1',
          dynamo: '#B83280',
        },
      },
      boxShadow: {
        card: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      },
      spacing: {
        // Add any custom spacing if needed
      },
    },
  },
  plugins: [],
} satisfies Config
