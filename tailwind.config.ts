import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f0f4ff',
          100: '#e0e9ff',
          200: '#b8ccff',
          300: '#82a6ff',
          400: '#4d7aff',
          500: '#2459ff',
          600: '#1040f5',
          700: '#0c30d8',
          800: '#0e27af',
          900: '#0F2044',
          950: '#080f2a',
        },
      },
    },
  },
  plugins: [],
}
export default config
