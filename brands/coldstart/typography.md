# Typography — ColdStart

Source: `coldstartb2b.com`, captured 2026-04-26 via Playwright (computed styles from a real render).

## ⚠ Inconsistencies (rationalize before codifying)

1. **`--font-display: 'Unbounded'` is declared but never used.** All H1/H2 render in Cabinet Grotesk. Either drop the variable or commit to using Unbounded somewhere — having a "display font" no scene actually uses is dead weight.
2. **Two contradictory body-font variables.** `--font-body: 'Inter'` and `--_typography---fonts--body: "Cabinet Grotesk"` disagree. Actual `<p>` elements render in Inter — so `--_typography---fonts--body` is a stale Relume-template default. Drop it.
3. **Heading weight token mismatch.** `--_typography---fonts--heading-weight: "400"` says 400 but every captured heading renders at 700. The token is wrong; rendered output is right.
4. **`body-medium` and `body-bold` are both 800.** Same weight under two semantic names is sloppy. If "medium" is meant to be 500–600 and "bold" 700–800, restore the distinction. Otherwise pick one.
5. **Eyebrow at 10.4px / 55% opacity.** "AI AUTOMATION FOR B2B" is below the 12px readability floor and combines that with low contrast. Bump to 12px and ≥70% opacity if you care about WCAG AA.
6. **Lead body at 300 weight / 55% opacity.** Light weight + light opacity on a dark bg is the riskiest contrast combo on the page. The hero subhead ("Your team is doing manually what AI can do in seconds.") is hovering at the edge of legibility for users with reduced vision.

## Type scale

Pixel sizes are from the live render at 1280×... default viewport. Rem fallbacks assume 16px root.

| Role | Tag | Font | Size | Weight | Line-height | Tracking | Color | Example |
|---|---|---|---|---|---|---|---|---|
| `display` / hero | h1 | Cabinet Grotesk | 67.2px (4.2rem) | 700 | 77.28px (1.15) | -1.68px (-0.025em) | `#e8e8ec` | "Yes. Claude Can Do That." |
| `h2` | h2 | Cabinet Grotesk | 44.8px (2.8rem) | 700 | 50.176px (1.12) | -1.344px (-0.03em) | `#e8e8ec` | "100x Faster" |
| `body-lead` | p | Inter | 20px (1.25rem) | 300 | 35px (1.75) | 0.16px | `rgba(232,232,236,0.55)` | hero subhead |
| `wordmark` | a | Inter | 20.8px (1.3rem) | 600 | 31.2px (1.5) | -0.208px | `#e8e8ec` | "ColdStart" |
| `nav` | a/button | Inter | 13.6px (0.85rem) | 500 | 20.4px (1.5) | 0.16px | `rgba(232,232,236,0.55)` | "AI Benefits", "Resources" |
| `cta-primary` | a (button) | Inter | 13.6px (0.85rem) | 600 | 20.4px (1.5) | 0.16px | `#050508` on `#8b9cf7` | "Contact" |
| `cta-action` | button | Inter | 12.8px (0.8rem) | 500 | 19.2px (1.5) | 0.768px (0.06em) | `#050508` | "Start a Conversation" |
| `eyebrow` | p | Inter | 10.4px (0.65rem) | 500 | 15.6px (1.5) | 2.6px (0.25em) UPPER | `rgba(232,232,236,0.55)` | "AI AUTOMATION FOR B2B" |

## Fonts

### Custom web fonts (need self-hosting)

- **Cabinet Grotesk** — display face. Source: [Fontshare](https://www.fontshare.com/fonts/cabinet-grotesk) (free, commercial). Weights observed: 700. Self-host the .woff2 — don't rely on the CDN at runtime in HyperFrames compositions.

### System / Google fonts

- **Inter** — body and UI face. Available via Google Fonts. Weights observed: 300, 500, 600. Use `Inter, sans-serif` stack with `-apple-system, system-ui` fallbacks if Inter is unavailable.

### Declared but unused

- **Unbounded** (`--font-display`) — declared, never rendered in captured DOM.

## Hierarchy assumptions

The page only renders one H1 and one H2 in the captured DOM, so the H3/H4/H5/H6 tiers in `--_typography---font-size--h*` (2.5rem / 2rem / 1.75rem / 1.25rem) are template defaults from Relume — confirm those are actually used somewhere on a deeper page before codifying. Don't bake in unused tiers.
