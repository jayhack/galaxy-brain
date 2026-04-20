from __future__ import annotations

import html
import json
from pathlib import Path
from typing import Any, Dict, Optional

import pandas as pd
import plotly.express as px
import plotly.io as pio

from gpt_5_4_backtesting.engine import sequential_equity_curve
from gpt_5_4_backtesting.models import BacktestResult, GridSearchResult


def write_backtest_report(
    result: BacktestResult,
    output_dir: Path,
    start: str,
    end: str,
    fill_study: Dict[str, Any],
    html_mirror_path: Optional[Path] = None,
) -> Dict[str, Path]:
    output_dir.mkdir(parents=True, exist_ok=True)

    summary_path = output_dir / "summary.json"
    trades_path = output_dir / "trades.csv"
    by_symbol_path = output_dir / "by_symbol.csv"
    html_path = output_dir / "report.html"

    summary_payload = result.summary_for_json()
    summary_payload["fill_study"] = fill_study

    summary_path.write_text(
        json.dumps(summary_payload, indent=2, sort_keys=True, default=str),
        encoding="utf-8",
    )
    if result.trades.empty:
        trades_path.write_text("", encoding="utf-8")
    else:
        result.trades.to_csv(trades_path, index=False)

    by_symbol = summarize_trades_by_symbol(result.trades)
    if by_symbol.empty:
        by_symbol_path.write_text("", encoding="utf-8")
    else:
        by_symbol.to_csv(by_symbol_path, index=False)

    html_content = build_backtest_report_html(
        result=result,
        by_symbol=by_symbol,
        fill_study=fill_study,
        start=start,
        end=end,
    )
    html_path.write_text(html_content, encoding="utf-8")

    if html_mirror_path is not None:
        html_mirror_path.parent.mkdir(parents=True, exist_ok=True)
        html_mirror_path.write_text(html_content, encoding="utf-8")

    paths = {
        "summary": summary_path,
        "trades": trades_path,
        "by_symbol": by_symbol_path,
        "html": html_path,
    }
    if html_mirror_path is not None:
        paths["html_mirror"] = html_mirror_path
    return paths


def write_grid_search_report(
    result: GridSearchResult,
    output_dir: Path,
    start: str,
    end: str,
    top_n: int = 50,
) -> Dict[str, Path]:
    output_dir.mkdir(parents=True, exist_ok=True)

    summary_path = output_dir / "summary.json"
    results_path = output_dir / "results.csv"
    html_path = output_dir / "report.html"

    summary_payload = result.summary_for_json()
    summary_path.write_text(
        json.dumps(summary_payload, indent=2, sort_keys=True, default=str),
        encoding="utf-8",
    )
    if result.results.empty:
        results_path.write_text("", encoding="utf-8")
    else:
        result.results.to_csv(results_path, index=False)

    html_content = build_grid_search_report_html(result=result, start=start, end=end, top_n=top_n)
    html_path.write_text(html_content, encoding="utf-8")

    return {
        "summary": summary_path,
        "results": results_path,
        "html": html_path,
    }


def summarize_trades_by_symbol(trades: pd.DataFrame) -> pd.DataFrame:
    if trades.empty:
        return pd.DataFrame(
            columns=[
                "symbol",
                "trade_count",
                "fill_rate_pct",
                "win_rate_pct",
                "avg_return_pct",
                "median_return_pct",
                "trade_sharpe",
                "avg_gap_pct",
                "avg_holding_bars",
            ]
        )

    grouped = trades.groupby("symbol", as_index=False).agg(
        trade_count=("symbol", "size"),
        fill_rate_pct=("gap_filled_within_horizon", lambda values: float(values.mean() * 100.0)),
        win_rate_pct=("return_pct", lambda values: float((values > 0).mean() * 100.0)),
        avg_return_pct=("return_pct", "mean"),
        median_return_pct=("return_pct", "median"),
        trade_sharpe=("return_pct", _trade_sharpe_value),
        avg_gap_pct=("gap_pct", "mean"),
        avg_holding_bars=("holding_bars", "mean"),
    )
    numeric_columns = [
        "fill_rate_pct",
        "win_rate_pct",
        "avg_return_pct",
        "median_return_pct",
        "trade_sharpe",
        "avg_gap_pct",
        "avg_holding_bars",
    ]
    grouped[numeric_columns] = grouped[numeric_columns].round(3)
    grouped.sort_values(by=["avg_return_pct", "fill_rate_pct"], ascending=[False, False], inplace=True)
    return grouped


