# surf-lodge-scout

## Prompt

You are a site scout helping a buyer find a *personal* surf crash pad in
Hawaii — a second home, not a business. Think of it as a family surf base: a
place to escape to, host friends, and launch Hawaiian adventures from. It
would serve as a secondary residence for personal and family use, not a
rental operation or boutique lodge. **Budget: $4M all-in for the property
acquisition.**

Find real options and make the case. How you assemble the narrative is up to
you — the best submissions will be the most *persuasive*, the ones where the
buyer reads it and wants to wire a deposit on their own slice of paradise.

What we care about:

- **Real inventory.** Candidates must be actually for sale, with live listing
  links and prices. Note the date you scouted, since listings go stale.
- **Ground truth from above.** Satellite/aerial imagery is your scouting tool:
  what's really between the parcel and the water? Can you walk from the house
  to the break? Claims should hold up when the evaluator pastes your
  coordinates into Google Maps.
- **The surf story.** A surf pad lives or dies on its waves. Nearby breaks,
  swell exposure, seasonality, crowd factor — grounded in real data (buoys,
  swell models), not vibes.
- **A real home.** This is where the family stays and friends crash, so think
  like a homeowner: room to host, comfort, privacy, and what life there
  actually feels like — not occupancy math.
- **Eyes open.** Hawaii punishes naive buyers: lava zones, tsunami and flood
  zones, zoning and Special Management Areas, leasehold vs fee simple. A
  persuasive case is one that has already found its own weaknesses.
- **A verdict.** Don't hedge across five options. Tell the buyer where to put
  the money and why.

## Deliverable

One committed, browser-openable HTML page — your pitch to the buyer. No
build step, no server, no API keys; imagery stored locally in the solution
folder so it renders from a fresh clone. Link to it near the top of your
solution `README.md`.

## Acceptance criteria

A fresh evaluator can:

1. Clone the repo and open your committed HTML file directly in a desktop
   browser, images intact.
2. Verify your work: listing links resolve to real properties at roughly the
   stated prices (as of your stated scouting date), and coordinates pasted
   into Google Maps match what your page claims about the sites.
3. Come away convinced — or at least know exactly what you'd say to the
   buyer and why. Persuasiveness, grounded in verifiable evidence, is the
   judging axis.

## Results site — artifact button

So the [results site](https://galaxybrain.dev) shows **Open HTML output** for
your submission, mirror the page and register it:

1. Copy it to `public/artifacts/surf-lodge-scout/<harness>-<model>.html`.
2. On your solution object in [`docs/data.json`](../docs/data.json), set
   `"artifactUrl": "./artifacts/surf-lodge-scout/<harness>-<model>.html"`.

## Notes for evaluators

This eval tests real-estate data acquisition, geospatial/satellite reasoning,
and narrative synthesis at once. Coordinates are the ground truth — any
spatial claim should be independently checkable in seconds. Judge listings
against the submission's stated scouting date, not the evaluation date. The
ultimate question: did this scout earn your trust, and would you act on the
recommendation?

Solutions: `<harness>-<model>/` under this folder.
