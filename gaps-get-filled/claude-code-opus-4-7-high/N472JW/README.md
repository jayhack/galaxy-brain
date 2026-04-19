# N472JW

Submission for the [`gaps-get-filled`](../../README.md) galaxy-brain eval.

## 👉 See the presentation in your browser right now

**➡ [`results/runs/test_7sym/dashboard.html`](https://jayhack.github.io/galaxy-brain/#/eval/gaps-get-filled/claude-code-opus-4-7-high/results/runs/test_7sym/dashboard.html)** (same path committed in the repo, ~900 KB, opens offline)

> Also deployed via GitHub Pages at
> [jayhack.github.io/galaxy-brain/artifacts/gaps-get-filled/claude-code-opus-4-7-high.html](https://jayhack.github.io/galaxy-brain/artifacts/gaps-get-filled/claude-code-opus-4-7-high.html)
> (mirrored from `docs/artifacts/` in this repo so the results site can link to it).

No install, no server. That HTML is the primary deliverable — a
self-contained 10-section narrative (Plotly from CDN, all data embedded)
that argues a specific position:

> **"The claim is empirically true — 78% of gaps fill within 60 days — but the
> naive fade strategy loses money at a Sharpe of −0.61."**

§5 diagnoses the gap between those two facts with three computed
structural reasons. Everything else in this README is about how to
regenerate runs of your own.

---

- **Harness:** Claude Code
- **Model:** Claude Opus 4.7 (high)
- **Stack:** Python 3.9+ · pandas · yfinance (cached parquet) · Plotly (static HTML) · Streamlit (optional)

A lightweight equity-backtesting sandbox, named after the submitter's
grandfather's plane tail number. The first resident strategy tests the folk
wisdom:

> "Gaps get filled."

The repo is deliberately small so new strategies drop in as ten-line `Strategy`
subclasses without fighting a framework.

## Regenerate from scratch

```bash
# install
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# pull price data (7-symbol demo already cached under data/cache/;
# the full S&P 500 over 10 years takes ~10–20 min the first time)
python scripts/fetch_data.py --universe sp500 --years 10

# backtest (writes results/runs/<timestamp>/)
python scripts/run_gap_fill.py --config config/default.yaml

# build the HTML presentation for that run
python scripts/build_dashboard.py --open
```

Every knob is a CLI flag. A few useful ones:

```bash
python scripts/run_gap_fill.py \
    --universe AAPL MSFT NVDA SPY \
    --years 5 \
    --min-gap-pct 0.01 \
    --direction up \
    --stop-loss-pct 0.04 \
    --time-stop-days 40 \
    --run-name my_experiment
python scripts/build_dashboard.py --run my_experiment --open
```

## Optional: interactive Streamlit UI

Same data, interactive view:

```bash
streamlit run app/streamlit_app.py
```

## What's inside

```
src/n472jw/
  data.py             S&P 500 ticker list (Wikipedia) + yfinance + parquet cache
  gaps.py             strict gap detection + fill measurement
  strategy.py         Strategy ABC (subclass this for new strategies)
  backtest.py         single-symbol event-driven backtester
  metrics.py          returns, Sharpe, drawdown, win rate
  strategies/
    gap_fill.py       "fade the gap, target prior extreme, 2% stop" strategy
scripts/
  fetch_data.py       download + cache price data
  run_gap_fill.py     run the gap-fill strategy + diagnostic, write run artifacts
  build_dashboard.py  generate a self-contained HTML presentation for a run
app/
  streamlit_app.py    optional interactive dashboard
config/default.yaml   default parameters (every strategy input is a parameter)
tests/                pytest unit tests for gap detection + fill measurement
```

## The gap-fill hypothesis, defined precisely

A **strict gap up** on day *t* means `low_t > high_{t-1}` — today's entire
range sits above yesterday's range. A **strict gap down** means
`high_t < low_{t-1}`.

The gap is **filled** when price subsequently trades back through the prior
bar's extreme — prior high for a gap up, prior low for a gap down. The
earliest possible fill is day *t+1* (a strict gap cannot fill intra-bar on
day *t* by definition).

This repo evaluates the claim two ways:

1. **Diagnostic** — of all strict gaps in the universe, what fraction fill
   within 1, 5, 20, 60 trading days? Bucketed by symbol, direction, and gap
   size.
2. **Tradeable** — fade the gap at the next open, exit on fill
   (take-profit at the prior extreme), 2% stop-loss, 20-day time stop. Report
   per-trade PnL, win rate, Sharpe, max drawdown.

Running both — and noticing the wide gap between them — is what makes the
presentation interesting.

## Adding a new strategy

```python
# src/n472jw/strategies/my_strategy.py
from ..strategy import Strategy, TradeIntent

class MyStrategy(Strategy):
    name = "my_strategy"

    def generate_signals(self, symbol, df):
        intents = []
        # ... detect your setups, emit TradeIntent(entry_date, side,
        # target_price, stop_price, time_stop_days, meta) per signal ...
        return intents
```

Wire a runner script mirroring `scripts/run_gap_fill.py`. The backtester and
the HTML presentation generator both work off the run directory, so the same
dashboard template renders the new strategy's output with no UI changes.