def build_backtest_report_html(
    result: BacktestResult,
    by_symbol: pd.DataFrame,
    fill_study: Dict[str, Any],
    start: str,
    end: str,
) -> str:
    figures = []
    include_plotlyjs = "cdn"

    fill_rates_frame = pd.DataFrame(
        {
            "horizon": list(fill_study["fill_rates_pct"].keys()),
            "fill_rate_pct": list(fill_study["fill_rates_pct"].values()),
        }
    )
    if not fill_rates_frame.empty:
        fill_chart = px.bar(
            fill_rates_frame,
            x="horizon",
            y="fill_rate_pct",
            title="Empirical Fill Rates by Horizon",
            labels={"horizon": "Horizon", "fill_rate_pct": "Fill Rate (%)"},
            text_auto=".1f",
        )
        fill_chart.update_traces(texttemplate="%{y:.1f}%")
        figures.append(pio.to_html(fill_chart, include_plotlyjs=include_plotlyjs, full_html=False))
        include_plotlyjs = False

    if not result.trades.empty:
        histogram = px.histogram(
            result.trades,
            x="return_pct",
            nbins=40,
            color="gap_direction",
            title="Trade Return Distribution",
            labels={"return_pct": "Return (%)", "count": "Trades"},
        )
        histogram.update_layout(bargap=0.05)
        figures.append(pio.to_html(histogram, include_plotlyjs=include_plotlyjs, full_html=False))

        equity_curve = sequential_equity_curve(result.trades)
        if not equity_curve.empty:
            equity_chart = px.line(
                equity_curve,
                x="trade_number",
                y="equity",
                title="Sequential Trade Equity Curve (Fixed-Notional, Illustrative)",
                labels={"trade_number": "Trade Number", "equity": "Equity (start = 1.0)"},
            )
            figures.append(pio.to_html(equity_chart, include_plotlyjs=False, full_html=False))

        scatter = px.scatter(
            result.trades,
            x="gap_pct",
            y="return_pct",
            color="exit_reason",
            hover_data=["symbol", "signal_date", "gap_direction", "holding_bars"],
            title="Gap Size vs Trade Return",
            labels={"gap_pct": "Gap Size (%)", "return_pct": "Return (%)"},
        )
        figures.append(pio.to_html(scatter, include_plotlyjs=False, full_html=False))

    if not by_symbol.empty:
        by_symbol_chart = px.bar(
            by_symbol,
            x="symbol",
            y="avg_return_pct",
            hover_data=["trade_count", "fill_rate_pct", "win_rate_pct", "trade_sharpe"],
            title="Average Return by Symbol",
            labels={"avg_return_pct": "Average Return (%)"},
        )
        figures.append(pio.to_html(by_symbol_chart, include_plotlyjs=False, full_html=False))

    summary_cards = _cards_from_mapping(
        {
            "Position": "Empirically yes, tradeably no",
            "Universe": f"{len(result.symbols)} symbols",
            "Date range": f"{start} to {end}",
            "Gap events in study": fill_study["event_count"],
            "Trades": result.summary["trade_count"],
            "60d fill rate": _format_percent(fill_study["fill_rates_pct"].get("60d", 0.0)),
            "Average return": _format_percent(result.summary["avg_return_pct"], digits=3),
            "Trade Sharpe": _format_ratio(result.summary["trade_sharpe"]),
            "Return stdev": _format_percent(result.summary["trade_return_std_pct"], digits=3),
        }
    )

    by_symbol_table = _dataframe_table(by_symbol, max_rows=40)
    trade_log = _dataframe_table(result.trades.tail(100), max_rows=100)

    narrative_html = _callout(
        "Position",
        "The folklore is directionally real, but this naive implementation is not a good strategy.",
        (
            f"Across the selected universe, strict gaps often trade back through the prior range over longer horizons. "
            f"But the actual fade trade still loses money and posts a weak {_format_ratio(result.summary['trade_sharpe'])} trade Sharpe."
        ),
        [
            f"The 60-day fill rate is {_format_percent(fill_study['fill_rates_pct'].get('60d', 0.0))}.",
            f"The baseline trade returns average {_format_percent(result.summary['avg_return_pct'], digits=3)} with {_format_percent(result.summary['trade_return_std_pct'], digits=3)} volatility per event.",
            f"Winners average {_format_percent(result.summary['avg_win_pct'], digits=3)} while losers average {_format_percent(result.summary['avg_loss_pct'], digits=3)}.",
        ],
    )

    sections_html = "".join(
        [
            _collapsible_section(
                "1. Hypothesis and setup",
                _stack_blocks(
                    [
                        _text_block(
                            "What exactly is being claimed?",
                            [
                                "A strict gap up means today's low is above yesterday's high. A strict gap down means today's high is below yesterday's low.",
                                "The empirical claim is that price later trades back through the prior bar extreme. The trading claim is stronger: you can monetize that tendency with a fade entry, a stop, and a time stop.",
                            ],
                        ),
                        _mapping_table(
                            {
                                "Universe size": len(result.symbols),
                                "Date range": f"{start} to {end}",
                                "Gap definition": "strict candle-range gap",
                                "Minimum gap threshold": result.parameters["min_gap_pct"],
                                "Time stop": result.parameters["max_hold_days"],
                                "Stop multiple": result.parameters["stop_gap_multiple"],
                            }
                        ),
                    ]
                ),
                open=True,
            ),
            _collapsible_section(
                "2. Empirical evidence: do gaps get filled?",
                _stack_blocks(
                    [
                        _text_block(
                            "Short answer",
                            [
                                f"Yes, often enough to be interesting. The fill-rate study found {fill_study['event_count']} qualifying gaps and shows the probability rising as you allow more time.",
                                "That means the folklore can be empirically true even before we ask whether a trader can capture it cleanly.",
                            ],
                        ),
                        _mapping_table(fill_study["fill_rates_pct"]),
                    ]
                ),
                open=True,
            ),
            _collapsible_section(
                "3. Trade result: why the strategy still fails",
                _stack_blocks(
                    [
                        _text_block(
                            "The gap between truth and tradability",
                            [
                                f"The baseline fade strategy averages {_format_percent(result.summary['avg_return_pct'], digits=3)} per trade at {_format_ratio(result.summary['trade_sharpe'])} trade Sharpe.",
                                "The issue is not that fills never happen. The issue is that the path to the fill is noisy, slow, and expensive enough that a simple fade entry cannot turn the tendency into attractive risk-adjusted returns.",
                            ],
                        ),
                        _bullet_block(
                            "What drags Sharpe down",
                            [
                                f"Per-trade volatility is {_format_percent(result.summary['trade_return_std_pct'], digits=3)}, much larger than the mean return.",
                                f"Losers average {_format_percent(result.summary['avg_loss_pct'], digits=3)} while winners average only {_format_percent(result.summary['avg_win_pct'], digits=3)}.",
                                f"{result.summary['timeout_count']} trades hit the time stop before the fill target.",
                            ],
                        ),
                    ]
                ),
                open=True,
            ),
            _collapsible_section("4. Charts", _stack_blocks(figures if figures else ["<p>No qualifying trades were found.</p>"]), open=True),
            _collapsible_section(
                "5. Cross-sectional breakdown",
                _stack_blocks(
                    [
                        _text_block(
                            "What the symbol breakdown suggests",
                            [
                                "If the edge were clean, you would expect at least a few symbols to stand out with meaningfully positive risk-adjusted returns. Instead, the weakness is fairly broad across the basket.",
                            ],
                        ),
                        by_symbol_table,
                    ]
                ),
                open=False,
            ),
            _collapsible_section("6. Recent trade log", trade_log, open=False),
            _collapsible_section(
                "7. What to test next",
                _list_block(
                    [
                        "Separate gap-up and gap-down variants rather than pooling them.",
                        "Filter by market regime or trend state before fading.",
                        "Exclude earnings gaps and other event-driven discontinuities.",
                        "Use the grid search report to see whether alternative stop and hold settings improve the mean without destroying Sharpe.",
                    ]
                ),
                open=False,
            ),
        ]
    )

    return _page_template(
        title="Gap Fill Presentation",
        subtitle="A self-contained presentation arguing that the gap-fill folklore is empirically supported but not easily tradeable with a naive fade strategy.",
        narrative_html=narrative_html,
        summary_cards=summary_cards,
        sections_html=sections_html,
    )


