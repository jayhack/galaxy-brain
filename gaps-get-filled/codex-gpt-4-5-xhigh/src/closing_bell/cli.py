from __future__ import annotations

import argparse
import json
import logging
import sys
import webbrowser
from dataclasses import asdict
from datetime import date, datetime, timedelta
from pathlib import Path

import pandas as pd

from .backtest import run_single_symbol, trades_to_frame
from .data import fetch_prices
from .gaps import detect_strict_gaps, measure_fills
from .metrics import equity_curve, fill_summary, max_drawdown_usd, summarize_trades, trade_sharpe
from .presentation import build_html, load_run
from .strategy import GapFadeStrategy
from .universe import resolve_universe


DEFAULT_HORIZONS = [1, 5, 20, 60]


def _add_universe_args(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--universe", default="sp500", help="named universe, e.g. sp500")
    parser.add_argument("--tickers", nargs="*", default=None, help="explicit ticker list overrides --universe")
    parser.add_argument("--years", type=int, default=10, help="lookback window when --start/--end are omitted")
    parser.add_argument("--start", type=str, default=None, help="YYYY-MM-DD")
    parser.add_argument("--end", type=str, default=None, help="YYYY-MM-DD")


def _resolve_dates(args: argparse.Namespace) -> tuple[date, date]:
    end = date.fromisoformat(args.end) if args.end else date.today()
    if args.start:
        start = date.fromisoformat(args.start)
    else:
        try:
            start = end.replace(year=end.year - args.years)
        except ValueError:
            # Handles Feb 29 gracefully when the target year is not a leap year.
            start = end.replace(year=end.year - args.years, day=28)
    return start, end


def _run_config(args: argparse.Namespace, start: date, end: date, symbols: list[str]) -> dict[str, object]:
    return {
        "universe": args.universe if not args.tickers else "custom",
        "tickers": symbols if args.tickers else None,
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "gap": {
            "direction": args.direction,
            "min_gap_pct": args.min_gap_pct,
            "fill_horizons": list(DEFAULT_HORIZONS),
        },
        "trade": {
            "position_size_usd": args.position_size_usd,
            "stop_loss_pct": args.stop_loss_pct,
            "time_stop_days": args.time_stop_days,
            "commission_bps": args.commission_bps,
            "slippage_bps": args.slippage_bps,
        },
    }


def cmd_fetch(args: argparse.Namespace) -> int:
    start, end = _resolve_dates(args)
    symbols = resolve_universe(args.universe, args.tickers)
    frames = fetch_prices(
        symbols,
        start,
        end,
        batch_size=args.batch_size,
        force_refresh=args.force_refresh,
    )
    print(
        json.dumps(
            {
                "cached_symbols": len(frames),
                "requested_symbols": len(symbols),
                "start_date": start.isoformat(),
                "end_date": end.isoformat(),
            },
            indent=2,
        )
    )
    return 0


def cmd_run(args: argparse.Namespace) -> int:
    start, end = _resolve_dates(args)
    symbols = resolve_universe(args.universe, args.tickers)
    run_name = args.run_name or datetime.now().strftime("%Y%m%d-%H%M%S")
    run_dir = Path(args.results_dir) / run_name
    run_dir.mkdir(parents=True, exist_ok=True)

    config = _run_config(args, start, end, symbols)
    (run_dir / "config.json").write_text(json.dumps(config, indent=2))

    prices = fetch_prices(
        symbols,
        start,
        end,
        batch_size=args.batch_size,
        force_refresh=args.force_refresh,
    )

    strategy = GapFadeStrategy(
        min_gap_pct=args.min_gap_pct,
        direction=args.direction,
        stop_loss_pct=args.stop_loss_pct,
        time_stop_days=args.time_stop_days,
    )

    gap_frames: list[pd.DataFrame] = []
    trade_results = []
    for symbol, df in prices.items():
        if len(df) < 3:
            continue
        gaps = detect_strict_gaps(df, min_gap_pct=args.min_gap_pct, direction=args.direction)
        if not gaps.empty:
            fills = measure_fills(df, gaps, DEFAULT_HORIZONS)
            merged = gaps.merge(fills, on="date", how="left")
            merged.insert(0, "symbol", symbol)
            gap_frames.append(merged)
        intents = strategy.generate_signals(symbol, df)
        trade_results.extend(
            run_single_symbol(
                df,
                intents,
                position_size_usd=args.position_size_usd,
                commission_bps=args.commission_bps,
                slippage_bps=args.slippage_bps,
            )
        )

    gaps_df = pd.concat(gap_frames, ignore_index=True) if gap_frames else pd.DataFrame()
    trades_df = trades_to_frame(trade_results)
    equity_df = equity_curve(trades_df)

    if not gaps_df.empty:
        gaps_df.to_csv(run_dir / "gaps.csv", index=False)
    if not trades_df.empty:
        trades_df.to_csv(run_dir / "trades.csv", index=False)
    if not equity_df.empty:
        equity_df.to_csv(run_dir / "equity.csv", index=False)

    summary = {
        "run_name": run_name,
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "symbols_requested": len(symbols),
        "symbols_with_data": len(prices),
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "gap_summary": fill_summary(gaps_df, DEFAULT_HORIZONS),
        "trade_summary": {
            **summarize_trades(trades_df),
            "sharpe": trade_sharpe(trades_df),
            "max_drawdown_usd": max_drawdown_usd(equity_df),
        },
    }
    (run_dir / "summary.json").write_text(json.dumps(summary, indent=2))
    print(json.dumps(summary, indent=2))
    return 0


def cmd_present(args: argparse.Namespace) -> int:
    run_dir = Path(args.results_dir) / args.run
    if not run_dir.exists():
        raise SystemExit(f"run not found: {run_dir}")
    run = load_run(run_dir)
    html = build_html(run)
    output_path = Path(args.output) if args.output else run_dir / "report.html"
    output_path.write_text(html)
    print(output_path)
    if args.open:
        webbrowser.open(output_path.resolve().as_uri())
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="closing-bell")
    parser.add_argument("-v", "--verbose", action="store_true")
    subparsers = parser.add_subparsers(dest="command", required=True)

    fetch_parser = subparsers.add_parser("fetch", help="download and cache daily OHLC data")
    _add_universe_args(fetch_parser)
    fetch_parser.add_argument("--batch-size", type=int, default=40)
    fetch_parser.add_argument("--force-refresh", action="store_true")
    fetch_parser.set_defaults(func=cmd_fetch)

    run_parser = subparsers.add_parser("run", help="execute the gap-fill diagnostic and naive fade strategy")
    _add_universe_args(run_parser)
    run_parser.add_argument("--min-gap-pct", type=float, default=0.01)
    run_parser.add_argument("--direction", choices=["up", "down", "both"], default="both")
    run_parser.add_argument("--stop-loss-pct", type=float, default=0.03)
    run_parser.add_argument("--time-stop-days", type=int, default=20)
    run_parser.add_argument("--position-size-usd", type=float, default=10_000.0)
    run_parser.add_argument("--commission-bps", type=float, default=1.0)
    run_parser.add_argument("--slippage-bps", type=float, default=2.0)
    run_parser.add_argument("--batch-size", type=int, default=40)
    run_parser.add_argument("--force-refresh", action="store_true")
    run_parser.add_argument("--run-name", default=None)
    run_parser.add_argument("--results-dir", default="results/runs")
    run_parser.set_defaults(func=cmd_run)

    present_parser = subparsers.add_parser("present", help="build a self-contained HTML presentation from a run")
    present_parser.add_argument("--run", required=True, help="run directory name under results/runs")
    present_parser.add_argument("--results-dir", default="results/runs")
    present_parser.add_argument("--output", default=None)
    present_parser.add_argument("--open", action="store_true")
    present_parser.set_defaults(func=cmd_present)
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    return int(args.func(args))


if __name__ == "__main__":
    sys.exit(main())
