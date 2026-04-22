from __future__ import annotations

import json
import math
from pathlib import Path

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go

from .gaps import bucket_gap_size


def _read_csv(path: Path, *, date_cols: list[str] | None = None) -> pd.DataFrame:
    if not path.exists():
        return pd.DataFrame()
    return pd.read_csv(path, parse_dates=date_cols or [])


def load_run(run_dir: Path) -> dict[str, object]:
    return {
        "run_name": run_dir.name,
        "config": json.loads((run_dir / "config.json").read_text()),
        "summary": json.loads((run_dir / "summary.json").read_text()),
        "gaps": _read_csv(run_dir / "gaps.csv", date_cols=["date"]),
        "trades": _read_csv(run_dir / "trades.csv", date_cols=["signal_date", "entry_date", "exit_date"]),
        "equity": _read_csv(run_dir / "equity.csv", date_cols=["date"]),
    }


def _plot_div(fig: go.Figure) -> str:
    fig.update_layout(
        margin=dict(l=40, r=24, t=40, b=40),
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        font=dict(family="ui-sans-serif, system-ui, sans-serif", color="#e5edf5"),
    )
    return fig.to_html(full_html=False, include_plotlyjs=False, config={"displayModeBar": False, "responsive": True})


def _format_pct(value: float, digits: int = 1) -> str:
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return "n/a"
    return f"{value:.{digits}f}%"


def _format_usd(value: float) -> str:
    return f"${value:,.0f}"


def _reason_cards(run: dict[str, object]) -> list[dict[str, str]]:
    config = run["config"]
    gaps = run["gaps"]
    trades = run["trades"]

    stop_pct = float(config["trade"]["stop_loss_pct"] * 100)
    median_gap_pct = float(gaps["gap_pct"].median() * 100) if not gaps.empty else math.nan
    reward_risk = median_gap_pct / stop_pct if stop_pct and not math.isnan(median_gap_pct) else math.nan

    filled = gaps[gaps["days_to_fill"].notna()].copy()
    slow_fill_rate = float((filled["days_to_fill"] > config["trade"]["time_stop_days"]).mean() * 100) if not filled.empty else math.nan
    stop_rate = float((trades["exit_reason"] == "stop").mean() * 100) if not trades.empty else math.nan
    worst_trade = float(trades["net_return"].min() * 100) if not trades.empty else math.nan

    return [
        {
            "title": "Small edge, large stop",
            "body": (
                f"The median strict gap is only {_format_pct(median_gap_pct)} while the stop is fixed at "
                f"{_format_pct(stop_pct)}. That is only {reward_risk:.2f}x reward-to-risk before slippage."
                if not math.isnan(reward_risk)
                else "The reward-to-risk profile is weak once the target is capped at the prior day's extreme."
            ),
        },
        {
            "title": "Fills are often too slow",
            "body": (
                f"Among gaps that do fill, {_format_pct(slow_fill_rate)} take longer than the {config['trade']['time_stop_days']}-day time stop. "
                "The folklore can be directionally right and still arrive too late for this trade design."
                if not math.isnan(slow_fill_rate)
                else "The path to the fill matters almost as much as the fill itself."
            ),
        },
        {
            "title": "Tail losses dominate",
            "body": (
                f"Stops account for {_format_pct(stop_rate)} of exits and the worst realized trade loses {_format_pct(abs(worst_trade))}."
                if not math.isnan(stop_rate) and not math.isnan(worst_trade)
                else "A small set of continuation gaps does most of the damage."
            ),
        },
    ]