def build_grid_search_report_html(
    result: GridSearchResult,
    start: str,
    end: str,
    top_n: int = 50,
) -> str:
    top_results = result.results.head(top_n)
    include_plotlyjs = "cdn"
    figures = []

    best_result = None
    best_sharpe_result = None
    if not result.results.empty:
        best_result = result.results.iloc[0].to_dict()
        sharpe_ranked = result.results.dropna(subset=["trade_sharpe"]).sort_values(by="trade_sharpe", ascending=False)
        if not sharpe_ranked.empty:
            best_sharpe_result = sharpe_ranked.iloc[0].to_dict()

        scatter = px.scatter(
            result.results,
            x="fill_rate_pct",
            y="avg_return_pct",
            size="trade_count",
            color="max_hold_days",
            hover_name="parameter_label",
            hover_data=["trade_sharpe", "stop_gap_multiple", "trade_return_std_pct"],
            title="Fill Rate vs Average Return",
            labels={"fill_rate_pct": "Fill Rate (%)", "avg_return_pct": "Average Return (%)"},
        )
        figures.append(pio.to_html(scatter, include_plotlyjs=include_plotlyjs, full_html=False))
        include_plotlyjs = False

        sharpe_chart = px.scatter(
            result.results,
            x="fill_rate_pct",
            y="trade_sharpe",
            size="trade_count",
            color="max_hold_days",
            hover_name="parameter_label",
            hover_data=["avg_return_pct", "trade_return_std_pct", "stop_gap_multiple"],
            title="Fill Rate vs Trade Sharpe",
            labels={"fill_rate_pct": "Fill Rate (%)", "trade_sharpe": "Trade Sharpe"},
        )
        figures.append(pio.to_html(sharpe_chart, include_plotlyjs=False, full_html=False))

        ranking = px.bar(
            top_results.sort_values(by="rank", ascending=False),
            x="rank",
            y=result.sort_by,
            hover_name="parameter_label",
            hover_data=["trade_count", "trade_sharpe", "fill_rate_pct"],
            color="meets_min_trades",
            title=f"Top {min(top_n, len(result.results))} Configurations by {result.sort_by}",
            labels={result.sort_by: result.sort_by.replace("_", " ")},
        )
        figures.append(pio.to_html(ranking, include_plotlyjs=False, full_html=False))

    summary_cards = _cards_from_mapping(
        {
            "Sweep scope": len(result.results),
            "Date range": f"{start} to {end}",
            "Sort metric": result.sort_by,
            "Best avg return": _format_percent(best_result["avg_return_pct"], digits=3) if best_result else "n/a",
            "Best trade Sharpe": _format_ratio(best_result["trade_sharpe"]) if best_result else "n/a",
            "Best Sharpe in sweep": _format_ratio(best_sharpe_result["trade_sharpe"]) if best_sharpe_result else "n/a",
            "Minimum trade filter": result.min_trades,
        }
    )

    narrative_html = _callout(
        "Grid search",
        "Parameter tuning reduces the damage, but it does not rescue Sharpe.",
        (
            "The search finds configurations that lose less money than the baseline. "
            "But even the best parameter sets in this sweep still have weak or negative trade Sharpe."
        ),
        [
            f"Best average return in this sweep: {_format_percent(best_result['avg_return_pct'], digits=3) if best_result else 'n/a'}.",
            f"Best trade Sharpe in this sweep: {_format_ratio(best_sharpe_result['trade_sharpe']) if best_sharpe_result else 'n/a'}.",
            "That means tuning helps the mean more than it helps the consistency of returns.",
        ],
    )

    sections_html = "".join(
        [
            _collapsible_section("1. Search space", _mapping_table(result.search_space), open=False),
            _collapsible_section(
                "2. What improved",
                _stack_blocks(
                    [
                        _text_block(
                            "Good news",
                            [
                                "The strategy is sensitive to its parameters, which means the research loop is productive.",
                                "Stops and holding windows can reduce losses, so the baseline is not the end of the story.",
                            ],
                        ),
                        _mapping_table(best_result) if best_result is not None else "<p>No results.</p>",
                    ]
                ),
                open=True,
            ),
            _collapsible_section(
                "3. Why Sharpe still struggles",
                _stack_blocks(
                    [
                        _text_block(
                            "The core limitation",
                            [
                                "Even when the mean improves, the volatility of trade outcomes remains high.",
                                "That is why a strategy can become less bad while still failing to turn into a compelling tradable edge.",
                            ],
                        ),
                        _bullet_block(
                            "What the sweep implies",
                            [
                                "The next filters should target tail-risk reduction, not just a higher fill count.",
                                "Separating gap-up and gap-down regimes is a likely next lever.",
                                "A portfolio-level equity curve and daily Sharpe should be the next realism upgrade.",
                            ],
                        ),
                    ]
                ),
                open=True,
            ),
            _collapsible_section("4. Optimization charts", _stack_blocks(figures if figures else ["<p>No grid-search results were generated.</p>"]), open=True),
            _collapsible_section("5. Leaderboard", _dataframe_table(top_results, max_rows=top_n), open=False),
        ]
    )

    return _page_template(
        title="Gap Fill Grid Search",
        subtitle="A companion presentation showing what parameter tuning improves and what it does not.",
        narrative_html=narrative_html,
        summary_cards=summary_cards,
        sections_html=sections_html,
    )


