/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Brand palette (SoS - Services On Site) -- kept identical to the
        // admin dashboard's tailwind.config.js so the public site and the
        // portal are unmistakably the same product.
        void: '#121212',
        panel: '#1A1A1A',
        'panel-raised': '#242424',
        hairline: '#2E2E2E',
        ink: '#FFFFFF',
        muted: '#9C9C9C',
        beacon: '#FFC107',
        live: '#FFC107',
        ok: '#F5F5F5',
        danger: '#E53935',
      },
      fontFamily: {
        display: ['Poppins', 'sans-serif'],
        body: ['Poppins', 'sans-serif'],
        logo: ['Montserrat', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        panel: '0 1px 0 0 rgba(255,255,255,0.03) inset',
      },
      maxWidth: {
        content: '1180px',
      },
    },
  },
  plugins: [],
};
