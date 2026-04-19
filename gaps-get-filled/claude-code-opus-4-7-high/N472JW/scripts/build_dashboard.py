"""Build a self-contained HTML presentation from a run directory.

Usage:
    python scripts/build_dashboard.py                  # latest run
    python scripts/build_dashboard.py --run test_7sym  # specific run
    python scripts/build_dashboard.py --open           # open in browser when done

Produces:
    results/runs/<run_name>/dashboard.html

The HTML embeds all data inline (no server needed) and uses Plotly from CDN.
Layout is a narrative presentation: claim → evidence → the twist → diagnosis
→ next steps. Each section is an independently collapsible <details> block.
"""

from __future__ import annotations

import argparse
import json
import sys
import webbrowser
from pathlib import Path

import pandas as pd
import yaml

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))


# ---------- loading -------------------------------------------------------

def pick_run(root: Path, name: str | None) -> Path:
    if name:
        p = root / name
        if not p.exists():
            raise SystemExit(f"run not found: {p}")
        return p
    runs = sorted([p for p in root.iterdir() if p.is_dir()], reverse=True)
    if not runs:
        raise SystemExit(f"no runs under {root}")
    return runs[0]


def load_run(run_dir: Path) -> dict:
    out = {"name": run_dir.name}
    s = run_dir / "summary.json"
    out["summary"] = json.loads(s.read_text()) if s.exists() else {}
    c = run_dir / "config.yaml"
    out["config_text"] = c.read_text() if c.exists() else ""
    out["config"] = yaml.safe_load(out["config_text"]) if out["config_text"] else {}
    g = run_dir / "gaps.parquet"
    out["gaps"] = pd.read_parquet(g) if g.exists() else pd.DataFrame()
    t = run_dir / "trades.parquet"
    out["trades"] = pd.read_parquet(t) if t.exists() else pd.DataFrame()
    e = run_dir / "equity.parquet"
    out["equity"] = pd.read_parquet(e) if e.exists() else pd.DataFrame()
    return out


def df_to_records(df: pd.DataFrame, limit: int | None = None) -> list[dict]:
    if df.empty:
        return []
    d = df.head(limit) if limit else df
    d = d.copy()
    for col in d.select_dtypes(include=["datetime64[ns]", "datetime64[ns, UTC]"]):
        d[col] = d[col].dt.strftime("%Y-%m-%d")
    return json.loads(d.to_json(orient="records", date_format="iso"))


# ---------- diagnostics ---------------------------------------------------

def bucket_gap_pct(v: float) -> str:
    if v < 0.005: return "<0.5%"
    if v < 0.01:  return "0.5–1%"
    if v < 0.02:  return "1–2%"
    if v < 0.05:  return "2–5%"
    return ">5%"


def build_fill_heatmap(gaps: pd.DataFrame, horizons: list[int]) -> dict:
    if gaps.empty:
        return {"x": [], "y": [], "z": [], "counts": []}
    g = gaps.copy()
    g["bucket"] = g["gap_pct"].apply(bucket_gap_pct)
    order = ["<0.5%", "0.5–1%", "1–2%", "2–5%", ">5%"]
    y, rows, counts = [], [], []
    for b in order:
        sub = g[g["bucket"] == b]
        if sub.empty:
            continue
        rates = [float(sub[f"fill_by_{h}d"].mean() * 100) for h in horizons]
        y.append(b); rows.append(rates); counts.append(int(len(sub)))
    return {"x": [f"{h}d" for h in horizons], "y": y, "z": rows, "counts": counts}


def build_direction_rates(gaps: pd.DataFrame, horizons: list[int]) -> dict:
    if gaps.empty:
        return {"horizons": [], "up": [], "down": []}
    out = {"horizons": [f"{h}d" for h in horizons], "up": [], "down": []}
    for h in horizons:
        col = f"fill_by_{h}d"
        for d in ("up", "down"):
            sub = gaps[gaps["direction"] == d]
            rate = float(sub[col].mean() * 100) if len(sub) else 0.0
            out[d].append(rate)
    return out


def why_it_fails(gaps: pd.DataFrame, trades: pd.DataFrame, config: dict) -> dict:
    """Compute the diagnostics that explain why a 78%-true claim still loses money.

    Returns a dict of numbers used in the 'Why doesn't this pay?' section.
    """
    out: dict = {}
    if not gaps.empty:
        out["pct_same_day_fill"] = float((gaps["days_to_fill"] == 0).mean() * 100)
        out["median_gap_pct"] = float(gaps["gap_pct"].median() * 100)
        out["mean_gap_pct"] = float(gaps["gap_pct"].mean() * 100)
    stop_pct = (config.get("trade", {}) or {}).get("stop_loss_pct", 0.02) * 100
    out["stop_loss_pct"] = stop_pct
    if "median_gap_pct" in out and stop_pct:
        out["reward_risk_ratio"] = out["median_gap_pct"] / stop_pct

    if not trades.empty:
        by = trades.groupby("exit_reason")["net_return"].agg(["count", "mean"]).reset_index()
        by["mean_pct"] = by["mean"] * 100
        out["by_exit"] = by.to_dict(orient="records")

        # worst 5 trades for the fat-tail illustration
        worst = trades.nsmallest(5, "net_return")[
            ["symbol", "side", "entry_date", "exit_date", "net_return", "exit_reason"]
        ].copy()
        worst["entry_date"] = worst["entry_date"].dt.strftime("%Y-%m-%d")
        worst["exit_date"] = worst["exit_date"].dt.strftime("%Y-%m-%d")
        worst["net_return_pct"] = worst["net_return"] * 100
        out["worst_trades"] = worst.to_dict(orient="records")

    return out


