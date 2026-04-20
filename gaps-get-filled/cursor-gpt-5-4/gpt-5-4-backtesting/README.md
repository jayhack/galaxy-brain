# gpt-5-4-backtesting

Submission for the [`gaps-get-filled`](../../README.md) galaxy-brain eval.

## 👉 Open the presentation right now

**In-repo HTML:** [`results/sp500-10y/presentation/report.html`](./results/sp500-10y/presentation/report.html)

**Clickable hosted mirror:** [jayhack.github.io/galaxy-brain/artifacts/gaps-get-filled/cursor-gpt-5-4.html](https://jayhack.github.io/galaxy-brain/artifacts/gaps-get-filled/cursor-gpt-5-4.html)

The presentation takes a clear position:

> **Strict price gaps do often get filled over time, but a naive gap-fade trade is still not a good risk-adjusted strategy.**

It shows both sides of that sentence explicitly:

- a per-horizon fill-rate study at `1d / 5d / 20d / 60d`
- actual trade results for a configurable fade strategy
- a simple Sharpe-style diagnostic explaining why "empirically true" does not automatically mean "tradeable"

## Stack

- Python + `uv`
- `pandas` and `yfinance`
- static Plotly HTML presentations
- a reusable strategy sandbox so later ideas slot in cleanly

## Regenerate from scratch

```bash
uv sync

# fetch/cache daily price data for the S&P 500
uv run gpt-5-4-backtesting download \
  --universe sp500 \
  --years-back 10

# run the baseline presentation build
uv run gpt-5-4-backtesting present \
  --universe sp500 \
  --years-back 10 \
  --min-gap-pct 0.5 \
  --max-hold-days 5 \
  --stop-gap-multiple 0.5 \
  --report-dir results/sp500-10y/presentation

# sweep a few nearby variants
uv run gpt-5-4-backtesting grid-search \
  --universe sp500 \
  --years-back 10 \
  --min-gap-pcts 0.5,1.0,1.5,2.0 \
  --max-hold-days-grid 3,5,10 \
  --stop-gap-multiples none,0.5,1.0 \
  --sort-by avg_return_pct \
  --min-trades 50 \
  --report-dir results/sp500-10y/grid-search
```

The `present` command prints the HTML path and produces a self-contained presentation you can open directly in a browser. The `grid-search` command produces a second HTML companion report showing how small parameter tweaks change the result.

## Hypothesis definition

This submission uses a **strict gap** definition:

- **gap up:** `today.low > yesterday.high`
- **gap down:** `today.high < yesterday.low`

A gap is counted as **filled** once price later trades back through the prior bar's extreme:

- gap up fills when price trades back down to yesterday's high
- gap down fills when price trades back up to yesterday's low

That empirical statement is tested separately from the actual trade rule. The default strategy:

1. detects a strict gap
2. enters contrarian at the gap-day open
3. targets the prior bar boundary
4. exits on fill, stop, or time stop

That split is intentional: the whole point of the presentation is to show how a claim can be true in the data while still not producing a good Sharpe.

## CLI overview

```bash
uv run gpt-5-4-backtesting download --universe sp500 --years-back 10
uv run gpt-5-4-backtesting backtest --universe sp500 --years-back 10
uv run gpt-5-4-backtesting present --universe sp500 --years-back 10
uv run gpt-5-4-backtesting grid-search --universe sp500 --years-back 10
```

Every command also accepts `--symbols AAPL,MSFT,NVDA` instead of a named universe and supports either `--years-back` or explicit `--start` / `--end`.

## Repo layout

```text
src/gpt_5_4_backtesting/
  cli.py          CLI entry points
  data.py         daily OHLCV loader + cache
  universes.py    named universe resolution (currently `sp500`)
  engine.py       backtest + fill-rate study + summary metrics
  grid_search.py  small parameter sweep runner
  reporting.py    static HTML presentation builders
  strategies/
    gap_fill.py   strict-gap detection + baseline fade strategy
tests/
  test_gap_fill.py
  test_grid_search.py
results/
  sp500-10y/
    presentation/
    grid-search/
```

## Extending it

The code is structured so future strategies can reuse the data layer, metrics, CLI plumbing, and presentation pattern. The next obvious experiments are:

- split gap-up and gap-down trades
- filter by market regime
- exclude earnings gaps
- replace trade-level Sharpe with a portfolio-style daily equity curve Sharpe
