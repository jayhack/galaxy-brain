# gaps-get-filled

## Prompt

Old trader's folklore: if there's a gap between yesterday's candle and today's
on a stock chart, that gap will eventually get *filled* — price will trade back
through it.

Build a system that empirically tests this claim on U.S. equities and then
**makes a case** for what the result means. Specifically:

1. A **backtesting sandbox** you can extend with new strategies later — the
   first strategy it ships with is the gap-fill hypothesis, but the framing
   should accommodate a second and third strategy without a rewrite.
2. A **command-line interface** to run the backtest with configurable
   parameters (universe, date range, gap size threshold, trade stops, time
   stops, etc.).
3. A **self-contained HTML presentation** generated from the backtest output
   that argues a position on what the result means. Not a dashboard that just
   dumps charts — a presentation that walks a reader through the claim, the
   evidence, and the conclusion.

Test at minimum on the S&P 500 over a 10-year window. You pick the gap
definition; state it explicitly.

## Deliverable: an HTML file (required)

This eval’s submission **must include at least one committed `.html` file**:
the self-contained presentation described above. That HTML is not optional
decoration — it is the primary artifact reviewers open in a browser. A
solution that only ships code, notebooks, or a server-rendered UI **without**
this committed HTML file does not pass, even if the analysis is strong.

## "Makes a case" means

- Define the hypothesis precisely (what counts as a gap, what counts as a
  fill). These are choices; own them and explain them.
- Show whether the data supports the claim. Don't soften a "yes" or hedge a
  "no" — pick a position.
- If the hypothesis is empirically true but not tradeable (a common outcome
  for folklore), **say so and explain why**. That's a more interesting story
  than either a clean yes or a clean no.
- Use supporting evidence — charts, tables, computed diagnostics — that
  actually back the argument up, not decoration.

## Acceptance criteria

A submission passes if a fresh evaluator can:

1. Clone the repo, `cd` into the solution directory, and follow the `README.md`.
2. Install dependencies with a single package manager (`pip`, `uv`, `npm`,
   `pnpm`, `bun`, `cargo`, `go`, etc.).
3. Run a documented CLI command to pull price data (cached locally).
4. Run a documented CLI command to execute the backtest. The command must
   accept at least:
   - A universe selector (a named set like `sp500` or a ticker list).
   - A date range or years-back window.
   - A minimum gap size threshold.
   - A stop-loss and time-stop parameter.
5. Run a documented CLI command that builds a **self-contained HTML file**
   (inline data, CDN-loaded JS if needed) at a printed path. The submission
   **must** include that HTML (or an equivalent generated copy) as a real file
   in the repo — not only as instructions to build it.
6. Open that **HTML file** directly in a browser (no server required) and see a
   presentation that:
   - States the gap definition explicitly.
   - Takes a position on whether "gaps get filled" is empirically supported.
   - Shows per-horizon fill rates (1d / 5d / 20d / 60d is a reasonable default).
   - Shows backtested trade performance (win rate, PnL distribution, equity
     curve, Sharpe or equivalent).
   - Explains any gap between the empirical claim and the tradeable result.

### Ship a results directory with a precomputed HTML file

Every submission **must** include a `results/` directory (or similarly
named) inside the solution that contains at least one **precomputed,
committed `.html` file** — the HTML presentation. The submission's `README.md`
must prominently link to that file near the top — ideally in the first screen of
the README — so an evaluator can *open the `.html` in a browser without
running anything*. The "regenerate from scratch" instructions come after.

This is a hard requirement. A solution whose output lives only behind a
`python scripts/...` command that requires installing dependencies and
pulling 500 symbols of price data first does not pass, even if the
presentation is good. The committed HTML file is the evidence.

**galaxy-brain site:** To surface the same HTML from
[jayhack.github.io/galaxy-brain](https://jayhack.github.io/galaxy-brain), follow
the repo convention in the root [`README.md`](../README.md#html-artifacts-github-pages)
(copy under `docs/artifacts/…` and set `artifactUrl` in `docs/data.json`).

## Out of scope

- Live trading, broker integration, order routing.
- Portfolio construction / capital allocation across many concurrent signals
  (fixed notional per trade is fine).
- Intraday / tick data (daily OHLC is sufficient; finer granularity is
  welcome but not required).
- Authentication, multi-user, mobile UI.
- Statistical sophistication beyond what's needed to support the case (no
  need for walk-forward optimization, cointegration tests, etc. — but if
  they help the case, great).

## Notes for evaluators

Solutions may define "gap" differently, pick different universes, run
different gap-size filters, or reach different conclusions. That's intentional
— one thing this eval is probing is whether the agent makes *defensible*
choices and *communicates* them, not whether it picks the "right" ones.

The HTML presentation is the primary deliverable. A beautiful CLI with a
mediocre presentation fails. A mediocre CLI with a presentation that
genuinely reframes your understanding of a folk claim passes.

Solutions live under `<harness>-<model>/` subdirectories. Each is
self-contained.

Current solutions:

- `[claude-code-opus-4-7-high/](./claude-code-opus-4-7-high)` — Claude Code
  + Claude Opus 4.7 (high). Project name: **N472JW**.
- `[codex-gpt-5-4-xhigh/](./codex-gpt-5-4-xhigh)` — Codex + GPT-5.4
  (xhigh). Project name: **Closing Bell**.
- `[cursor-gpt-5-4/](./cursor-gpt-5-4)` — Cursor + GPT-5.4. Project name:
  **gpt-5-4-backtesting**.
- `[cursor-composer-2/](./cursor-composer-2)` — Cursor + Composer 2. Project name:
  **gapfill-sandbox**.
