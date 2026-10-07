// Tailwind theme.extend snippet — ColdStart
// Drop into tailwind.config.js theme.extend
// Source: coldstartb2b.com, extracted 2026-04-26

module.exports = {
  theme: {
    extend: {
      colors: {
        // Surface
        bg: {
          DEFAULT: '#050508',     // page background, near-black
          elevated: '#091626',    // secondary surface, deep navy
        },
        // Text — use opacity utilities (text-white/55) or explicit muted/dim variants
        text: {
          DEFAULT: '#e8e8ec',
          muted: 'rgba(232, 232, 236, 0.55)',
          dim: 'rgba(232, 232, 236, 0.30)',
        },
        // Signal accents (the active dark-theme palette)
        signal: {
          DEFAULT: '#8b9cf7',     // periwinkle — primary emphasis
          warm: '#c4a0f7',        // lavender — secondary emphasis (assign a role)
        },
        // Brand identifier accents (declared, may render below the fold)
        brand: {
          orange: '#ff8b48',
          yellow: '#ffc800',
          navy: '#091626',
          offwhite: '#f5f5f7',
        },
        // Borders
        border: {
          subtle: 'rgba(255, 255, 255, 0.08)',
          accent: '#ff8b48',
        },
      },
      fontFamily: {
        // Cabinet Grotesk requires self-hosting (Fontshare). Fallback to system sans.
        display: ['"Cabinet Grotesk"', 'Arial', 'sans-serif'],
        // Inter via Google Fonts.
        body: ['Inter', '-apple-system', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // [size, { lineHeight, letterSpacing, fontWeight }]
        'display':    ['4.2rem',   { lineHeight: '1.15', letterSpacing: '-0.025em', fontWeight: '700' }], // 67.2px — hero h1
        'h2':         ['2.8rem',   { lineHeight: '1.12', letterSpacing: '-0.03em',  fontWeight: '700' }], // 44.8px
        'body-lead':  ['1.25rem',  { lineHeight: '1.75', letterSpacing: '0.008em',  fontWeight: '300' }], // 20px
        'wordmark':   ['1.3rem',   { lineHeight: '1.5',  letterSpacing: '-0.01em',  fontWeight: '600' }], // 20.8px
        'nav':        ['0.85rem',  { lineHeight: '1.5',  letterSpacing: '0.012em',  fontWeight: '500' }], // 13.6px
        'cta':        ['0.85rem',  { lineHeight: '1.5',  letterSpacing: '0.012em',  fontWeight: '600' }], // 13.6px on signal bg
        'cta-action': ['0.8rem',   { lineHeight: '1.5',  letterSpacing: '0.06em',   fontWeight: '500' }], // 12.8px
        'eyebrow':    ['0.65rem',  { lineHeight: '1.5',  letterSpacing: '0.25em',   fontWeight: '500' }], // 10.4px UPPER (consider bumping to 0.75rem for WCAG)
      },
    },
  },
};
