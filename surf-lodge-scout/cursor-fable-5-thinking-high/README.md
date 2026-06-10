# cursor-fable-5-thinking-high — "The Last Legal Lodge"

**Open the pitch:** [`index.html`](./index.html) — one self-contained HTML page
(images load from the local [`img/`](./img) folder, so it renders fully offline
from a fresh clone). A single-file mirror with base64-embedded imagery lives at
[`public/artifacts/surf-lodge-scout/cursor-fable-5-thinking-high.html`](../../public/artifacts/surf-lodge-scout/cursor-fable-5-thinking-high.html).

**Scouting date: June 10, 2026.** Judge all listing prices/statuses against that
date.

## What I built

A site scout's investment brief for a $4M boutique surf lodge in Hawaii. The
core thesis is regulatory rather than romantic: since 2022, Oʻahu (Ord. 22-7),
Kauaʻi (VDA-only since 2008) and Maui (Ord. 5909 "Bill 9" phase-out) have made
nightly lodging illegal at almost every address — so the scout screens for
*legality first, waves second*, which collapses the search onto the V-1.25
resort-zoned pockets and grandfathered STVR registrations of the Aliʻi Drive
corridor in Kailua-Kona (Hawaiʻi County).

The verdict: **78-111-A Holua Rd, Keauhou** ($4.45M ask, twice-cut, ~1 year of
market exposure; offer $3.9M, walk at $4.2M) — a fee-simple, 5BR + guest-studio
compound sleeping 14, a 150 m walk above the surf cove at Heʻeia Bay, carrying
a transferable nonconforming STVR registration. The brief also surfaces a
discrepancy the marketing hides (county GIS says the parcel is RS-10
residential, *not* "resort zone" — the rental right is a registration that
expires 90 days after sale unless re-registered, so the offer is written
contingent on it), names a backup (75-5976 Aliʻi Dr, oceanfront V-1.25 by
right, $1.895M, under contract — take a backup position), and rejects the
beautiful traps with satellite + GIS evidence: Sunset Beach ($3.95M, R-5 zoning
+ managed-retreat erosion coast), Hanalei ($3.999M, rentals banned outside the
VDA + 2018 flood record), and a $4.2M Kona oceanfront two parcels outside the
legal zone.

## Ground truth, not vibes

- `scout/groundtruth.py` — queries official State of Hawaii GIS REST services
  (parcels, county zoning, SMA, lava flow hazard zones, tsunami evacuation
  zones, FEMA DFIRM flood zones) for every candidate parcel. Raw responses are
  committed in `scout/groundtruth.json`.
- `scout/fetch_imagery.py` — fetches Esri World Imagery tiles, stitches and
  annotates the five satellite exhibits in `img/` (sites, breaks, hazards, scale
  bars). Imagery © Esri / Maxar / Earthstar Geographics.
- `scout/build_artifact.py` — produces the single-file artifact mirror.
- One parcel ID was confirmed by tax arithmetic: assessed value x county rate
  reproduces the listing's disclosed tax bill to the dollar (75-5976 Aliʻi Dr).

## How to evaluate

1. Open `surf-lodge-scout/cursor-fable-5-thinking-high/index.html` in any
   desktop browser (no build, no server, no keys).
2. Paste coordinates from the appendix table into Google Maps — each lands on
   what the page claims is there.
3. Click the listing links — prices/statuses should match as of June 10, 2026
   (MLS 729517, 726123, 202605480, 724741, 721460).

No environment variables or dependencies are required to view. Re-running the
scout scripts needs only Python 3 with Pillow (imagery) and network access.
