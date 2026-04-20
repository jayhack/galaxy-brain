from __future__ import annotations

from typing import Dict, Iterable, List

import pandas as pd

from gpt_5_4_backtesting.data import load_ohlcv
from gpt_5_4_backtesting.models import BacktestResult
from gpt_5_4_backtesting.strategies.base import Strategy
from gpt_5_4_backtesting.strategies.gap_fill import study_gap_fills


def run_backtest(
    symbols: List[str],
    strategy: Strategy,
    start: str,
    end: str,
    use_cache: bool = True,
) -> BacktestResult:
    trades_by_symbol = []
    rows_by_symbol: Dict[str, int] = {}
    skipped_symbols: Dict[str, str] = {}

    for symbol in symbols:
        try:
            prices = load_ohlcv(symbol=symbol, start=start, end=end, use_cache=use_cache)
        except Exception as exc:
            skipped_symbols[symbol] = str(exc)
            continue

        rows_by_symbol[symbol] = len(prices)
        if len(prices) < 2:
            skipped_symbols[symbol] = "Not enough rows for a gap calculation"
            continue

        symbol_trades = strategy.run(symbol=symbol, prices=prices)
        if not symbol_trades.empty:
            trades_by_symbol.append(symbol_trades)

    trades = pd.concat(trades_by_symbol, ignore_index=True) if trades_by_symbol else pd.DataFrame()
    if not trades.empty:
        trades.sort_values(by=["signal_date", "symbol"], inplace=True)

    summary = build_summary(
        symbols=symbols,
        rows_by_symbol=rows_by_symbol,
        skipped_symbols=skipped_symbols,
        trades=trades,
    )

    return BacktestResult(
        strategy_name=strategy.name,
        parameters=strategy.parameters(),
        trades=trades,
        summary=summary,
        symbols=symbols,
    )


def run_gap_fill_fill_study(
    symbols: List[str],
    start: str,
    end: str,
    min_gap_pct: float,
    use_cache: bool = True,
    horizons: tuple[int, ...] = (1, 5, 20, 60),
) -> dict[str, object]:
    events_by_symbol = []
    skipped_symbols: Dict[str, str] = {}
    rows_by_symbol: Dict[str, int] = {}

    for symbol in symbols:
        try:
            prices = load_ohlcv(symbol=symbol, start=start, end=end, use_cache=use_cache)
        except Exception as exc:
            skipped_symbols[symbol] = str(exc)
            continue

        rows_by_symbol[symbol] = len(prices)
        if len(prices) < 2:
            skipped_symbols[symbol] = "Not enough rows for a gap calculation"
            continue

        events = study_gap_fills(symbol=symbol, prices=prices, min_gap_pct=min_gap_pct, horizons=horizons)
        if not events.empty:
            events_by_symbol.append(events)

    all_events = pd.concat(events_by_symbol, ignore_index=True) if events_by_symbol else pd.DataFrame()
    fill_rates_pct = {}
    if not all_events.empty:
        for horizon in horizons:
            column = f"fills_within_{horizon}d"
            fill_rates_pct[f"{horizon}d"] = round(float(all_events[column].mean() * 100.0), 2)
    else:
        for horizon in horizons:
            fill_rates_pct[f"{horizon}d"] = 0.0

    return {
        "event_count": int(len(all_events)),
        "fill_rates_pct": fill_rates_pct,
        "rows_by_symbol": rows_by_symbol,
        "skipped_symbols": skipped_symbols,
    }


def build_summary(
    symbols: List[str],
    rows_by_symbol: Dict[str, int],
    skipped_symbols: Dict[str, str],
    trades: pd.DataFrame,
) -> Dict[str, object]:
    summary: Dict[str, object] = {
        "symbol_count": len(symbols),
        "symbols_with_data": len(rows_by_symbol),
        "skipped_symbols": skipped_symbols,
        "rows_by_symbol": rows_by_symbol,
        "trade_count": 0,
        "fill_rate_pct": 0.0,
        "win_rate_pct": 0.0,
        "avg_return_pct": 0.0,
        "median_return_pct": 0.0,
        "trade_return_std_pct": 0.0,
        "trade_sharpe": None,
        "avg_win_pct": 0.0,
        "avg_loss_pct": 0.0,
        "avg_gap_pct": 0.0,
        "avg_holding_bars": 0.0,
        "median_days_to_fill": None,
        "timeout_count": 0,
        "stop_count": 0,
    }

    if trades.empty:
        return summary

    positive_returns = trades.loc[trades["return_pct"] > 0, "return_pct"]
    non_positive_returns = trades.loc[trades["return_pct"] <= 0, "return_pct"]
    return_std = _std_or_zero(trades["return_pct"])
    trade_sharpe = _trade_sharpe(trades["return_pct"])

    summary.update(
        {
            "trade_count": int(len(trades)),
            "fill_rate_pct": round(float(trades["gap_filled_within_horizon"].mean() * 100.0), 2),
            "win_rate_pct": round(float((trades["return_pct"] > 0).mean() * 100.0), 2),
            "avg_return_pct": round(float(trades["return_pct"].mean()), 3),
            "median_return_pct": round(float(trades["return_pct"].median()), 3),
            "trade_return_std_pct": round(return_std, 3),
            "trade_sharpe": None if trade_sharpe is None else round(trade_sharpe, 3),
            "avg_win_pct": round(float(positive_returns.mean()), 3) if not positive_returns.empty else 0.0,
            "avg_loss_pct": round(float(non_positive_returns.mean()), 3) if not non_positive_returns.empty else 0.0,
            "avg_gap_pct": round(float(trades["gap_pct"].mean()), 3),
            "avg_holding_bars": round(float(trades["holding_bars"].mean()), 2),
            "median_days_to_fill": _median_or_none(trades["days_to_fill"]),
            "timeout_count": int((trades["exit_reason"] == "timeout").sum()),
            "stop_count": int(trades["exit_reason"].astype(str).str.startswith("stop").sum()),
        }
    )
    return summary


def sequential_equity_curve(trades: pd.DataFrame) -> pd.DataFrame:
    if trades.empty:
        return pd.DataFrame(columns=["trade_number", "equity"])

    ordered = trades.sort_values(by=["signal_date", "symbol"]).reset_index(drop=True).copy()
    ordered["trade_number"] = ordered.index + 1
    ordered["equity"] = (1.0 + ordered["return_pct"] / 100.0).cumprod()
    return ordered.loc[:, ["trade_number", "signal_date", "symbol", "return_pct", "equity"]]


def _median_or_none(series: pd.Series):
    filtered = series.dropna()
    if filtered.empty:
        return None
    return float(filtered.median())


def _std_or_zero(series: pd.Series) -> float:
    filtered = pd.to_numeric(series, errors="coerce").dropna()
    if len(filtered) < 2:
        return 0.0
    return float(filtered.std(ddof=1))


def _trade_sharpe(series: pd.Series):
    filtered = pd.to_numeric(series, errors="coerce").dropna()
    if len(filtered) < 2:
        return None
    std = float(filtered.std(ddof=1))
    if std == 0:
        return None
    return float(filtered.mean()) / std