def build_html(run: dict[str, object]) -> str:
    config = run["config"]
    summary = run["summary"]
    gaps = run["gaps"]
    trades = run["trades"]
    equity = run["equity"]
    horizons = list(config["gap"]["fill_horizons"])

    fill_rates = pd.DataFrame(
        {
            "horizon": [f"{h}d" for h in horizons],
            "fill_rate_pct": [summary["gap_summary"].get(f"fill_rate_{h}d_pct", 0.0) for h in horizons],
        }
    )
    direction_rates = []
    if not gaps.empty:
        for direction in ("up", "down"):
            subset = gaps[gaps["direction"] == direction]
            for horizon in horizons:
                direction_rates.append(
                    {
                        "direction": direction,
                        "horizon": f"{horizon}d",
                        "fill_rate_pct": float(subset[f"fill_by_{horizon}d"].mean() * 100) if not subset.empty else 0.0,
                    }
                )
    direction_rates_df = pd.DataFrame(direction_rates)

    bucket_heatmap = pd.DataFrame()
    if not gaps.empty:
        bucketed = gaps.copy()
        bucketed["bucket"] = bucketed["gap_pct"].apply(bucket_gap_size)
        bucket_heatmap = (
            bucketed.groupby("bucket")[[f"fill_by_{h}d" for h in horizons]]
            .mean()
            .reset_index()
            .melt(id_vars="bucket", var_name="horizon", value_name="fill_rate")
        )
        bucket_heatmap["fill_rate_pct"] = bucket_heatmap["fill_rate"] * 100
        bucket_heatmap["horizon"] = bucket_heatmap["horizon"].str.replace("fill_by_", "").str.replace("d", "d")
        bucket_heatmap["bucket"] = pd.Categorical(
            bucket_heatmap["bucket"],
            categories=["<0.5%", "0.5-1%", "1-2%", "2-5%", ">5%"],
            ordered=True,
        )
        bucket_heatmap = bucket_heatmap.sort_values(["bucket", "horizon"])

    exit_reason_df = pd.DataFrame()
    if not trades.empty:
        exit_reason_df = (
            trades.groupby("exit_reason", as_index=False)["net_pnl_usd"]
            .agg(["count", "mean"])
            .reset_index()
            .rename(columns={"count": "trades", "mean": "avg_pnl_usd"})
        )

    verdict = (
        "The folklore is directionally true, but the naive fade is not a strong trading strategy."
        if summary["gap_summary"].get("fill_rate_60d_pct", 0.0) >= 60 and summary["trade_summary"].get("sharpe", 0.0) < 0.5
        else "This setup behaves more like a real edge than a story, but only under this exact definition."
    )

    hero_kpis = [
        ("60d fill rate", _format_pct(summary["gap_summary"].get("fill_rate_60d_pct", math.nan))),
        ("Eventual fill rate", _format_pct(summary["gap_summary"].get("eventual_fill_rate_pct", math.nan))),
        ("Trade Sharpe", f"{summary['trade_summary'].get('sharpe', 0.0):.2f}"),
        ("Total PnL", _format_usd(summary["trade_summary"].get("total_net_pnl_usd", 0.0))),
    ]

    fill_rates_fig = px.bar(
        fill_rates,
        x="horizon",
        y="fill_rate_pct",
        text_auto=".1f",
        color_discrete_sequence=["#7dd3fc"],
    )
    fill_rates_fig.update_yaxes(title="Percent of gaps filled", range=[0, max(100, fill_rates["fill_rate_pct"].max() + 10 if not fill_rates.empty else 100)])
    fill_rates_fig.update_xaxes(title=None)

    direction_fig = px.line(
        direction_rates_df,
        x="horizon",
        y="fill_rate_pct",
        color="direction",
        markers=True,
        color_discrete_map={"up": "#f59e0b", "down": "#34d399"},
    )
    direction_fig.update_yaxes(title="Percent filled")
    direction_fig.update_xaxes(title=None)

    heatmap_fig = go.Figure()
    if not bucket_heatmap.empty:
        heatmap_source = bucket_heatmap.pivot(index="bucket", columns="horizon", values="fill_rate_pct")
        heatmap_fig = go.Figure(
            data=[
                go.Heatmap(
                    z=heatmap_source.values,
                    x=list(heatmap_source.columns),
                    y=[str(index) for index in heatmap_source.index],
                    colorscale=[
                        [0.0, "#0f172a"],
                        [0.4, "#1d4ed8"],
                        [0.7, "#0ea5e9"],
                        [1.0, "#93c5fd"],
                    ],
                    text=[[f"{value:.1f}%" for value in row] for row in heatmap_source.values],
                    texttemplate="%{text}",
                )
            ]
        )
        heatmap_fig.update_xaxes(title="Fill horizon")
        heatmap_fig.update_yaxes(title="Gap size bucket")

    equity_fig = go.Figure()
    if not equity.empty:
        equity_fig.add_trace(
            go.Scatter(
                x=equity["date"],
                y=equity["cum_pnl_usd"],
                mode="lines",
                line=dict(color="#f97316", width=3),
                fill="tozeroy",
                fillcolor="rgba(249,115,22,0.12)",
            )
        )
        equity_fig.update_yaxes(title="Cumulative PnL (USD)")
        equity_fig.update_xaxes(title=None)

    pnl_fig = go.Figure()
    if not trades.empty:
        pnl_fig.add_trace(
            go.Histogram(
                x=trades["net_return"] * 100,
                marker_color="#a78bfa",
                nbinsx=40,
            )
        )
        pnl_fig.update_xaxes(title="Trade return (%)")
        pnl_fig.update_yaxes(title="Trades")

    exit_fig = go.Figure()
    if not exit_reason_df.empty:
        exit_fig = px.bar(
            exit_reason_df,
            x="exit_reason",
            y="trades",
            color="avg_pnl_usd",
            color_continuous_scale=["#ef4444", "#f59e0b", "#22c55e"],
        )
        exit_fig.update_xaxes(title=None)
        exit_fig.update_yaxes(title="Trades")

    worst_trades = trades.nsmallest(8, "net_return").copy() if not trades.empty else pd.DataFrame()
    if not worst_trades.empty:
        worst_trades["entry_date"] = worst_trades["entry_date"].dt.strftime("%Y-%m-%d")
        worst_trades["exit_date"] = worst_trades["exit_date"].dt.strftime("%Y-%m-%d")
        worst_trades["net_return_pct"] = worst_trades["net_return"] * 100

    reasons_html = "".join(
        f"<div class='reason-card'><h3>{reason['title']}</h3><p>{reason['body']}</p></div>"
        for reason in _reason_cards(run)
    )

    worst_rows = ""
    if not worst_trades.empty:
        for _, trade in worst_trades.iterrows():
            worst_rows += (
                "<tr>"
                f"<td>{trade['symbol']}</td>"
                f"<td>{trade['side']}</td>"
                f"<td>{trade['entry_date']}</td>"
                f"<td>{trade['exit_date']}</td>"
                f"<td>{trade['exit_reason']}</td>"
                f"<td class='num'>{trade['net_return_pct']:.2f}%</td>"
                "</tr>"
            )

    config_json = json.dumps(config, indent=2)

    cards_html = "".join(
        f"<div class='kpi-card'><div class='kpi-label'>{label}</div><div class='kpi-value'>{value}</div></div>"
        for label, value in hero_kpis
    )

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Closing Bell - {run['run_name']}</title>
  <script src="https://cdn.plot.ly/plotly-2.35.2.min.js"></script>
  <style>
    :root {{
      --bg: #06131f;
      --bg2: #0c2030;
      --panel: rgba(10, 28, 42, 0.78);
      --panel-strong: rgba(17, 38, 55, 0.96);
      --ink: #edf5fb;
      --muted: #9fb5c6;
      --accent: #7dd3fc;
      --accent-2: #f97316;
      --border: rgba(125, 211, 252, 0.18);
    }}
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      color: var(--ink);
      background:
        radial-gradient(circle at top left, rgba(249, 115, 22, 0.18), transparent 28%),
        radial-gradient(circle at top right, rgba(125, 211, 252, 0.12), transparent 25%),
        linear-gradient(180deg, var(--bg), var(--bg2));
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }}
    .page {{
      max-width: 1180px;
      margin: 0 auto;
      padding: 40px 24px 72px;
    }}
    .hero {{
      padding: 28px;
      border: 1px solid var(--border);
      border-radius: 28px;
      background: linear-gradient(135deg, rgba(15, 37, 55, 0.96), rgba(7, 22, 34, 0.85));
      box-shadow: 0 18px 60px rgba(0, 0, 0, 0.28);
    }}
    .eyebrow {{
      color: var(--accent);
      text-transform: uppercase;
      letter-spacing: 0.14em;
      font-size: 12px;
      font-weight: 700;
    }}
    h1 {{
      margin: 12px 0 12px;
      font-size: clamp(2.2rem, 6vw, 4.2rem);
      line-height: 0.98;
      letter-spacing: -0.04em;
      max-width: 900px;
    }}
    .dek {{
      max-width: 760px;
      color: var(--muted);
      font-size: 1.05rem;
      line-height: 1.7;
      margin: 0;
    }}
    .grid {{
      display: grid;
      gap: 18px;
    }}
    .hero-grid {{
      margin-top: 28px;
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }}
    .section {{
      margin-top: 28px;
      padding: 24px;
      border-radius: 24px;
      border: 1px solid var(--border);
      background: var(--panel);
      backdrop-filter: blur(6px);
    }}
    .section h2 {{
      margin: 0 0 10px;
      font-size: 1.8rem;
      letter-spacing: -0.03em;
    }}
    .section p {{
      color: var(--muted);
      line-height: 1.75;
      margin: 0 0 16px;
    }}
    .kpi-card {{
      padding: 18px 18px 20px;
      border-radius: 18px;
      border: 1px solid rgba(255, 255, 255, 0.06);
      background: rgba(255, 255, 255, 0.03);
    }}
    .kpi-label {{
      color: var(--muted);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }}
    .kpi-value {{
      margin-top: 10px;
      font-size: 2rem;
      font-weight: 700;
      letter-spacing: -0.04em;
    }}
    .two-up {{
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }}
    .reason-grid {{
      grid-template-columns: repeat(3, minmax(0, 1fr));
      margin-top: 18px;
    }}
    .reason-card {{
      padding: 18px;
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.06);
    }}
    .reason-card h3 {{
      margin: 0 0 10px;
      font-size: 1.05rem;
    }}
    .reason-card p {{
      margin: 0;
      font-size: 0.97rem;
    }}
    .chart {{
      min-height: 340px;
    }}
    .definition {{
      display: grid;
      gap: 18px;
      grid-template-columns: 1.1fr 0.9fr;
    }}
    .definition-box, pre {{
      padding: 18px;
      border-radius: 18px;
      border: 1px solid rgba(255, 255, 255, 0.06);
      background: rgba(3, 10, 18, 0.34);
      overflow-x: auto;
    }}
    table {{
      width: 100%;
      border-collapse: collapse;
      font-size: 0.95rem;
    }}
    th, td {{
      padding: 10px 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      text-align: left;
    }}
    th {{
      color: var(--muted);
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }}
    .num {{
      text-align: right;
      font-variant-numeric: tabular-nums;
    }}
    .foot {{
      margin-top: 24px;
      color: var(--muted);
      font-size: 0.92rem;
    }}
    @media (max-width: 900px) {{
      .hero-grid, .two-up, .reason-grid, .definition {{
        grid-template-columns: 1fr;
      }}
      .page {{
        padding: 20px 14px 48px;
      }}
      .hero, .section {{
        padding: 18px;
        border-radius: 20px;
      }}
    }}
  </style>