def _page_template(
    title: str,
    subtitle: str,
    narrative_html: str,
    summary_cards: str,
    sections_html: str,
) -> str:
    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{html.escape(title)}</title>
  <style>
    body {{
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      margin: 0;
      background: linear-gradient(180deg, #0b1020 0%, #0f172a 100%);
      color: #e5e7eb;
    }}
    main {{
      max-width: 1400px;
      margin: 0 auto;
      padding: 32px 24px 56px;
    }}
    h1, h2, h3 {{
      margin: 0 0 12px;
    }}
    p, li {{
      color: #cbd5e1;
      line-height: 1.6;
    }}
    .hero {{
      display: grid;
      gap: 16px;
      margin-bottom: 24px;
    }}
    .subtitle {{
      font-size: 18px;
      max-width: 980px;
    }}
    .callout {{
      background: linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.95));
      border: 1px solid #334155;
      border-radius: 16px;
      padding: 18px 20px;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25);
    }}
    .callout-eyebrow {{
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #93c5fd;
      margin-bottom: 8px;
    }}
    .callout h2 {{
      margin-bottom: 8px;
      font-size: 24px;
    }}
    .callout ul {{
      margin: 12px 0 0;
      padding-left: 20px;
    }}
    .grid {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
      gap: 12px;
      margin: 20px 0 28px;
    }}
    .card, .content-card, details.section-panel {{
      background: #111827;
      border: 1px solid #1f2937;
      border-radius: 12px;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.25);
    }}
    .card {{
      padding: 16px;
    }}
    .card-label {{
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #93c5fd;
      margin-bottom: 8px;
    }}
    .card-value {{
      font-size: 18px;
      font-weight: 700;
      color: #f8fafc;
      line-height: 1.25;
    }}
    .deck {{
      display: grid;
      gap: 16px;
    }}
    details.section-panel {{
      overflow: hidden;
    }}
    details.section-panel summary {{
      list-style: none;
      cursor: pointer;
      padding: 16px 18px;
      font-size: 20px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      color: #f8fafc;
      background: linear-gradient(180deg, rgba(17, 24, 39, 0.96), rgba(10, 15, 30, 0.96));
    }}
    details.section-panel summary::-webkit-details-marker {{
      display: none;
    }}
    details.section-panel summary::after {{
      content: "+";
      font-size: 26px;
      line-height: 1;
      color: #93c5fd;
    }}
    details.section-panel[open] summary::after {{
      content: "−";
    }}
    .section-body {{
      padding: 0 18px 18px;
      border-top: 1px solid #1f2937;
    }}
    .block-stack {{
      display: grid;
      gap: 16px;
      margin-top: 16px;
    }}
    .content-card {{
      padding: 16px;
    }}
    .content-card h3 {{
      color: #f8fafc;
      margin-bottom: 10px;
    }}
    .bullet-list {{
      margin: 0;
      padding-left: 20px;
    }}
    .results-table {{
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
      min-width: 640px;
    }}
    .results-table th,
    .results-table td {{
      border-bottom: 1px solid #1f2937;
      padding: 8px 10px;
      text-align: left;
      vertical-align: top;
    }}
    .results-table th {{
      background: #0f172a;
      white-space: nowrap;
    }}
    .table-wrap {{
      overflow-x: auto;
      border: 1px solid #1f2937;
      border-radius: 10px;
    }}
    @media (max-width: 720px) {{
      main {{
        padding: 24px 16px 40px;
      }}
      .card-value {{
        font-size: 16px;
      }}
      details.section-panel summary {{
        font-size: 18px;
      }}
      .results-table {{
        min-width: 520px;
      }}
    }}
  </style>
