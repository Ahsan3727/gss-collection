import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: '#0B0B0B',
        'ink-2': '#525252',
        ground: '#F5F5F3',
        mist: '#EEEEEC',
        line: '#E2E2DF',
        border: '#6E6E6E',
        gold: '#8A5300',
        sapphire: '#0B0B0B',
        ice: '#E5E5E5',
        error: '#B3261E',
        ok: '#1B6B3A',
        rust: '#B3261E',
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        body: ['var(--font-inter)', 'system-ui', '-apple-system', 'sans-serif'],
      },
      maxWidth: {
        site: '1320px',
      },
    },
  },
  plugins: [],
};
export default config;
