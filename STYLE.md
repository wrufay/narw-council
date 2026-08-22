# NARW Council — Style Guide

Locked design reference for prompting Base44. This is the single source of truth for
palette, type, and component treatment — stop browsing for new palettes, use this one.

## Palette

Sourced from tonight's Coolors exploration — background/surface colors come directly
from swatches you picked; the two functional accents (teal, amber) are fixed on
purpose, not sourced from the same palettes, because none of tonight's palettes
contained a color distinct enough to carry alert/status meaning without blending
into the background.

| Token | Hex | Name / source | Use |
|---|---|---|---|
| `bg` | `#061A40` | Prussian Blue (palette 1) | Main app background — near-black navy |
| `surface` | `#0B4F6C` | Yale Blue (palette 3) | Cards, panels, the council box — one step lighter than bg so panels read as "raised" |
| `surface-alt` | `#145C9E` | Baltic Blue (palette 3) | Secondary surface / hover state on cards |
| `border` | `#272932` | Shadow Grey (palette 4) | Dividers, subtle outlines — dark neutral, not blue, so it doesn't fight with bg |
| `text-muted` | `#B6C2D9` | Powder Blue (palette 4) | Secondary text, labels, timestamps |
| `text-primary` | `#F4F7FB` | — | Main body text (off-white, not pure white — softer against navy) |
| `accent` | `#758E4F` | Palm Leaf (palette 2) | Primary actions, high-confidence state — green reads as "go," sourced from your picks |
| `warning` | `#F6AE2D` | Honey Bronze (palette 2) | Medium-confidence tier ONLY — reserved meaning, never used decoratively |
| `low` | `#6B7280` | muted grey | Low-confidence tier — deliberately unremarkable, doesn't compete with warning/accent |

**Why accent/warning come from the orange/green palette specifically:** every other palette
explored tonight was monochrome-blue or too low-contrast (all pale blues) to distinguish
"success" from "warning" from "neutral" against the navy background. The orange/green
palette (palette 2) was the one with real outliers from the blue family — Palm Leaf and
Honey Bronze are both distinct enough from `bg`/`surface` to pop, and they conveniently
land on colors that already carry the right semantic meaning (green = good, amber = caution)
without needing to invent anything outside what you picked.

## Typography

- **Primary typeface: Syne** (variable) — use its weight range for both body and headers,
  don't add a second family. Geometric, slightly technical, fits the instrument-panel feel.
- Drop Hammersmith One (too playful/rounded) and Vollkorn (serif, wrong register) if either
  is still under consideration — neither matches this direction.
- Generous line-height and letter spacing on headers — the whole aesthetic relies on air/space,
  not density.

## Shape & spacing

- Corner radius: **6–8px** — rounded but not bubbly
- Shadows: **minimal to none** — instrument-panel feel comes from contrast and spacing,
  not soft drop shadows
- Generous padding inside cards/panels — avoid cramped layouts

## Council panel (signature component)

- Reads as a **status readout**, not a checklist
- Each of the 3 sub-checks (contour/shape, texture, noise) is a **pill-shaped indicator**
  in a row: ✅ / ⚠️ / ❌, using `accent` / `warning` / `low` respectively
- Overall confidence tier drives the panel's dominant color — a high-confidence result
  should visually read as "green light," not just say so in text

## Map

- Use a **dark Mapbox style** so the map blends into the rest of the UI rather than looking
  like a bright default map dropped into a dark app
- Detection point marker: `accent` (teal)
- Fisheries-in-range highlight: `warning` (amber) — consistent with the tiering logic elsewhere

## Quick prompt block (paste into Base44)

```
Dark marine research-instrument aesthetic.
Background: #061A40. Card/panel surface: #0B4F6C. Secondary surface: #145C9E.
Border/divider: #272932 (not blue-tinted). Muted text: #B6C2D9. Primary text: #F4F7FB.
Accent (primary actions, high-confidence): #758E4F (Palm Leaf green).
Warning (medium-confidence ONLY, reserved meaning): #F6AE2D (Honey Bronze amber).
Low-confidence: #6B7280 (muted grey, deliberately unremarkable).
Typeface: Syne (variable weight), geometric sans, generous spacing.
Corners: 6-8px, rounded not bubbly. Minimal shadows.
Council panel = status readout with pill-shaped indicators (✅/⚠️/❌) in a row, not a checklist.
```

---
*Locked ~1am, Aug 22 — stop exploring new palettes, build against this.*