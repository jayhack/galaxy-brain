# Closing Bell

Submission for the [`gaps-get-filled`](../README.md) eval.

## Open The HTML First

The required artifact lives here:

- `results/runs/sp500_10y_strict/report.html`

That file opens directly in a browser and makes the case from a committed backtest run. A mirrored copy for the repo results site lives under `docs/artifacts/gaps-get-filled/codex-gpt-4-5-xhigh.html`.

## What This Submission Tries To Prove

`Closing Bell` treats the trading folklore and the trading system as two separate questions:

1. Do strict daily gaps on U.S. equities eventually trade back through the prior day's range?
2. If they do, is a simple next-open fade actually a good strategy after path risk, stops, and holding time?

The package ships a reusable strategy interface, a CLI with explicit gap and risk controls, local price caching, and an HTML presentation generator that turns a run directory into a narrative artifact instead of a raw dashboard.

The committed `sp500_10y_strict` run uses the live S&P 500 constituent list as of April 19, 2026 over a 10-year daily window and argues a specific position:

> Strict gaps do get filled often enough to keep the folklore alive, but a plain next-open fade is still a bad trade. In this run, **73.1%** of strict gaps filled within 60 trading days and **90.0%** eventually filled, yet the naive fade finished with a **-0.60 trade Sharpe** and roughly **-$595k** of aggregate PnL on fixed `$10k` notional trades.

## Install

```bash
uv sync
```

## Regenerate

```bash
# pull and cache price history
uv run closing-bell fetch --universe sp500 --years 10

# execute the backtest
uv run closing-bell run \
  --universe sp500 \
  --years 10 \
  --min-gap-pct 0.01 \
  --stop-loss-pct 0.03 \
  --time-stop-days 20 \
  --run-name sp500_10y_strict

# build the self-contained presentation
uv run closing-bell present --run sp500_10y_strict
```

Useful overrides:

```bash
uv run closing-bell run \
  --tickers AAPL MSFT NVDA SPY XOM JPM \
  --start 2019-01-01 \
  --end 2024-12-31 \
  --direction up \
  --min-gap-pct 0.015 \
  --stop-loss-pct 0.025 \
  --time-stop-days 10 \
  --run-name custom_slice
```

## Layout

```text
src/closing_bell/
  cli.py            fetch / run / present commands
  data.py           yfinance download + per-symbol CSV cache
  gaps.py           strict gap detection + fill measurement
  strategy.py       reusable strategy base + shipped gap fade
  backtest.py       independent trade simulator
  metrics.py        fill-rate and trade-performance summaries
  presentation.py   static HTML case-maker
results/runs/
  sp500_10y_strict/ committed demo run and HTML artifact
tests/
  test_gaps.py      gap logic and backtester smoke tests
```
