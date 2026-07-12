# DESIGN.md — EcoSphere visual language (canonical)

> Binding for every UI-touching prompt (baseline `b00_15`, all dashboards, all module pages). If a
> screen doesn't follow this, it is not done. The goal: a **credible enterprise ESG product** an
> executive would trust — not a flashy "AI demo".

Theme name: **Grounded Enterprise**. Reference feel: the restraint of Linear/Stripe dashboards + the
warmth of a sustainability brand. Calm, data-first, confident.

---

## 1. Hard rules (non-negotiable, enforced in review)

- **No emojis** anywhere users or judges can see: UI copy, buttons, empty states, seed data,
  notification titles/bodies, report text, chart labels, AI system prompts. Icons are Lucide, not emoji.
- **No "AI aesthetic":** no neon glows, no purple-to-cyan hero gradients, no glassmorphism, no dark
  "cyberpunk" default, no animated gradient borders, no sparkle motifs.
- **Icons: Lucide only** (ships with shadcn). Stroke 1.5–2px, consistent size per context (16 in dense
  tables, 18–20 in nav/cards). One icon per concept, reused everywhere.
- **Numbers are the hero.** ESG scores, CO₂e, rates — large, `tabular-nums`, high contrast. Decoration
  never competes with data.
- **Respect `prefers-reduced-motion`.** All motion has a reduced fallback.

## 2. Color tokens (HSL, shadcn variable convention)

Light is the primary theme; dark is fully supported. Set both in `web/src/index.css`. Keep shadcn's
`--background/--foreground/--card/--muted/--border/--ring` names; override the values below and ADD the
pillar + chart + semantic tokens.

```
:root (light)
  --background        0 0% 100%          /* app canvas: near-white, slight warmth ok */
  --foreground        215 25% 15%        /* slate-ink text */
  --card              0 0% 100%
  --muted             210 20% 96%
  --muted-foreground  215 15% 45%
  --border            214 20% 90%
  --primary           158 64% 24%        /* deep evergreen — brand, primary actions */
  --primary-foreground 0 0% 100%
  --ring              158 64% 30%
  --accent            190 60% 34%        /* muted teal — secondary emphasis / info */

.dark
  --background        215 28% 9%         /* deep slate, NOT pure black, NOT neon */
  --foreground        210 20% 92%
  --card              215 25% 12%
  --muted             215 20% 18%
  --muted-foreground  215 15% 62%
  --border            215 20% 22%
  --primary           158 55% 42%        /* lifted evergreen for dark contrast */
  --ring              158 55% 48%
  --accent            190 50% 48%
```

### Pillar colors (used consistently in every chart, badge, and section header)
```
--pillar-environmental  158 64% 34%   (green)
--pillar-social         222 60% 50%   (indigo-blue)
--pillar-governance     262 45% 52%   (violet-slate)
```

### Semantic (muted, never fully saturated)
```
--success 152 55% 38%   --warning 38 80% 45%   --danger 4 65% 48%   --info 200 60% 42%
```

### Chart categorical palette (Recharts) — derive from tokens, in this order
`--pillar-environmental`, `--pillar-social`, `--pillar-governance`, `--accent`, `--warning`,
`--muted-foreground`. No rainbow; no per-bar random colors.

## 3. Typography

- Font: **Inter** (self-host or `@fontsource/inter`; no external CDN fetch at runtime). Fallback
  `ui-sans-serif, system-ui`.
- Scale: page title 24/600, section 18/600, card title 14/600 uppercase-tracking optional, body 14/400,
  metric hero 32–44/700 `tabular-nums`, caption 12/500 `--muted-foreground`.
- All figures, currency, and percentages use `font-variant-numeric: tabular-nums`.

## 4. Layout & surfaces

- App shell: fixed left sidebar (icon + label, Lucide), top bar with page title + user/role + notification
  bell. Content max-width ~1280 with comfortable gutters.
- Cards: `--card` bg, 1px `--border`, `rounded-lg` (radius token `0.5rem`), **soft** shadow
  (`shadow-sm`), never glow. One KPI or one chart per card with a clear title + optional help tooltip.
- Spacing: 4px base; generous section spacing (24–32px). Executive-readable density, not cramped.
- States: every data surface ships **loading skeleton**, **empty state** (Lucide icon + one sentence +
  primary action), and **error state** (never a blank card).

## 5. Charts (Recharts)

- Use shared primitives from `b00_12` (`ChartCard`, `TrendLine`, `RankBar`, `Gauge`, `StatTile`). Do not
  hand-roll one-off chart styling.
- Restrained: subtle gridlines (`--border`), axis labels in `--muted-foreground`, tooltips on hover,
  legends only when >1 series. No 3D, no decorative gradients, no drop shadows on series.
- Score gauge: single big number center, arc colored by band (see §7), pillar mini-gauges beneath.

## 6. Motion

- Transitions 150–250ms, `ease-out`. Hover/focus states on all interactive elements.
- **Badge unlock** is the one celebratory moment: a tasteful count-up of XP + a brief highlight ring on
  the new badge (no confetti storm, no sound). Reduced-motion → instant state, no animation.
- Realtime tiles update with a soft value cross-fade, not a flash.

## 7. Score bands (consistent everywhere a score appears)

```
0–39   danger  (needs attention)     --danger
40–69  warning (developing)          --warning
70–84  good                          --pillar-environmental (green)
85–100 strong                        --primary (evergreen)
```
Use the band color for the gauge arc, score chips, and dashboard status — same mapping in dashboard,
reports, and copilot output.

## 8. Copy tone

Plain, executive, jargon-light. Prefer "Carbon footprint" in headings, keep "CO₂e" for units/axes.
Sentence case. No exclamation marks, no emoji, no hype. Empty states are helpful, not cute.

## 9. Accessibility

WCAG AA contrast for text and score chips (verify the band colors on both themes). All interactive
elements keyboard-reachable with visible `--ring` focus. Icons that convey meaning have `aria-label`.
Charts have an accessible text summary (the KPI tile beside them counts).
