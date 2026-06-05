# sweats-dossier

## Prompt

Ship **one self-contained HTML file** — a personal shopping report **and lookbook** — recommending a small set of high-quality sweats for **Jay Hack** ([jay.ai](https://jay.ai)).

His original ask, verbatim:

> I'm looking for super high quality sweats. Example, the above or something from like essentials. https://www.jamesperse.com/products/brushed-cotton-suede-piped-track-pant-black-whiskey-mbcb1476?collection=mens What are some good options?

**James Perse** and **Fear of God / Fear of God Essentials** are the inspirations — that's the bar for fabric, drape, and silhouette. Suggest at that tier even if individual pieces are cheaper (Lady White Co., Reigning Champ, Stòffa, Auralee, Sunspel — fabric quality is the gate, not price).

### Images — this is a lookbook, not a list

Treat the report as a **visual lookbook**. Every pick needs at least one good product image, and the page should look like something you'd actually flip through, not a wall of text with links.

- **Grab product images from the internet.** Brand sites, retailer pages, Pinterest, lookbook references — whatever shows the piece well.
- **Hot-link them, or download them locally** next to the HTML (an `images/` folder is fine). Either approach is fine; downloaded is more robust, hot-linked is lighter.
- **Don't worry about image licensing.** This artifact is personal to Jay and **will not be published or used commercially**. A small source credit next to each image is polite but no formal rights work is needed.

## What it has to do

1. **Find out about Jay.** Start at [jay.ai](https://jay.ai). Build a real picture of him — what he does, how he dresses, what he likely already owns, what colors and silhouettes fit his life. The more the picks reference specific things you learned, the better the report.
2. **Curate 4–8 sweats.** Joggers, hoodies, crewnecks, full sets — mix as you see fit. Each pick gets:
   - Brand, product name, price, link.
   - Fabric / construction note (gauge, weight, blend, country of make).
   - **At least one product image** (see the lookbook section above).
   - Why this one for Jay specifically.
3. **Lead with a thesis.** A short, opinionated read on *what kind of sweats Jay should be buying* — fit profile, palette, occasions. The picks should follow from the thesis, not the other way around.
4. **Lay it out like a lookbook.** A hero image up top, product shots inline with each pick, generous whitespace. Less catalog, more editorial.
5. **Make the picks comparable.** A chart or table so the trade-offs (price vs. weight, casual ↔ luxe, slim ↔ relaxed) are legible at a glance.

## Acceptance criteria

A fresh evaluator can:

1. Open one committed HTML file in a desktop browser — no build, no server, no `npm install`. Images load (either via the live brand-site URLs or from the local `images/` folder included in the solution).
2. Read a clear thesis on what Jay should buy and why.
3. See 4–8 specific products, each with **a product image**, brand, price, link, and a reason tied to something the report actually learned about him.
4. Compare the picks at a glance (chart, table, or equivalent).
5. Feel like they just flipped through a lookbook, not skimmed a spreadsheet. The visual presentation matters as much as the words.

## Out of scope

- Build steps, frameworks, server rendering. Vanilla HTML/CSS/JS, CDN-loaded libraries fine.
- Generic "men's style" advice that could apply to anyone. The report has to feel *for Jay*.
- Affiliate-style hard-sell copy. This is a personal shopper memo.
- Dupes or counterfeit brands.

## GitHub Pages — artifact button

So the [results site](https://jayhack.github.io/galaxy-brain) shows **Open HTML output** for your submission, mirror the report and register it:

1. Copy it to `docs/artifacts/sweats-dossier/<harness>-<model>.html`.
2. On your solution object in [`docs/data.json`](../docs/data.json), set
   `"artifactUrl": "./artifacts/sweats-dossier/<harness>-<model>.html"`.

## Notes for evaluators

Judged on: did the report find out something *real* about Jay, do the picks follow from the thesis, would Jay actually wear any of these, and does the HTML look like something he'd actually want to read.

Solutions: `<harness>-<model>/` under this folder.
