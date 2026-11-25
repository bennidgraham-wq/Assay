/** Design tokens live as CSS variables in src/index.css; Tailwind maps to them. */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: 'var(--paper)', stone: 'var(--stone)', ink: 'var(--ink)', muted: 'var(--muted)',
        rule: 'var(--rule)', forest: 'var(--forest)', 'forest-deep': 'var(--forest-deep)',
        clay: 'var(--clay)', 'clay-deep': 'var(--clay-deep)', card: 'var(--card)',
      },
      fontFamily: {
        display: ['Newsreader', 'Iowan Old Style', 'Georgia', 'serif'],
        sans: ['"IBM Plex Sans"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'Menlo', 'monospace'],
      },
      maxWidth: { prose: '66ch', page: '72rem' },
    },
  },
  plugins: [],
};
