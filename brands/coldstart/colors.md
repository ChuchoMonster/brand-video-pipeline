# Colors — ColdStart

Source: 72 CSS custom properties on `:root` from `coldstartb2b.com`, plus computed text colors from the captured DOM.

## ⚠ Inconsistencies (rationalize before codifying)

1. **Declared brand "primary" is `#ff8b48` (orange) but the captured viewport never shows it.** The visual emphasis on the hero ("Claude Can Do That.") uses periwinkle `#8b9cf7` (`--accent`). Either the orange is a brand-color the page uses below the fold (likely — Webflow scroll sections) or it's a leftover. Confirm before assigning it the "primary" role in the brand book.
2. **Two near-duplicate accents.** `#8b9cf7` and `#c4a0f7` are both purple-blue at similar lightness (Δ ~10 hue). Assign each a role (e.g. one for emphasis, one for hover/active) or merge to one — don't keep both as ambiguous "accents".
3. **Relume template defaults left in place.** `--text-color--text-primary: #091626` (dark navy, intended for light backgrounds) and `--background-color--background-primary: #f5f5f7` (off-white) are **inverted from actual usage** — the site is dark-themed (`--bg: #050508`, `--text: #e8e8ec`). Delete the Relume defaults or rename them so they don't get accidentally consumed.
4. **`--base-color-brand--black` (`#091626`) duplicates `--background-color--background-tertiary` and `--text-color--text-primary`.** Three names for one color is over-aliased. Pick one canonical name (suggest `--brand-navy` since it's not pure black).
5. **`--bg: #050508` is named "bg" but isn't in the `--base-color-brand--*` family.** The actual page background sits outside the brand-color taxonomy. Promote it to `--brand-bg` or `--brand-near-black`.

## Color groups (rationalized)

### Surface — the actual dark theme

| Token (proposed) | Hex | Where used | Notes |
|---|---|---|---|
| `--brand-bg` | `#050508` | dominant page background | currently `--bg`; near-black, slight blue cast |
| `--brand-bg-elevated` | `#091626` | secondary surface | currently `--base-color-brand--black` / `--background-color--background-tertiary` — three aliases |

### Text

| Token (proposed) | Value | Usage |
|---|---|---|
| `--brand-text` | `#e8e8ec` | primary text, headlines, wordmark |
| `--brand-text-muted` | `rgba(232,232,236,0.55)` | nav, lead body, eyebrow |
| `--brand-text-dim` | `rgba(232,232,236,0.3)` | tertiary copy |

### Signal accents (the active palette)

| Token (proposed) | Hex | Role | Notes |
|---|---|---|---|
| `--brand-signal` | `#8b9cf7` | primary emphasis (hero word, CTA bg) | currently `--accent` — periwinkle blue |
| `--brand-signal-warm` | `#c4a0f7` | secondary emphasis | currently `--accent-warm` — assign a distinct role or drop |

### Brand identifier accents (declared but offscreen)

| Token | Hex | Role |
|---|---|---|
| `--base-color-brand--primary` | `#ff8b48` | orange — declared but not rendered in captured viewport. Confirm where it's used. |
| `--base-color-brand--secondary` | `#ffc800` | yellow — same. |

### Borders

| Token (proposed) | Value | Usage |
|---|---|---|
| `--brand-border` | `rgba(255, 255, 255, 0.08)` | currently `--border-color--border-secondary: #ffffff14` — subtle dividers on dark |
| `--brand-border-accent` | `#ff8b48` | currently `--border-color--border-alternate` — orange accent border |

### Semantic (Relume defaults — keep or drop)

| Role | Hex | Notes |
|---|---|---|
| success | `#027a48` / bg `#ecfdf3` | template default, no observed usage |
| error | `#b42318` / bg `#fef3f2` | template default |

These are likely unused. If forms and notifications below the fold use them, keep. Otherwise drop.

## Color count

72 declared variables collapse to **~10 load-bearing colors** once Relume defaults and aliases are resolved. The brand book carries those 10; the rest are noise.
