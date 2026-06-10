# SOFT DEPLOY — a sweats dossier for Jay Hack

Solution for the `sweats-dossier` eval. Harness: `cursor` · Model: `fable-5-thinking-high`.

## What was built

A single self-contained HTML editorial lookbook (`index.html`) that makes a personal-shopper case to Jay Hack for which high-quality sweats to buy.

- **Subject research**: ties the recommendations to Jay's public profile (Head of AI @ ClickUp; founder of Codegen, acq. ClickUp '25; founder of Mira AI — itself an AI personal-shopping company, acq. '21; ex-Palantir; Stanford CS/AI; @mathemagic1an) and to the taste signal he gave himself: the James Perse suede-piped track pant in Black/Whiskey.
- **Thesis**: a closed palette (black / smoke / bone + one whiskey accent), fabric weight as the real luxury signal, relaxed-but-intentional silhouettes for a keyboard → camera → stage life.
- **Seven picks**, each with brand, product, verified price, link, fabric/construction note (GSM, country of make), a local product image, and a Jay-specific rationale:
  1. James Perse Brushed Cotton Suede Piped Track Pant — $795 (the exact pant he linked; verdict: buy)
  2. Lady White Co. Super Weighted Hoodie (Elm) — $354, 18oz, made in LA
  3. Fear of God Essentials Heavy Fleece Lounge Sweatpant (Smoke Grey) — $145, 520gsm
  4. Reigning Champ Midweight Terry Slim Sweatpant — $118, 390gsm
  5. Stòffa Cotton Terry Sweatpants (Bone) — $375, made in Varese, Italy
  6. Auralee Smooth Soft BD Sweat Pants — ¥41,800 (~$285 JP retail) vs ~$475 US stockists
  7. Sunspel Loopback Sweatpants (Navy) — $170, made in Portugal
- **Research findings surfaced as honest flags**: Reigning Champ quietly moved this line from Canada to Vietnam; FoG Essentials is final-sale; the Auralee ¥-retail vs US-stockist arbitrage (~65% markup).
- **Two hand-built SVG charts** (price × fabric weight with a value frontier; a casual↔luxe / slim↔relaxed style map) plus a full comparison ledger table.
- **A 3-phase buy plan** ("ship in three releases") with sizing and care notes per brand, and a "run it back" closer.

## How to run

Open `index.html` directly in any desktop browser from a fresh clone — no build, no server, no env vars. Product images load from the local `images/` folder, so it renders fully offline (webfonts degrade gracefully to system fonts).

## Best file for evaluation

`sweats-dossier/cursor-fable-5-thinking-high/index.html`, or the single-file base64-embedded mirror at `docs/artifacts/sweats-dossier/cursor-fable-5-thinking-high.html` / `public/artifacts/sweats-dossier/cursor-fable-5-thinking-high.html`.

## Notes

- Prices verified against brand product pages June 2026 (USD list; subject to drops/restocks).
- Product photography is brand imagery saved locally in `images/`; the hero image was AI-generated for this report.
- Fabric weights marked `~` in the report are editorial estimates where brands publish none; RC (390gsm), FoG (520gsm), and Lady White (18oz) are manufacturer-stated.
- No affiliate links.