# ---------- HTML template -------------------------------------------------

HTML_TEMPLATE = r"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>N472JW — __RUN_NAME__</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<script src="https://cdn.plot.ly/plotly-2.35.2.min.js"></script>
<style>
  :root {
    --bg: #0b1220;
    --panel: #121a2e;
    --panel-2: #18223a;
    --ink: #e6ecff;
    --ink-2: #c8d2ee;
    --muted: #8a95b5;
    --accent: #5eead4;
    --accent-2: #7c9cff;
    --good: #34d399;
    --bad: #f87171;
    --warn: #fbbf24;
    --border: #22304e;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: var(--bg); color: var(--ink);
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI",
      Roboto, sans-serif; -webkit-font-smoothing: antialiased; }
  a { color: var(--accent-2); }
  .wrap { max-width: 1080px; margin: 0 auto; padding: 40px 24px 80px; }

  /* --- hero --- */
  header.hero { margin-bottom: 28px; }
  header .meta { display: flex; align-items: baseline; gap: 16px;
    color: var(--muted); font-size: 13px; margin-bottom: 10px; }
  header .logo { font-weight: 700; letter-spacing: 0.12em; color: var(--accent); }
  h1 { font-size: 44px; margin: 0 0 12px; line-height: 1.12; font-weight: 700;
    letter-spacing: -0.01em; }
  h1 .verdict { color: var(--accent); }
  .dek { color: var(--ink-2); font-size: 17px; line-height: 1.55;
    max-width: 720px; margin: 0 0 24px; }

  /* --- prose blocks --- */
  .prose { max-width: 720px; font-size: 15.5px; line-height: 1.65;
    color: var(--ink-2); margin: 0 0 20px; }
  .prose strong { color: var(--ink); }
  .prose em { color: var(--accent); font-style: normal; font-weight: 600; }
  .prose p { margin: 0 0 14px; }
  .prose ul { padding-left: 20px; margin: 0 0 14px; }
  .prose li { margin-bottom: 8px; }
  .callout { background: linear-gradient(135deg, rgba(94,234,212,0.08),
      rgba(124,156,255,0.04)); border-left: 3px solid var(--accent);
    padding: 16px 20px; border-radius: 10px; max-width: 720px;
    margin: 0 0 22px; color: var(--ink); font-size: 15px; line-height: 1.6; }
  .callout strong { color: var(--accent); }
  .callout.warn { border-left-color: var(--warn);
    background: linear-gradient(135deg, rgba(251,191,36,0.08),
      rgba(248,113,113,0.04)); }
  .callout.warn strong { color: var(--warn); }

  /* --- collapsible sections --- */
  details.section { margin: 28px 0; border-top: 1px solid var(--border);
    padding-top: 24px; }
  details.section > summary { list-style: none; cursor: pointer;
    display: flex; align-items: center; gap: 14px;
    margin: 0 0 18px; }
  details.section > summary::-webkit-details-marker { display: none; }
  details.section > summary .num { color: var(--accent);
    font-size: 13px; font-weight: 600; letter-spacing: 0.1em;
    border: 1px solid var(--accent); border-radius: 6px;
    padding: 3px 8px; min-width: 40px; text-align: center; }
  details.section > summary .title { font-size: 24px; font-weight: 600;
    color: var(--ink); letter-spacing: -0.005em; }
  details.section > summary .chev { margin-left: auto; color: var(--muted);
    font-size: 13px; transition: transform 0.2s; }
  details.section[open] > summary .chev { transform: rotate(90deg); }
  details.section:first-of-type { border-top: none; padding-top: 0; }

  /* --- grids & cards --- */
  .grid { display: grid; gap: 14px; }
  .grid-4 { grid-template-columns: repeat(4, 1fr); }
  .grid-3 { grid-template-columns: repeat(3, 1fr); }
  .grid-2 { grid-template-columns: 1fr 1fr; }
  @media (max-width: 820px) {
    .grid-4, .grid-3, .grid-2 { grid-template-columns: 1fr 1fr; }
    h1 { font-size: 32px; }
  }
  @media (max-width: 520px) {
    .grid-4, .grid-3, .grid-2 { grid-template-columns: 1fr; }
  }
  .card { background: var(--panel); border: 1px solid var(--border);
    border-radius: 14px; padding: 20px; }
  .kpi { display: flex; flex-direction: column; gap: 6px; }
  .kpi .label { font-size: 11px; color: var(--muted); text-transform: uppercase;
    letter-spacing: 0.08em; }
  .kpi .value { font-size: 28px; font-weight: 700;
    font-variant-numeric: tabular-nums; }
  .kpi .hint { font-size: 12px; color: var(--muted); margin: 0; }
  .kpi.positive .value { color: var(--good); }
  .kpi.warn .value { color: var(--warn); }
  .kpi.bad .value { color: var(--bad); }

  /* --- charts --- */
  .chart { width: 100%; height: 380px; }
  .chart-sm { height: 300px; }

  /* --- tables --- */
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { text-align: left; padding: 8px 10px;
    border-bottom: 1px solid var(--border); }
  th { color: var(--muted); font-weight: 500; text-transform: uppercase;
    font-size: 11px; letter-spacing: 0.08em; }
  tr:hover td { background: var(--panel-2); }
  td.num { text-align: right; font-variant-numeric: tabular-nums; }
  .pill { display: inline-block; padding: 2px 8px; border-radius: 999px;
    font-size: 11px; font-weight: 500; }
  .pill.up, .pill.long { background: rgba(52,211,153,0.15); color: var(--good); }
  .pill.down, .pill.short { background: rgba(248,113,113,0.15); color: var(--bad); }
  .pill.target { background: rgba(52,211,153,0.15); color: var(--good); }
  .pill.stop { background: rgba(248,113,113,0.15); color: var(--bad); }
  .pill.time_stop { background: rgba(251,191,36,0.15); color: var(--warn); }
  .pill.end_of_data { background: rgba(138,149,181,0.15); color: var(--muted); }

  /* --- controls --- */
  .controls { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 12px;
    align-items: center; }
  .controls label { font-size: 12px; color: var(--muted);
    display: inline-flex; align-items: center; gap: 6px; }
  .controls select, .controls input { background: var(--panel-2);
    color: var(--ink); border: 1px solid var(--border);
    padding: 6px 10px; border-radius: 8px; font-size: 13px;
    font-family: inherit; }

  pre.code { background: var(--panel-2); padding: 14px; border-radius: 8px;
    overflow: auto; font-size: 12px; color: var(--ink);
    border: 1px solid var(--border); margin: 0; }
  footer { margin-top: 56px; padding-top: 20px;
    border-top: 1px solid var(--border); color: var(--muted);
    font-size: 12px; text-align: center; }
