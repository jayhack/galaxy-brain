# sweats-dossier

## Prompt

Today, we're making a personal shopping report **and lookbook** — that makes a case to **Jay Hack** ([jay.ai](https://jay.ai)) for which sweats he should buy.

His original ask, verbatim:

> I'm looking for super high quality sweats. Example, the above or something from like essentials. https://www.jamesperse.com/products/brushed-cotton-suede-piped-track-pant-black-whiskey-mbcb1476?collection=mens What are some good options?

**James Perse** and **Fear of God / Fear of God Essentials** are referenced the inspirations — that's the bar for fabric, drape, and silhouette. Suggest at that tier even if individual pieces are cheaper (Lady White Co., Reigning Champ, Stòffa, Auralee, Sunspel — fabric quality is the gate, not price).

Your job is to:
- Research the man, to understand him and his motivations
- Research the space of candidate options
- Present a compelling narrative to him for where he should spend his hard-earned money.

A solution is successful to the extent that Jay (1) can easily consume it, (2) finds it informative and compelling and (3) takes your advice, then "runs it back" and asks for more.

Best solutions are those that have unique insight into the landscape of options and present important findings.

Examples of things that could contribute to a compelling narrative:
- Beautiful lookbooks that illustrate different aesthetics, and comparing these to iconic historical examples of stylish/comfortable sweats
- Scraping product reviews and doing an analysis
- Finding AI to generate images of what sweats could look like on Jay


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

Holistically, how compelling is the narrative being made here and how "true" is it? Ultimate evaluation will be taking your advice, trying on the sweats, and seeing which ones are best.

Solutions: `<harness>-<model>/` under this folder.