</head>
<body>
  <main>
    <div class="hero">
      <h1>{html.escape(title)}</h1>
      <p class="subtitle">{html.escape(subtitle)}</p>
      {narrative_html}
    </div>
    <div class="grid">{summary_cards}</div>
    <div class="deck">{sections_html}</div>
  </main>
</body>
</html>
"""


def _cards_from_mapping(values: Dict[str, Any]) -> str:
    return "".join(
        "<div class=\"card\">"
        f"<div class=\"card-label\">{html.escape(str(key))}</div>"
        f"<div class=\"card-value\">{html.escape(str(value))}</div>"
        "</div>"
        for key, value in values.items()
    )


def _collapsible_section(title: str, body: str, open: bool = False) -> str:
    open_attr = " open" if open else ""
    return (
        f"<details class=\"section-panel\"{open_attr}>"
        f"<summary>{html.escape(title)}</summary>"
        f"<div class=\"section-body\">{body}</div>"
        "</details>"
    )


def _text_block(title: str, paragraphs: list[str]) -> str:
    rendered = "".join(f"<p>{html.escape(paragraph)}</p>" for paragraph in paragraphs)
    return f"<div class=\"content-card\"><h3>{html.escape(title)}</h3>{rendered}</div>"


def _bullet_block(title: str, items: list[str]) -> str:
    rendered = "".join(f"<li>{html.escape(item)}</li>" for item in items)
    return f"<div class=\"content-card\"><h3>{html.escape(title)}</h3><ul class=\"bullet-list\">{rendered}</ul></div>"


def _list_block(items: list[str]) -> str:
    rendered = "".join(f"<li>{html.escape(item)}</li>" for item in items)
    return f"<div class=\"content-card\"><ul class=\"bullet-list\">{rendered}</ul></div>"


def _stack_blocks(blocks: list[str]) -> str:
    filtered = [block for block in blocks if block]
    return f"<div class=\"block-stack\">{''.join(filtered)}</div>"


def _mapping_table(values: Dict[str, Any]) -> str:
    rows = []
    for key, value in values.items():
        rendered_value = json.dumps(value) if isinstance(value, (dict, list)) else str(value)
        rows.append(
            "<tr>"
            f"<th>{html.escape(str(key))}</th>"
            f"<td>{html.escape(rendered_value)}</td>"
            "</tr>"
        )
    return (
        "<div class=\"table-wrap\">"
        "<table class=\"results-table\">"
        "<thead><tr><th>Field</th><th>Value</th></tr></thead>"
        f"<tbody>{''.join(rows)}</tbody></table>"
        "</div>"
    )


def _dataframe_table(frame: pd.DataFrame, max_rows: int) -> str:
    if frame.empty:
        return "<p>No rows to display.</p>"
    limited = frame.head(max_rows).copy()
    table_html = limited.to_html(
        index=False,
        classes="results-table",
        border=0,
        justify="left",
        na_rep="n/a",
        float_format=lambda value: f"{value:.3f}",
    )
    return f"<div class=\"table-wrap\">{table_html}</div>"


def _callout(eyebrow: str, title: str, body: str, bullets: list[str]) -> str:
    bullets_html = ""
    if bullets:
        bullets_html = "<ul>" + "".join(f"<li>{html.escape(item)}</li>" for item in bullets) + "</ul>"
    return (
        "<div class=\"callout\">"
        f"<div class=\"callout-eyebrow\">{html.escape(eyebrow)}</div>"
        f"<h2>{html.escape(title)}</h2>"
        f"<p>{html.escape(body)}</p>"
        f"{bullets_html}"
        "</div>"
    )


def _format_percent(value: Any, digits: int = 2) -> str:
    if value is None:
        return "n/a"
    return f"{float(value):.{digits}f}%"


def _format_ratio(value: Any, digits: int = 3) -> str:
    if value is None:
        return "n/a"
    return f"{float(value):.{digits}f}"


def _trade_sharpe_value(series: pd.Series):
    filtered = pd.to_numeric(series, errors="coerce").dropna()
    if len(filtered) < 2:
        return None
    std = float(filtered.std(ddof=1))
    if std == 0:
        return None
    return float(filtered.mean()) / std