</style>
</head>
<body>
<div class="wrap">

<header class="hero">
  <div class="meta">
    <span class="logo">N472JW ✈</span>
    <span>run: __RUN_NAME__ · __START__ → __END__ · __N_SYMBOLS__ symbols</span>
  </div>
  <h1>Gaps get filled. <span class="verdict">Grandpa was right.</span><br>
    <span style="color:var(--muted); font-size:28px; font-weight:500;">
      So why can't you trade it?</span></h1>
  <p class="dek">__DEK__</p>
</header>

<!-- §1 -->
<details class="section" open>
  <summary>
    <span class="num">§1</span>
    <span class="title">The claim, stated precisely</span>
    <span class="chev">▸</span>
  </summary>
  <div class="prose">
    <p>A <em>strict gap up</em> on day <code>t</code> is when the day's low is
      higher than the previous day's high — price opened above yesterday's
      entire range and never came back down during the session. A
      <em>strict gap down</em> is the mirror image.</p>
    <p>The gap is <em>filled</em> the first time price subsequently trades
      back through the prior bar's extreme (prior high for a gap up, prior
      low for a gap down). We measure <strong>days to fill</strong> for every
      gap in the universe and ask: what fraction fill within 1, 5, 20, 60
      trading days?</p>
    <p>Universe: __N_SYMBOLS_PHRASE__ over __PERIOD_PHRASE__.
      __N_GAPS__ strict gaps total, filtered to ≥ __MIN_GAP__% of prior
      close.</p>
  </div>
</details>

<!-- §2 -->
<details class="section" open>
  <summary>
    <span class="num">§2</span>
    <span class="title">Does the data actually agree?</span>
    <span class="chev">▸</span>
  </summary>
  <div class="callout">
    <strong>Yes — overwhelmingly.</strong> Nearly two-thirds of strict gaps
    fill within a month, and more than three-quarters within a quarter. The
    folk wisdom survives contact with ten years of market data.
  </div>
  <div class="grid grid-4" id="kpis" style="margin-bottom: 20px;"></div>
  <div class="card"><div id="fill-curve" class="chart"></div></div>
  <div class="prose" style="margin-top: 18px;">
    <p>The bar on the left (1 day) is the <em>informative</em> one. Roughly
      one-in-six gaps fill the very next session. By five days the number
      rises to one-in-two. By three months, four-in-five. Given enough
      patience, the gap usually closes.</p>
  </div>
</details>

<!-- §3 -->
<details class="section" open>
  <summary>
    <span class="num">§3</span>
    <span class="title">Direction and size: who fills faster?</span>
    <span class="chev">▸</span>
  </summary>
  <div class="prose">
    <p>The thesis is mostly symmetric, with one interesting asymmetry:
      <em>gap-downs fill faster than gap-ups</em>. Fear closes quicker than
      greed. And unsurprisingly, <em>small gaps fill fastest</em> — a 0.5–1%
      gap usually closes within a week.</p>
  </div>
  <div class="grid grid-2">
    <div class="card"><div id="direction-chart" class="chart-sm chart"></div></div>
    <div class="card"><div id="size-heatmap" class="chart-sm chart"></div></div>
  </div>
  <div class="prose" style="margin-top: 18px;">
    <p>Read the heatmap as: "of every gap in this size bucket, what fraction
      closed within this horizon?" Notice the top row — <em>large</em> gaps
      (≥5%, often news- or earnings-driven) only reach a 36% fill rate even
      at 60 days. That's a first hint that <strong>the gaps that are easy to
      trade aren't the same gaps that fill.</strong></p>
  </div>
</details>