</head>
<body>
  <main class="page">
    <section class="hero">
      <div class="eyebrow">Closing Bell / gaps-get-filled / {run['run_name']}</div>
      <h1>{verdict}</h1>
      <p class="dek">
        This submission tests the old trading saying with a strict range-gap definition on U.S. equities,
        then separates the empirical question from the trading question. The short version: prices often do
        revisit yesterday's range, but that does not automatically create a good next-day fade.
      </p>
      <div class="grid hero-grid">{cards_html}</div>
    </section>

    <section class="section">
      <h2>The Definition</h2>
      <div class="definition">
        <div class="definition-box">
          <p>
            A <strong>strict gap up</strong> means today's low is above yesterday's high.
            A <strong>strict gap down</strong> means today's high is below yesterday's low.
            The gap is considered <strong>filled</strong> once a later trading day trades back through the
            prior day's extreme.
          </p>
          <p>
            The trade test is deliberately simple: fade the gap at the next open, target the fill level,
            stop out at a fixed percentage from the gap day's close, and abandon the trade after a fixed number of days.
          </p>
        </div>
        <pre>{config_json}</pre>
      </div>
    </section>

    <section class="section">
      <h2>What The Data Says</h2>
      <p>
        The claim gets stronger as the holding horizon expands. That matters, because folklore usually speaks in eventual terms,
        while a tradable setup has to care about timing.
      </p>
      <div class="grid two-up">
        <div class="chart">{_plot_div(fill_rates_fig)}</div>
        <div class="chart">{_plot_div(direction_fig)}</div>
      </div>
      <div class="chart">{_plot_div(heatmap_fig)}</div>
    </section>

    <section class="section">
      <h2>The Trade Test</h2>
      <p>
        This is the more useful question for a trader: if you actually fade the gap instead of just counting later fills,
        do the profits justify the path risk, capital lock-up, and tail events?
      </p>
      <div class="grid two-up">
        <div class="chart">{_plot_div(equity_fig)}</div>
        <div class="chart">{_plot_div(pnl_fig)}</div>
      </div>
      <div class="chart">{_plot_div(exit_fig)}</div>
    </section>

    <section class="section">
      <h2>Why The Story Breaks</h2>
      <p>
        A high eventual fill rate is not the same thing as a high-quality trade. These three frictions explain most of the gap between those claims.
      </p>
      <div class="grid reason-grid">{reasons_html}</div>
    </section>

    <section class="section">
      <h2>Worst Trades</h2>
      <p>
        The losers below are the trades that keep a superficially high win-rate story from turning into a durable edge.
      </p>
      <table>
        <thead>
          <tr>
            <th>Symbol</th>
            <th>Side</th>
            <th>Entry</th>
            <th>Exit</th>
            <th>Reason</th>
            <th class="num">Return</th>
          </tr>
        </thead>
        <tbody>{worst_rows}</tbody>
      </table>
      <div class="foot">
        Generated from committed run data. Open this file directly in a browser; no server is required.
      </div>
    </section>
  </main>
</body>
</html>"""

