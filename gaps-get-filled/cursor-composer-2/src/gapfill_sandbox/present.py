from __future__ import annotations

import html
import json
from pathlib import Path


def build_presentation(run_dir: Path) -> Path:
    """Read run.json from run_dir and write presentation.html (self-contained + Chart.js CDN)."""
    json_path = run_dir / "run.json"
    if not json_path.exists():
        raise FileNotFoundError(f"Missing {json_path}")
    data = json.loads(json_path.read_text(encoding="utf-8"))
    summary = data["summary"]
    cfg = data["config"]
    per_h = data["per_horizon"]
    curve = data["equity_curve"]
    pnls = [float(x) for x in data.get("sample_pnls", [])]
    exits = {k: int(v) for k, v in summary.get("exit_counts", {}).items()}

    n = int(summary["n_gap_events"])
    fill_1 = per_h.get("1d", {}).get("fill_rate", 0) * 100
    fill_5 = per_h.get("5d", {}).get("fill_rate", 0) * 100
    fill_20 = per_h.get("20d", {}).get("fill_rate", 0) * 100
    fill_60 = per_h.get("60d", {}).get("fill_rate", 0) * 100

    snr = summary.get("mean_over_std_per_trade", 0)
    win_rate = summary.get("win_rate", 0) * 100
    mean_pnl = summary.get("mean_trade_pnl_pct", 0)

    # Verdict text (explicit position) — distinguish empirical fill vs. trade quality.
    if fill_60 >= 70 and win_rate < 45:
        verdict_title = "The folklore mostly survives — the naive fade mostly does not."
        verdict_body = (
            "On this S&amp;P 500 sample, a large majority of strict gaps eventually trade back through the "
            "prior session's extreme within a couple of months. That is the empirical content of "
            "<em>gaps get filled</em>. The companion fade rule, though, loses far more often than it wins: "
            "stops fire constantly, many fills arrive only after the time stop, and the payoff is skewed. "
            "A positive mean return can hide a strategy you would not want to sit through."
        )
    elif fill_60 < 50:
        verdict_title = "Under this definition, 'gaps get filled' is not a reliable law."
        verdict_body = (
            "Fill rates within 60 trading days stay below coin-flip levels for strict gaps after filters. "
            "Either the folklore is wrong for modern large-cap equities, or it only holds under different "
            "definitions (intraday, smaller caps, different gap-size rules)."
        )
    else:
        verdict_title = "Gaps fill often enough to notice — trading them is still its own question."
        verdict_body = (
            "Fill rates are materially high at longer horizons, so the chart pattern is real. "
            "Whether that is economically meaningful after stops and time stops depends on the numbers below."
        )

    payload = {
        "curve": curve,
        "pnls": pnls[:8000],
        "horizons": {"1d": fill_1, "5d": fill_5, "20d": fill_20, "60d": fill_60},
    }
    payload_json = json.dumps(payload)

    doc = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Gap fill folklore — {html.escape(cfg.get("run_name", "run"))}</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
  <style>
    :root {{
      --bg: #0c0f14;
      --card: #151a22;
      --text: #e8edf5;
      --muted: #8b98ad;
      --accent: #5ee1a0;
      --warn: #f0b429;
      --border: #2a3344;
    }}
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
      background: radial-gradient(1200px 800px at 20% -10%, #1a2435 0%, var(--bg) 55%);
      color: var(--text); line-height: 1.55;
    }}
    .wrap {{ max-width: 920px; margin: 0 auto; padding: 32px 20px 80px; }}
    h1 {{ font-size: 1.75rem; font-weight: 650; letter-spacing: -0.02em; margin: 0 0 8px; }}
    .eyebrow {{ color: var(--muted); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.12em; }}
    .verdict {{
      margin-top: 28px; padding: 20px 22px; border: 1px solid var(--border); border-radius: 14px;
      background: linear-gradient(145deg, #121826, #10151d);
    }}
    .verdict h2 {{ margin: 0 0 10px; font-size: 1.2rem; color: var(--accent); }}
    .grid {{ display: grid; gap: 14px; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); margin-top: 22px; }}
    .card {{
      padding: 16px 18px; border-radius: 12px; border: 1px solid var(--border);
      background: var(--card);
    }}
    .card h3 {{ margin: 0 0 8px; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); }}
    .big {{ font-size: 1.55rem; font-weight: 700; }}
    section {{ margin-top: 36px; }}
    section h2 {{ font-size: 1.1rem; margin: 0 0 12px; color: var(--warn); }}
    .explain {{ color: var(--muted); font-size: 0.95rem; }}
    canvas {{ max-height: 320px; }}
    table {{ width: 100%; border-collapse: collapse; font-size: 0.9rem; }}
    th, td {{ padding: 8px 10px; border-bottom: 1px solid var(--border); text-align: left; }}
    th {{ color: var(--muted); font-weight: 600; }}
    code {{ background: #0f131b; padding: 2px 6px; border-radius: 6px; font-size: 0.85em; }}
    ol {{ margin: 0; padding-left: 1.2rem; color: var(--muted); }}
    .footnote {{ margin-top: 28px; font-size: 0.82rem; color: var(--muted); }}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="eyebrow">gaps-get-filled / cursor-composer-2 / gapfill-sandbox</div>
    <h1>Do “gaps get filled” on U.S. large caps?</h1>
    <p class="explain">
      This page is generated from committed backtest output. It is meant to be opened as a static file
      (no server). Charts load Chart.js from a CDN; all series data are inlined below.
    </p>

    <div class="verdict">
      <h2>{html.escape(verdict_title)}</h2>
      <p>{verdict_body}</p>
    </div>

    <div class="grid">
      <div class="card"><h3>Universe</h3><div class="big">{html.escape(str(cfg.get("universe")))}</div>
        <div class="explain">{html.escape(str(cfg.get("start")))} → {html.escape(str(cfg.get("end")))}</div></div>
      <div class="card"><h3>Strict gap filter</h3><div class="big">≥ {html.escape(str(cfg.get("min_gap_pct")))}%</div>
        <div class="explain">of mid-price between sessions</div></div>
      <div class="card"><h3>Gap events detected</h3><div class="big">{n:,}</div>
        <div class="explain">Across cached daily bars</div></div>
      <div class="card"><h3>Mean / σ per trade</h3><div class="big">{snr:.2f}</div>
        <div class="explain">Not annualized — overlapping events across names/dates</div></div>
    </div>

    <section>
      <h2>Definitions (what we measured)</h2>
      <ol>
        <li><strong>Strict range gap:</strong> for the prior daily bar’s high <code>H₁</code> and low <code>L₁</code>,
          a <em>gap up</em> is a day whose low <code>L₂ &gt; H₁</code>; a <em>gap down</em> is <code>H₂ &lt; L₁</code>.
          We require the gap’s absolute size to exceed <code>{html.escape(str(cfg.get("min_gap_pct")))}%</code>
          of the midpoint between the two sessions’ touching prices to drop micro-gaps.</li>
        <li><strong>Fill:</strong> for an up-gap, filled when a future daily <strong>low</strong> trades at or below <code>H₁</code>;
          for a down-gap, when a future daily <strong>high</strong> reaches <code>L₁</code>. Only full daily bars after the gap day.</li>
        <li><strong>Naive trade:</strong> enter at the next session’s open in the fade direction; stop at
          <code>{html.escape(str(cfg.get("stop_multiple")))}×</code> the gap size against the position;
          exit at <code>{html.escape(str(cfg.get("time_stop_days")))}</code> calendar trading days if neither stop nor fill level hits.</li>
      </ol>
    </section>

    <section>
      <h2>Fill rates by horizon</h2>
      <p class="explain">Share of gaps that touched the gap edge within N trading days (exclusive of the gap day).</p>
      <table>
        <thead><tr><th>Horizon</th><th>Fill rate</th></tr></thead>
        <tbody>
          <tr><td>1 trading day</td><td>{fill_1:.1f}%</td></tr>
          <tr><td>5 trading days</td><td>{fill_5:.1f}%</td></tr>
          <tr><td>20 trading days</td><td>{fill_20:.1f}%</td></tr>
          <tr><td>60 trading days</td><td>{fill_60:.1f}%</td></tr>
        </tbody>
      </table>
    </section>

    <section>
      <h2>Trade performance</h2>
      <p class="explain">
        Win rate {win_rate:.1f}% · mean return per trade {mean_pnl:.3f}% (simple, not compounded).
        Exit mix: {html.escape(json.dumps(exits))}
      </p>
      <div class="grid">
        <div class="card" style="grid-column: 1 / -1;">
          <h3>Cumulative trade P&amp;L index (sum of per-trade % moves)</h3>
          <canvas id="eq"></canvas>
        </div>
        <div class="card" style="grid-column: 1 / -1;">
          <h3>Distribution of per-trade returns (%)</h3>
          <canvas id="hist"></canvas>
        </div>
      </div>
    </section>

    <p class="footnote">
      Generated by <code>gapfill present</code> · Run <code>{html.escape(str(cfg.get("run_name")))}</code> ·
      Strategies registered: {html.escape(json.dumps([s["name"] for s in data.get("strategies", [])]))}
    </p>
  </div>
  <script id="payload" type="application/json">{payload_json}</script>
  <script>
    const raw = document.getElementById("payload").textContent;
    const P = JSON.parse(raw);
    const curve = P.curve || [];
    const labels = curve.map(c => c.date);
    const eq = curve.map(c => c.cum_pnl_pct);
    new Chart(document.getElementById("eq"), {{
      type: "line",
      data: {{
        labels,
        datasets: [{{
          label: "Cumulative sum of trade %",
          data: eq,
          borderColor: "#5ee1a0",
          backgroundColor: "rgba(94,225,160,0.12)",
          fill: true,
          tension: 0.12,
          pointRadius: 0
        }}]
      }},
      options: {{
        responsive: true,
        plugins: {{ legend: {{ display: false }} }},
        scales: {{
          x: {{ ticks: {{ maxTicksLimit: 8 }} }},
          y: {{ title: {{ display: true, text: "Cumulative %" }} }}
        }}
      }}
    }});

    const pnls = P.pnls || [];
    const bins = 40;
    let min = Math.min(...pnls), max = Math.max(...pnls);
    if (!isFinite(min) || !isFinite(max)) {{ min = -5; max = 5; }}
    const step = (max - min) / bins || 1;
    const counts = new Array(bins).fill(0);
    pnls.forEach(p => {{
      let i = Math.floor((p - min) / step);
      if (i >= bins) i = bins - 1;
      if (i < 0) i = 0;
      counts[i]++;
    }});
    const centers = Array.from({{length: bins}}, (_, i) => min + (i + 0.5) * step);
    new Chart(document.getElementById("hist"), {{
      type: "bar",
      data: {{
        labels: centers.map(x => x.toFixed(2)),
        datasets: [{{
          label: "Count",
          data: counts,
          backgroundColor: "rgba(240,180,41,0.55)",
          borderColor: "#f0b429",
          borderWidth: 1
        }}]
      }},
      options: {{
        responsive: true,
        plugins: {{ legend: {{ display: false }} }},
        scales: {{
          x: {{ title: {{ display: true, text: "Trade return bucket (%)" }}, ticks: {{ maxTicksLimit: 8 }} }},
          y: {{ title: {{ display: true, text: "Count" }} }}
        }}
      }}
    }});
  </script>
</body>
</html>
"""
    out = run_dir / "presentation.html"
    out.write_text(doc, encoding="utf-8")
    return out
