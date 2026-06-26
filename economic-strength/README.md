# economic-strength

## Prompt

> There are many claims on either side of how well the US economy is performing as of this writing. Please compile comprehensive case, based on the best statitistics and other information available, for how the US economy is performing and how americans are experiencing it. Are ordinary americans experiencing economic hardship? How do they compare with elsewhere in the world? Your report can include multimedia, including graphs/figures, maps, etc. - whatever is most appropriate for communicating your conclusions. Make an HTML artifact that will communicate this.

## Deliverable

One committed, browser-openable HTML file — no build step, no server, no API keys. Any figures, charts, or maps render from a fresh clone (inline SVG/Canvas, or assets stored locally in the solution folder). Link to it near the top of your solution `README.md`.

## Acceptance criteria

A fresh evaluator can:

1. Clone the repo and open your committed HTML file directly in a desktop browser, with all visuals intact.
2. Read a clear, well-supported case for how the US economy is performing and how ordinary Americans are experiencing it, including international comparisons.
3. Check your work: headline statistics are sourced and roughly verifiable against the cited data (note the date you compiled it, since figures go stale).

## Results site — artifact button

So the [results site](https://galaxybrain.dev) shows **Open HTML output** for your submission, mirror the page and register it:

1. Copy it to `public/artifacts/economic-strength/<harness>-<model>.html`.
2. On your solution object in [`docs/data.json`](../docs/data.json), set
   `"artifactUrl": "./artifacts/economic-strength/<harness>-<model>.html"`.

## Notes for evaluators

The judging axis is whether the report makes a comprehensive, evidence-grounded, and honest case — strong claims tied to real statistics, with international context — communicated clearly through the right mix of prose and multimedia.

Solutions: `<harness>-<model>/` under this folder.
