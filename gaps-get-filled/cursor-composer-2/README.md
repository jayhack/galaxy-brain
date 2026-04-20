# cursor-composer-2 — gapfill-sandbox

Submission for the [`gaps-get-filled`](../README.md) eval.

## Open the presentation (no install)

**Primary artifact:** [`results/sp500_10y_default/presentation.html`](./results/sp500_10y_default/presentation.html)

Open that file in a browser. It is self-contained (data inlined) and summarizes a full S&P 500 × 10-year backtest with per-horizon fill rates and a naive gap-fade trade study.

**Mirrored for GitHub Pages:** after merge, the same HTML is copied to `docs/artifacts/gaps-get-filled/cursor-composer-2.html` with `artifactUrl` set in `docs/data.json`.

---

## Regenerate from scratch

```bash
cd gaps-get-filled/cursor-composer-2
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -e .
```

### 1. Download daily OHLC (cached under `data/cache/`)

```bash
gapfill fetch --universe sp500 --start 2016-04-20 --end 2026-04-20
```

### 2. Run backtest + write JSON results

```bash
gapfill run --run-name sp500_10y_default --universe sp500 \
  --start 2016-04-20 --end 2026-04-20 \
  --min-gap-pct 0.5 --stop-multiple 0.5 --time-stop-days 5 \
  --strategies gap_fill naive_momentum_stub
```

### 3. Build self-contained HTML presentation

```bash
gapfill present --run results/sp500_10y_default
```

Prints the path to `presentation.html` under that run directory.

## What this implements

- **Gap definition (strict range gap):** gap up if `low[t] > high[t-1]`; gap down if `high[t] < low[t-1]`. A gap must also exceed `--min-gap-pct` of the prior close (filters noise).
- **Fill:** gap up fills when future `low` reaches `high[t-1]`; gap down fills when future `high` reaches `low[t-1]`, using daily bars only.
- **Trade:** next-session open fade toward the fill level with a stop `stop_multiple × gap_size` adverse move and a calendar `--time-stop-days` cap.
- **Sandbox:** strategies implement a small protocol so additional hypotheses can be added without rewriting the engine (`naive_momentum_stub` is a no-op placeholder).
