/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Brand palette (SoS - Services On Site)
        void: '#121212',       // Midnight Black -- page background
        panel: '#1A1A1A',      // derived neutral -- card/panel surface
        'panel-raised': '#242424', // derived neutral -- hover / raised surface
        hairline: '#2E2E2E',   // derived neutral -- hairline borders
        ink: '#FFFFFF',        // White -- primary text
        muted: '#9C9C9C',      // derived neutral -- secondary text
        beacon: '#FFC107',     // Safety Yellow -- primary accent / active-pulse
        live: '#FFC107',       // Safety Yellow -- alias for live/in-motion states
        ok: '#F5F5F5',         // Light Grey -- resolved/neutral (no green in brand palette)
        danger: '#E53935',     // Primary Red -- danger / SOS / cancelled
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
    },
  },
  plugins: [],
};