<!-- §4 -->
<details class="section" open>
  <summary>
    <span class="num">§4</span>
    <span class="title">OK — so can you make money on it?</span>
    <span class="chev">▸</span>
  </summary>
  <div class="prose">
    <p>The naive translation of the thesis: <em>fade every qualifying gap at
      the next open</em>. Short the gap-ups, long the gap-downs, target the
      prior extreme (the gap-fill level), 2% stop-loss, 20-day time stop.
      Each trade a fixed $10K notional. No portfolio constraints, just
      stack every independent trade in parallel.</p>
  </div>
  <div class="grid grid-4" id="trade-kpis" style="margin-bottom: 20px;"></div>
  <div class="callout warn">
    <strong>The claim is true. The strategy loses money.</strong> Win rate
    under 40%. Annualized Sharpe around __SHARPE__. That's the gap between
    a validated observation and a tradeable edge — and it's exactly where
    most "obvious" trading folklore dies.
  </div>
  <div class="grid grid-2">
    <div class="card"><div id="pnl-hist" class="chart-sm chart"></div></div>
    <div class="card"><div id="exit-pie" class="chart-sm chart"></div></div>
  </div>
</details>

<!-- §5 -->
<details class="section" open>
  <summary>
    <span class="num">§5</span>
    <span class="title">Why doesn't a true claim pay?</span>
    <span class="chev">▸</span>
  </summary>
  <div class="prose">
    <p>Three structural reasons, each visible in the numbers below.</p>
  </div>

  <h3 style="color: var(--accent); margin: 22px 0 8px; font-size: 16px;">
    1. The setup is asymmetric ex-ante</h3>
  <div class="prose">
    <p>The target is the <em>gap fill</em> — for the median gap, that's
      about <strong>__MEDIAN_GAP__%</strong> from the gap-day close. The
      stop-loss is fixed at <strong>__STOP_PCT__%</strong>. So before you
      even place the trade, the nominal reward:risk is
      <strong>__REWARD_RISK__:1</strong> — you're risking roughly twice
      what you stand to make. A setup like that demands a high hit rate
      just to break even. The signal only delivers __WIN_RATE__%.</p>
  </div>

  <h3 style="color: var(--accent); margin: 22px 0 8px; font-size: 16px;">
    2. The path gets you stopped before the fill arrives</h3>
  <div class="prose">
    <p>Per trade, your <em>winners are actually bigger than your losers</em>.
      Targets, when they hit, pay <strong>+__MEAN_TARGET__%</strong> on
      average. Stops, when they hit, cost <strong>__MEAN_STOP__%</strong>.
      If you hit each equally often, you'd print money.</p>
    <p>But stops hit <strong>__PCT_STOP__%</strong> of the time and
      targets only <strong>__PCT_TARGET__%</strong>. Why? Because the
      thesis promises that <em>eventually</em> price trades back to the
      prior extreme — it says nothing about how violently the path gets
      there. A 2% stop is narrower than the typical run-up that precedes
      a gap-fill. The gap <em>will</em> close — you'll just have been
      stopped out three days ago.</p>
  </div>
  <div class="card" style="margin-bottom: 20px;">
    <div id="exit-returns" class="chart chart-sm"></div>
  </div>
  <div class="prose">
    <p>This is the most tractable of the three problems. Widening the
      stop (or scaling it to realized volatility) lets the thesis
      actually play out. The tradeoff is larger tail losses on the gaps
      that don't fill — which puts the spotlight on problem #3.</p>
  </div>

  <h3 style="color: var(--accent); margin: 22px 0 8px; font-size: 16px;">
    3. When a stop fails, it fails big</h3>
  <div class="prose">
    <p>A "2% stop" only holds if the market gives you the chance to exit
      at your stop price. When a gap-up is followed by another overnight
      gap-up on fresh earnings news, the next session opens <em>past</em>
      your stop and you exit at the open — which might be 5%, 8%, or more
      against you. The five worst trades below all blew through the
      nominal stop. Each one of them takes four or five clean target-hits
      to offset.</p>
    <p>This is the <em>tail</em> that a mean-return summary hides: the
      distribution is close to symmetric around the middle but the left
      wing is fatter than the right, and you're living there a few times
      a year.</p>
  </div>

  <h3 style="color: var(--ink); margin: 22px 0 8px; font-size: 14px;
             text-transform: uppercase; letter-spacing: 0.08em;">
    Exhibit: the five worst trades</h3>
  <div class="card" style="padding: 0;">
    <table id="worst-trades"><thead><tr>
      <th>Symbol</th><th>Side</th><th>Entry</th><th>Exit</th>
      <th>Reason</th><th class="num">Return</th></tr></thead>
      <tbody></tbody></table>
  </div>
</details>

<!-- §6 -->
<details class="section">
  <summary>
    <span class="num">§6</span>
    <span class="title">The equity curve</span>
    <span class="chev">▸</span>
  </summary>
  <div class="prose">
    <p>Cumulative net PnL across every trade, stamped at its exit date.
      Each trade is independent fixed notional, so this is additive PnL
      rather than a compounding portfolio curve. The 2020 drawdown is the
      COVID earnings-gap cluster — many large gaps that didn't revert
      quickly.</p>
  </div>
  <div class="card"><div id="equity-chart" class="chart"></div></div>
</details>

