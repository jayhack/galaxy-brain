"""Run the gap-fill backtest across a universe.

Outputs to results/runs/<run_name>/:
    config.yaml     the exact config used
    gaps.parquet    every detected gap, with fill measurements + horizons
    trades.parquet  every executed trade
    summary.json    aggregate metrics (trade stats + fill diagnostics)
    equity.parquet  PnL-over-time curve

Then fire up the UI:
    streamlit run app/streamlit_app.py
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from n472jw.backtest import run_single_symbol, trades_to_frame  # noqa: E402
from n472jw.config import load_config, save_config  # noqa: E402
from n472jw.data import fetch_prices, resolve_universe  # noqa: E402
from n472jw.gaps import detect_strict_gaps, measure_fills  # noqa: E402
from n472jw.metrics import (  # noqa: E402
    diagnostic_summary,
    equity_curve,
    max_drawdown,
    sharpe_from_trade_returns,
    summarize_trades,
)
from n472jw.strategies.gap_fill import GapFillStrategy  # noqa: E402


def _parse_overrides(args: argparse.Namespace) -> dict[str, Any]:
    """Turn CLI flags into a nested override dict."""
    o: dict[str, Any] = {}
    if args.universe is not None:
        o["universe"] = args.universe if len(args.universe) > 1 else args.universe[0]
    if args.years is not None:
        o["years"] = args.years
    if args.start is not None:
        o["start_date"] = args.start
    if args.end is not None:
        o["end_date"] = args.end

    gap: dict[str, Any] = {}
    if args.min_gap_pct is not None:
        gap["min_gap_pct"] = args.min_gap_pct
    if args.direction is not None:
        gap["direction"] = args.direction
    if gap:
        o["gap"] = gap

    trade: dict[str, Any] = {}
    if args.time_stop_days is not None:
        trade["time_stop_days"] = args.time_stop_days
    if args.stop_loss_pct is not None:
        trade["stop_loss_pct"] = args.stop_loss_pct
    if args.position_size_usd is not None:
        trade["position_size_usd"] = args.position_size_usd
    if args.no_trade:
        trade["enabled"] = False
    if trade:
        o["trade"] = trade

    out: dict[str, Any] = {}
    if args.run_name is not None:
        out["run_name"] = args.run_name
    if out:
        o["output"] = out
    return o


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--config", type=str, default="config/default.yaml")
    p.add_argument("--universe", nargs="+", default=None)
    p.add_argument("--years", type=int, default=None)
    p.add_argument("--start", type=str, default=None)
    p.add_argument("--end", type=str, default=None)
    p.add_argument("--min-gap-pct", type=float, default=None)
    p.add_argument("--direction", choices=["up", "down", "both"], default=None)
    p.add_argument("--time-stop-days", type=int, default=None)
    p.add_argument("--stop-loss-pct", type=float, default=None)
    p.add_argument("--position-size-usd", type=float, default=None)
    p.add_argument("--no-trade", action="store_true", help="diagnostic only — no simulated trades")
    p.add_argument("--run-name", type=str, default=None)
    p.add_argument("--limit", type=int, default=None, help="cap universe size (for quick runs)")
    p.add_argument("-v", "--verbose", action="store_true")
    args = p.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    log = logging.getLogger("run_gap_fill")

    cfg = load_config(args.config, overrides=_parse_overrides(args))
    run_name = cfg.output.run_name or datetime.now().strftime("%Y%m%d_%H%M%S")
    run_dir = Path(cfg.output.results_dir) / run_name
    run_dir.mkdir(parents=True, exist_ok=True)
    save_config(cfg, run_dir / "config.yaml")

    start, end = cfg.resolved_dates()
    universe = resolve_universe(cfg.universe)
    if args.limit:
        universe = universe[: args.limit]
    log.info("run=%s  universe=%d symbols  %s -> %s", run_name, len(universe), start, end)

    prices = fetch_prices(universe, start=start, end=end)
    log.info("%d symbols have data", len(prices))

    strategy = GapFillStrategy(gap=cfg.gap, trade=cfg.trade)

    all_gaps: list[pd.DataFrame] = []
    all_trades = []
    symbols_processed = 0
    for symbol, df in prices.items():
        if len(df) < 10:
            continue
        gaps = detect_strict_gaps(
            df,
            min_gap_pct=cfg.gap.min_gap_pct,
            direction=cfg.gap.direction,
        )
        if not gaps.empty:
            fills = measure_fills(df, gaps, cfg.gap.fill_horizons)
            merged = gaps.merge(fills, on="date", how="left")
            merged.insert(0, "symbol", symbol)
            all_gaps.append(merged)

        if cfg.trade.enabled:
            intents = strategy.generate_signals(symbol, df)
            trades = run_single_symbol(
                df,
                intents,
                position_size_usd=cfg.trade.position_size_usd,
                commission_bps=cfg.trade.commission_bps,
                slippage_bps=cfg.trade.slippage_bps,
            )
            all_trades.extend(trades)
        symbols_processed += 1

    log.info("processed %d symbols", symbols_processed)

    gaps_df = pd.concat(all_gaps, ignore_index=True) if all_gaps else pd.DataFrame()
    trades_df = trades_to_frame(all_trades)
    eq = equity_curve(trades_df)

    if not gaps_df.empty:
        gaps_df.to_parquet(run_dir / "gaps.parquet")
    if not trades_df.empty:
        trades_df.to_parquet(run_dir / "trades.parquet")
    if not eq.empty:
        eq.to_parquet(run_dir / "equity.parquet")

    summary = {
        "run_name": run_name,
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "n_symbols": symbols_processed,
        "start_date": str(start),
        "end_date": str(end),
        "gap_diagnostic": diagnostic_summary(gaps_df, cfg.gap.fill_horizons),
        "trade_summary": summarize_trades(trades_df),
        "sharpe_annualized": sharpe_from_trade_returns(trades_df),
        "max_drawdown_usd": max_drawdown(eq),
    }
    (run_dir / "summary.json").write_text(json.dumps(summary, indent=2, default=str))

    log.info("wrote results to %s", run_dir)
    print(json.dumps(summary, indent=2, default=str))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
