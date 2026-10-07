# DESIGN — template-16x9

## What this is

A **brand-agnostic** 30-second 16:9 explainer-video template. Every brand-variable property (color, font, accent) reads from `--brand-*` CSS custom properties defined in [styles/brand.css](styles/brand.css). The orchestrator overwrites that file with the active brand's tokens before each render — the rest of the template is unchanged.

**Style for any specific render comes from the brand**, not this file. This template fixes layout, timing, motion, and scene structure. Brand controls visual identity.

## Source of truth

| Layer | Where | What it owns |
|---|---|---|
| Brand tokens | `brands/<slug>/brand.json` → injected into `styles/brand.css` | colors, fonts, accents, voice/tone |
| Template layout & motion | `styles/template.css` + `index.html` | scene sizes, avatar slots, GSAP timing, transitions |
| Per-video content | filled into placeholder slots in `index.html` per render | headlines, body copy, B-roll, audio, avatar.mp4 |

## Currently injected brand

ColdStart (`brands/coldstart/brand.json`) — for Phase A test. Replace `styles/brand.css` `:root` block with another brand's tokens to re-skin the entire template.

## Structure

- **0–5s**: Scene Hook — eyebrow + display headline + avatar enters from right
- **5–11.5s**: Scene Body 1 — supporting body text + B-roll slot left, avatar in lower-third
- **11.5–18s**: Scene Body 2 — large stat + label, avatar moves to top-left
- **18–25s**: Scene Body 3 — body text + B-roll slot, avatar back to right-third
- **25–30s**: Scene End — CTA + wordmark, avatar centered for sign-off

Transitions between scenes: **blur crossfade**, 0.4s, `power2.inOut`. Medium energy, tech-mood — works across most brands.

## Avatar slot system

The avatar is a `<video>` element at the root of the composition, persistent across all scenes. Its position changes via GSAP timeline tweens at scene boundaries. Defined slots (top-left coordinates, width × height):

| Slot | top | left | width | height | Use |
|---|---|---|---|---|---|
| `right-third` | 180 | 1300 | 540 | 720 | Hero/intro framing — content takes left half |
| `lower-third` | 720 | 80 | 480 | 320 | Subordinate framing — content fills above |
| `top-left` | 80 | 80 | 480 | 640 | Accent corner — full-screen content behind |
| `bottom-right` | 360 | 1360 | 480 | 640 | Mirror corner |
| `center` | 180 | 720 | 480 | 720 | Sign-off / portrait moment |

Per-video composition tweens between these slots. The script's visual cue tags (e.g. `[AVATAR: top-left]`) drive the choices in V1.x; for Phase A the slot sequence is hardcoded in `index.html`.

## Placeholder media

The template references:
- `assets/avatar.mp4` — HeyGen output, transparent-background mode
- `assets/voice.wav` — 11Labs output (default narrator voice)

These are **swapped per video**. For a successful first render in Phase A, real files must exist at those paths. Until then, the template renders with the avatar slot showing as a solid `--brand-bg-elevated` rectangle with "AVATAR" placeholder text and no audio.

## Rules this template enforces

1. **Every `--brand-*` variable** must exist in `styles/brand.css`. Missing tokens cause silent fallback to invalid CSS values. The orchestrator validates `brand.json` covers all required tokens before injection.
2. **No literal hex colors or font-family declarations** in `styles/template.css` or `index.html` outside of `var(--brand-*)`. Adding one breaks brand parity.
3. **No exit animations** except on the final scene. Per HyperFrames rules: the transition handles the exit. Outgoing scene content is fully visible at transition start.
4. **Scenes 2–5 start with `opacity: 0`** on the container. GSAP timeline reveals each scene at its `data-start` timestamp.
5. **Scene order, durations, and transition timing** are the template's contract. Do not edit them per video — those changes belong in a new template variant (e.g. `template-16x9-long/` for a 60s version).

## What "brand-agnostic" does NOT mean

Layout, padding, font-size scale, and motion *are* template decisions — they affect how brands look. If a brand needs radically different sizing (e.g. dense corporate vs. airy minimalist), it needs a different template, not different CSS variables. Templates are a small library; CSS variables don't paper over fundamental design differences.