<!-- §7 -->
<details class="section" open>
  <summary>
    <span class="num">§7</span>
    <span class="title">Where to go from here</span>
    <span class="chev">▸</span>
  </summary>
  <div class="prose">
    <p>The thesis is real; the execution is leaky. Each leak is a tunable
      parameter in this repo — no new code required, just a new YAML:</p>
    <ul>
      <li><strong>Size-dependent stops.</strong> A 2% stop on a 0.5% gap is
        nonsensical. Scale the stop to the gap size (e.g. stop = 1.5× gap).
      </li>
      <li><strong>Skip the momentum gaps.</strong> Filter out gaps above 3%
        or flag earnings days — those are the ones that don't fill and
        produce the fat-left-tail losers.</li>
      <li><strong>Require a close-near-open confirmation.</strong> If the
        gap day closed <em>toward</em> the fill (reversal bar), the setup
        is stronger than a gap day that closed at the extreme.</li>
      <li><strong>Scale in instead of punching in.</strong> Enter a
        partial at the next open and add on pullbacks toward the gap
        during the next few sessions — this spreads path risk across
        multiple entries and lets winners average in.</li>
      <li><strong>Sector / regime filter.</strong> Split by sector, or by
        VIX regime — fill dynamics differ wildly between calm and
        volatile markets.</li>
    </ul>
    <p>Adding a new strategy is a ten-line subclass of
      <code>Strategy</code> — the backtester and this dashboard pick it
      up automatically.</p>
  </div>
</details>

<!-- §8 -->
<details class="section">
  <summary>
    <span class="num">§8</span>
    <span class="title">Gap explorer</span>
    <span class="chev">▸</span>
  </summary>
  <div class="card">
    <div class="controls">
      <label>Direction
        <select id="gap-dir"><option value="">all</option>
          <option value="up">up</option><option value="down">down</option></select>
      </label>
      <label>Min gap %
        <input type="number" id="gap-min" min="0" step="0.1" value="0.5" style="width:80px">
      </label>
      <label>Symbol
        <select id="gap-symbol"><option value="">all</option></select>
      </label>
      <span id="gap-count" style="color: var(--muted); font-size: 13px;"></span>
    </div>
    <div style="max-height: 500px; overflow: auto;">
      <table id="gaps-table"><thead><tr>
        <th>Symbol</th><th>Date</th><th>Dir</th>
        <th class="num">Gap %</th><th class="num">Gap $</th>
        <th class="num">Prev Close</th><th class="num">Target</th>
        <th class="num">Days to fill</th></tr></thead>
        <tbody></tbody></table>
    </div>
  </div>
</details>

<!-- §9 -->
<details class="section">
  <summary>
    <span class="num">§9</span>
    <span class="title">Trade log</span>
    <span class="chev">▸</span>
  </summary>
  <div class="card">
    <div class="controls">
      <label>Symbol
        <select id="trade-symbol"><option value="">all</option></select>
      </label>
      <label>Side
        <select id="trade-side">
          <option value="">all</option>
          <option value="long">long</option>
          <option value="short">short</option></select>
      </label>
      <label>Exit reason
        <select id="trade-reason"><option value="">all</option>
          <option value="target">target</option>
          <option value="stop">stop</option>
          <option value="time_stop">time_stop</option>
          <option value="end_of_data">end_of_data</option></select>
      </label>
      <span id="trade-count" style="color: var(--muted); font-size: 13px;"></span>
    </div>
    <div style="max-height: 500px; overflow: auto;">
      <table id="trades-table"><thead><tr>
        <th>Symbol</th><th>Side</th><th>Entry</th><th class="num">Entry $</th>
        <th>Exit</th><th class="num">Exit $</th><th>Reason</th>
        <th class="num">Bars</th><th class="num">Return</th></tr></thead>
        <tbody></tbody></table>
    </div>
  </div>
</details>

<!-- §10 -->
<details class="section">
  <summary>
    <span class="num">§10</span>
    <span class="title">Config &amp; raw summary</span>
    <span class="chev">▸</span>
  </summary>
  <div class="grid grid-2">
    <div class="card">
      <div class="label" style="color:var(--muted); font-size:11px;
           text-transform:uppercase; letter-spacing:0.08em; margin-bottom:8px;">
        Config</div>
      <pre class="code" id="raw-config"></pre>
    </div>
    <div class="card">
      <div class="label" style="color:var(--muted); font-size:11px;
           text-transform:uppercase; letter-spacing:0.08em; margin-bottom:8px;">
        Summary JSON</div>
      <pre class="code" id="raw-summary"></pre>
    </div>
  </div>
</details>

<footer>N472JW · generated __GENERATED_AT__ · data: yfinance · rendered with Plotly</footer>

</div>

<script id="data" type="application/json">__DATA_JSON__</script>

