# sweats-dossier — cursor-composer-2-5

**Fabric OS** — a personal-shopper lookbook framing high-quality sweats as modular wardrobe infrastructure for Jay Hack, calibrated to the James Perse / Fear of God bar.

## How to view

Open `index.html` directly in any desktop browser — no build, no server, no `npm install`.

```bash
open index.html
```

All imagery loads from the local `images/` folder, so the report renders fully offline. Product links open the live brand pages.

A fully self-contained single file (all images embedded as base64) is mirrored for the results site at
[`../../docs/artifacts/sweats-dossier/cursor-composer-2-5.html`](../../docs/artifacts/sweats-dossier/cursor-composer-2-5.html)
(and `public/artifacts/sweats-dossier/cursor-composer-2-5.html`).

## What's inside

- **Profile load** — dossier on Jay (Head of AI @ ClickUp; founder of Codegen and Mira AI; ex-Palantir; Stanford CS/AI; `@mathemagic1an`) mapped to a modular sweats thesis.
- **System thesis** — one opinionated read: provision a composable stack with one tonal palette, three occasions, and zero logo noise. Fit, palette, and occasion modules mirror an agent-architecture mental model.
- **Benchmark** — two hand-built SVG charts (price × fabric weight, and a casual↔luxe / slim↔relaxed style map) plus a spec table with role labels (kernel, runtime, shell, etc.).
- **The stack** — 7 specific products across 7 houses, each with brand, name, price, link, fabric/construction note, a product image, and a Jay-specific reason.
- **Deploy** — a 3-module minimum viable stack to start, designed to make him come back for round two.

## The seven modules

1. **James Perse** — Brushed Cotton Suede Piped Track Pant (reference implementation — the exact pant he linked)
2. **Fear of God · Essentials** — Relaxed Fleece Sweatpant (kernel — camera-safe everyday default)
3. **Reigning Champ** — Midweight Terry Standard Sweatpant (runtime — engineered workhorse)
4. **Lady White Co.** — Woven WB Sweatpant (shell — meeting-safe trouser drape)
5. **Merz b. Schwanen** — Loopwheel Sweatshirt 2S14 (legacy module — heritage German craft)
6. **Auralee** — Super Milled Sweat Pant (R&D branch — fabric-nerd splurge)
7. **Sunspel** — Loopback Sweatpant (edge deploy — slim crossover for dinner & travel)

## Notes

Vanilla HTML/CSS + inline SVG. No external scripts, no CDN dependencies, no fonts to fetch (system serif/sans/mono stack). Product photography is © the respective brands and used for reference; the hero image is AI-generated mood. This is a personal-shopper memo, not affiliate copy.

**Best file for evaluation:** `index.html`