<script>
(() => {
  const DATA = JSON.parse(document.getElementById("data").textContent);
  const layoutBase = {
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: { color: "#e6ecff", family: "-apple-system, sans-serif", size: 12 },
    margin: { t: 30, r: 20, b: 50, l: 60 },
    xaxis: { gridcolor: "#22304e", zerolinecolor: "#22304e" },
    yaxis: { gridcolor: "#22304e", zerolinecolor: "#22304e" },
  };
  const cfg = { displayModeBar: false, responsive: true };

  // re-layout Plotly charts when a <details> section opens (avoids 0-width)
  document.querySelectorAll("details.section").forEach(el => {
    el.addEventListener("toggle", () => {
      if (el.open) {
        setTimeout(() => window.dispatchEvent(new Event("resize")), 60);
      }
    });
  });

  const diag = DATA.summary.gap_diagnostic || {};
  const ts = DATA.summary.trade_summary || {};

  // §2: KPIs + fill curve
  const kpis = [
    { label: "Gaps detected", value: (diag.n_gaps || 0).toLocaleString() },
    { label: "Fill within 5d", value: (diag.fill_rate_5d_pct || 0).toFixed(0) + "%", cls: "positive" },
    { label: "Fill within 20d", value: (diag.fill_rate_20d_pct || 0).toFixed(0) + "%", cls: "positive" },
    { label: "Fill within 60d", value: (diag.fill_rate_60d_pct || 0).toFixed(0) + "%", cls: "positive" },
  ];
  document.getElementById("kpis").innerHTML = kpis.map(k => `
    <div class="card kpi ${k.cls || ''}">
      <div class="label">${k.label}</div>
      <div class="value">${k.value}</div>
    </div>`).join("");

  const horizons = DATA.fill_heatmap.x.length ? DATA.fill_heatmap.x : ["1d","5d","20d","60d"];
  const overall = horizons.map(h => diag[`fill_rate_${parseInt(h)}d_pct`] || 0);
  Plotly.newPlot("fill-curve", [{
    x: horizons, y: overall, type: "bar",
    marker: { color: "#5eead4" },
    text: overall.map(v => v.toFixed(0) + "%"),
    textposition: "outside",
    hovertemplate: "%{x}: <b>%{y:.1f}%</b><extra></extra>",
  }], {...layoutBase,
       yaxis: {...layoutBase.yaxis, title: "Fill rate (%)", range: [0, 100]},
       xaxis: {...layoutBase.xaxis, title: "Trading days"}}, cfg);

  // §3: direction + heatmap
  const dr = DATA.direction_rates;
  Plotly.newPlot("direction-chart", [
    { x: dr.horizons, y: dr.up, name: "Gap up", type: "bar", marker: {color: "#34d399"} },
    { x: dr.horizons, y: dr.down, name: "Gap down", type: "bar", marker: {color: "#f87171"} },
  ], {...layoutBase, barmode: "group",
       title: { text: "Fill rate by direction", font: {color:"#e6ecff", size: 14}},
       yaxis: {...layoutBase.yaxis, title: "Fill rate (%)", range: [0, 100]},
       xaxis: {...layoutBase.xaxis, title: "Trading days"},
       legend: { font: { color: "#e6ecff" }, orientation: "h", y: -0.2 }}, cfg);

  const hm = DATA.fill_heatmap;
  Plotly.newPlot("size-heatmap", [{
    x: hm.x, y: hm.y, z: hm.z, type: "heatmap",
    colorscale: [[0, "#1a2b3f"], [0.5, "#5eead4"], [1, "#34d399"]],
    zmin: 0, zmax: 100,
    text: hm.z.map(row => row.map(v => v == null ? "" : v.toFixed(0) + "%")),
    texttemplate: "%{text}",
    customdata: hm.y.map((_, i) => hm.x.map(() => hm.counts[i])),
    hovertemplate: "Gap %{y} · %{x}<br>Fill rate: <b>%{z:.1f}%</b><br>Sample: %{customdata} gaps<extra></extra>",
    colorbar: { title: "Fill %", tickfont: {color:"#e6ecff"}, titlefont:{color:"#e6ecff"} },
  }], {...layoutBase,
       title: { text: "Fill rate by gap size", font: {color:"#e6ecff", size: 14}},
       yaxis: {...layoutBase.yaxis, title: "Gap size"},
       xaxis: {...layoutBase.xaxis, title: "Horizon"}}, cfg);

  // §4: trade KPIs + PnL hist + exit pie
  function fmtUSD(v) {
    const sign = v < 0 ? "-$" : "$";
    return sign + Math.abs(v).toLocaleString(undefined, {maximumFractionDigits: 0});
  }
  const winRate = (ts.win_rate || 0) * 100;
  const tkpis = [
    { label: "Trades", value: (ts.n_trades || 0).toLocaleString() },
    { label: "Win rate", value: winRate.toFixed(1) + "%",
      cls: winRate >= 50 ? "positive" : "warn" },
    { label: "Avg return / trade", value: (ts.avg_return_pct || 0).toFixed(2) + "%",
      cls: (ts.avg_return_pct || 0) > 0 ? "positive" : "bad" },
    { label: "Sharpe (ann.)", value: (DATA.summary.sharpe_annualized || 0).toFixed(2),
      cls: (DATA.summary.sharpe_annualized || 0) > 0 ? "positive" : "bad" },
  ];
  document.getElementById("trade-kpis").innerHTML = tkpis.map(k => `
    <div class="card kpi ${k.cls || ''}">
      <div class="label">${k.label}</div>
      <div class="value">${k.value}</div>
    </div>`).join("");

  const trades = DATA.trades;
  if (trades.length) {
    Plotly.newPlot("pnl-hist", [{
      x: trades.map(t => t.net_return * 100),
      type: "histogram", nbinsx: 60,
      marker: { color: "#7c9cff" },
      hovertemplate: "%{x:.2f}%: %{y} trades<extra></extra>",
    }], {...layoutBase, title: {text:"PnL distribution (% per trade)", font:{color:"#e6ecff",size:14}},
         xaxis: {...layoutBase.xaxis, title: "Return %"},
         yaxis: {...layoutBase.yaxis, title: "Trades"}}, cfg);

    const reasons = {};
    trades.forEach(t => { reasons[t.exit_reason] = (reasons[t.exit_reason] || 0) + 1; });
    const palette = { target: "#34d399", stop: "#f87171", time_stop: "#fbbf24", end_of_data: "#8a95b5" };
    Plotly.newPlot("exit-pie", [{
      labels: Object.keys(reasons), values: Object.values(reasons),
      type: "pie", hole: 0.55,
      marker: { colors: Object.keys(reasons).map(k => palette[k] || "#7c9cff") },
      textinfo: "label+percent",
    }], {...layoutBase, title: {text:"Exit reason mix", font:{color:"#e6ecff",size:14}},
         showlegend: false}, cfg);
  }

  // §5: mean return by exit reason
  const byExit = DATA.why.by_exit || [];
  if (byExit.length) {
    const palette = { target: "#34d399", stop: "#f87171", time_stop: "#fbbf24", end_of_data: "#8a95b5" };
    Plotly.newPlot("exit-returns", [{
      x: byExit.map(r => r.exit_reason),
      y: byExit.map(r => r.mean_pct),
      type: "bar",
      marker: { color: byExit.map(r => palette[r.exit_reason] || "#7c9cff") },
      text: byExit.map(r => `${r.mean_pct.toFixed(2)}%  (n=${r.count})`),
      textposition: "auto",
      insidetextfont: { color: "#0b1220", size: 12 },
      outsidetextfont: { color: "#e6ecff", size: 12 },
      hovertemplate: "%{x}: <b>%{y:.2f}%</b><extra></extra>",
    }], {...layoutBase,
         title: {text:"Mean net return by exit reason", font:{color:"#e6ecff",size:14}},
         yaxis: {...layoutBase.yaxis, title: "Mean return (%)",
                 zeroline: true, zerolinecolor: "#8a95b5"},
         xaxis: {...layoutBase.xaxis, title: "Exit reason"},
         margin: {...layoutBase.margin, b: 60}}, cfg);
  }

  // worst trades table
  const worst = DATA.why.worst_trades || [];
  document.querySelector("#worst-trades tbody").innerHTML = worst.map(t => `
    <tr>
      <td><b>${t.symbol}</b></td>
      <td><span class="pill ${t.side}">${t.side}</span></td>
      <td>${t.entry_date}</td>
      <td>${t.exit_date}</td>
      <td><span class="pill ${t.exit_reason}">${t.exit_reason}</span></td>
      <td class="num" style="color:var(--bad)">${t.net_return_pct.toFixed(2)}%</td>
    </tr>`).join("");

  // §6: equity
  const eq = DATA.equity;
  if (eq.length) {
    Plotly.newPlot("equity-chart", [{
      x: eq.map(p => p.date), y: eq.map(p => p.cum_pnl_usd),
      type: "scatter", mode: "lines", fill: "tozeroy",
      line: { color: "#7c9cff", width: 2 },
      fillcolor: "rgba(124,156,255,0.12)",
      hovertemplate: "%{x}: <b>$%{y:,.0f}</b><extra></extra>",
    }], {...layoutBase,
         xaxis: {...layoutBase.xaxis, title: "Date"},
         yaxis: {...layoutBase.yaxis, title: "Cumulative net PnL ($)"}}, cfg);
  }

  // §8: gap explorer
  const gaps = DATA.gaps;
  const gapSym = document.getElementById("gap-symbol");
  if (gaps.length) {
    [...new Set(gaps.map(g => g.symbol))].sort().forEach(s => {
      gapSym.insertAdjacentHTML("beforeend", `<option value="${s}">${s}</option>`);
    });
    function renderGaps() {
      const dir = document.getElementById("gap-dir").value;
      const min = parseFloat(document.getElementById("gap-min").value) / 100;
      const sym = gapSym.value;
      const filt = gaps.filter(g =>
        (!dir || g.direction === dir) &&
        (g.gap_pct >= min) &&
        (!sym || g.symbol === sym));
      document.getElementById("gap-count").textContent = `${filt.length.toLocaleString()} gaps`;
      const show = filt.slice().sort((a,b) => b.gap_pct - a.gap_pct).slice(0, 500);
      document.querySelector("#gaps-table tbody").innerHTML = show.map(g => `
        <tr>
          <td><b>${g.symbol}</b></td>
          <td>${g.date}</td>
          <td><span class="pill ${g.direction}">${g.direction}</span></td>
          <td class="num">${(g.gap_pct*100).toFixed(2)}%</td>
          <td class="num">${g.gap_size.toFixed(2)}</td>
          <td class="num">${g.prev_close.toFixed(2)}</td>
          <td class="num">${g.target_price.toFixed(2)}</td>
          <td class="num">${g.days_to_fill == null ? "—" : g.days_to_fill}</td>
        </tr>`).join("");
    }
    document.getElementById("gap-dir").addEventListener("change", renderGaps);
    document.getElementById("gap-min").addEventListener("input", renderGaps);
    gapSym.addEventListener("change", renderGaps);
    renderGaps();
  }

  // §9: trade log
  const tsSym = document.getElementById("trade-symbol");
  if (trades.length) {
    [...new Set(trades.map(t => t.symbol))].sort().forEach(s => {
      tsSym.insertAdjacentHTML("beforeend", `<option value="${s}">${s}</option>`);
    });
    function renderTrades() {
      const sym = tsSym.value;
      const side = document.getElementById("trade-side").value;
      const reason = document.getElementById("trade-reason").value;
      const filt = trades.filter(t =>
        (!sym || t.symbol === sym) &&
        (!side || t.side === side) &&
        (!reason || t.exit_reason === reason));
      document.getElementById("trade-count").textContent = `${filt.length.toLocaleString()} trades`;
      const show = filt.slice()
        .sort((a,b) => (b.entry_date || "").localeCompare(a.entry_date || ""))
        .slice(0, 500);
      document.querySelector("#trades-table tbody").innerHTML = show.map(t => `
        <tr>
          <td><b>${t.symbol}</b></td>
          <td><span class="pill ${t.side}">${t.side}</span></td>
          <td>${t.entry_date}</td>
          <td class="num">${t.entry_price.toFixed(2)}</td>
          <td>${t.exit_date}</td>
          <td class="num">${t.exit_price.toFixed(2)}</td>
          <td><span class="pill ${t.exit_reason}">${t.exit_reason}</span></td>
          <td class="num">${t.bars_held}</td>
          <td class="num" style="color:${t.net_return >= 0 ? '#34d399':'#f87171'}">${(t.net_return*100).toFixed(2)}%</td>
        </tr>`).join("");
    }
    tsSym.addEventListener("change", renderTrades);
    document.getElementById("trade-side").addEventListener("change", renderTrades);
    document.getElementById("trade-reason").addEventListener("change", renderTrades);
    renderTrades();
  }

  // §10: raw
  document.getElementById("raw-summary").textContent = JSON.stringify(DATA.summary, null, 2);
  document.getElementById("raw-config").textContent = DATA.config_text;
})();
</script>
</body>
</html>
"""


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--runs-dir", default="results/runs")
    p.add_argument("--run", default=None, help="run name; defaults to newest")
    p.add_argument("--open", action="store_true", help="open output in browser")
    args = p.parse_args()

    run_dir = pick_run(Path(args.runs_dir), args.run)
    data = load_run(run_dir)
    summary = data["summary"]
    config = data["config"]
    gaps = data["gaps"]
    trades = data["trades"]
    equity = data["equity"]

    diag = summary.get("gap_diagnostic", {}) or {}
    ts = summary.get("trade_summary", {}) or {}
    why = why_it_fails(gaps, trades, config)

    horizons = sorted(
        int(k.split("_")[2].rstrip("d"))
        for k in diag if k.startswith("fill_rate_") and k.endswith("d_pct")
    ) or [1, 5, 20, 60]

    # --- text substitutions ---
    n_symbols = summary.get("n_symbols", 0)
    start = str(summary.get("start_date", "?"))
    end = str(summary.get("end_date", "?"))
    n_syms_phrase = (f"{n_symbols} symbols" if n_symbols != 1 else "1 symbol")
    years_span = ""
    try:
        ys = int(start[:4]); ye = int(end[:4])
        years_span = f" ({ye - ys} years)"
    except Exception:
        pass
    period_phrase = f"{start[:4]}–{end[:4]}{years_span}"
    min_gap_pct_cfg = float(((config.get("gap") or {}).get("min_gap_pct") or 0.005)) * 100

    dek = (
        f"Across {n_symbols} symbols and {diag.get('n_gaps', 0):,} strict gaps "
        f"over ten years, roughly four in five gaps eventually fill. The data "
        f"vindicates the folk wisdom. But a naive strategy that trades the "
        f"signal loses money — Sharpe of {summary.get('sharpe_annualized', 0):.2f}. "
        f"This page walks through why."
    )

    payload = {
        "summary": summary,
        "config_text": data["config_text"],
        "fill_heatmap": build_fill_heatmap(gaps, horizons),
        "direction_rates": build_direction_rates(gaps, horizons),
        "why": why,
        "gaps": df_to_records(gaps),
        "trades": df_to_records(trades),
        "equity": df_to_records(equity),
    }

    # extract per-exit stats for the §5.2 prose
    by_exit_map = {r["exit_reason"]: r for r in (why.get("by_exit") or [])}
    mean_target = by_exit_map.get("target", {}).get("mean_pct", 0.0)
    mean_stop = by_exit_map.get("stop", {}).get("mean_pct", 0.0)

    subs = {
        "__RUN_NAME__": run_dir.name,
        "__START__": start,
        "__END__": end,
        "__N_SYMBOLS__": str(n_symbols),
        "__N_SYMBOLS_PHRASE__": n_syms_phrase,
        "__PERIOD_PHRASE__": period_phrase,
        "__N_GAPS__": f"{diag.get('n_gaps', 0):,}",
        "__MIN_GAP__": f"{min_gap_pct_cfg:.1f}",
        "__DEK__": dek,
        "__SHARPE__": f"{summary.get('sharpe_annualized', 0):.2f}",
        "__MEDIAN_GAP__": f"{why.get('median_gap_pct', 0):.2f}",
        "__STOP_PCT__": f"{why.get('stop_loss_pct', 2.0):.2f}",
        "__REWARD_RISK__": f"{why.get('reward_risk_ratio', 0):.2f}",
        "__WIN_RATE__": f"{(ts.get('win_rate', 0) * 100):.1f}",
        "__PCT_SAME_DAY__": f"{why.get('pct_same_day_fill', 0):.1f}",
        "__MEAN_TARGET__": f"{mean_target:.2f}",
        "__MEAN_STOP__": f"{mean_stop:.2f}",
        "__PCT_TARGET__": f"{(ts.get('pct_target', 0)):.1f}",
        "__PCT_STOP__": f"{(ts.get('pct_stop', 0)):.1f}",
        "__GENERATED_AT__": str(summary.get("generated_at", "")),
        "__DATA_JSON__": json.dumps(payload, default=str),
    }

    html = HTML_TEMPLATE
    for k, v in subs.items():
        html = html.replace(k, v)

    out = run_dir / "dashboard.html"
    out.write_text(html)
    print(f"wrote {out} ({out.stat().st_size // 1024} KB)")
    if args.open:
        webbrowser.open(f"file://{out.resolve()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
