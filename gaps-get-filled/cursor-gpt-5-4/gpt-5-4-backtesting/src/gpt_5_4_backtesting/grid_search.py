from __future__ import annotations

from itertools import product
from typing import Iterable, Optional

import pandas as pd

from gpt_5_4_backtesting.engine import run_backtest
from gpt_5_4_backtesting.models import GridSearchResult
from gpt_5_4_backtesting.strategies.gap_fill import GapFillStrategy


VALID_SORT_COLUMNS = {
    "trade_count",
    "fill_rate_pct",
    "win_rate_pct",
    "avg_return_pct",
    "median_return_pct",
    "trade_sharpe",
    "trade_return_std_pct",
    "avg_gap_pct",
    "avg_holding_bars",
    "median_days_to_fill",
    "timeout_count",
    "stop_count",
}
LOWER_IS_BETTER_SORT_COLUMNS = {"avg_holding_bars", "median_days_to_fill", "timeout_count", "stop_count"}


def run_gap_fill_grid_search(
    symbols: list[str],
    start: str,
    end: str,
    min_gap_pcts: Iterable[float],
    max_hold_days_values: Iterable[int],
    stop_gap_multiples: Iterable[Optional[float]],
    sort_by: str = "avg_return_pct",
    min_trades: int = 20,
    use_cache: bool = True,
) -> GridSearchResult:
    if sort_by not in VALID_SORT_COLUMNS:
        valid = ", ".join(sorted(VALID_SORT_COLUMNS))
        raise ValueError(f"Unsupported sort column '{sort_by}'. Choose one of: {valid}")

    rows = []
    search_space = {
        "min_gap_pct": list(min_gap_pcts),
        "max_hold_days": list(max_hold_days_values),
        "stop_gap_multiple": list(stop_gap_multiples),
    }

    for min_gap_pct, max_hold_days, stop_gap_multiple in product(
        search_space["min_gap_pct"],
        search_space["max_hold_days"],
        search_space["stop_gap_multiple"],
    ):
        strategy = GapFillStrategy(
            min_gap_pct=min_gap_pct,
            max_hold_days=max_hold_days,
            stop_gap_multiple=stop_gap_multiple,
        )
        result = run_backtest(
            symbols=symbols,
            strategy=strategy,
            start=start,
            end=end,
            use_cache=use_cache,
        )

        rows.append(
            {
                "parameter_label": _parameter_label(min_gap_pct, max_hold_days, stop_gap_multiple),
                "min_gap_pct": min_gap_pct,
                "max_hold_days": max_hold_days,
                "stop_gap_multiple": stop_gap_multiple,
                "symbol_count": result.summary["symbol_count"],
                "symbols_with_data": result.summary["symbols_with_data"],
                "skipped_symbol_count": len(result.summary["skipped_symbols"]),
                "trade_count": result.summary["trade_count"],
                "fill_rate_pct": result.summary["fill_rate_pct"],
                "win_rate_pct": result.summary["win_rate_pct"],
                "avg_return_pct": result.summary["avg_return_pct"],
                "median_return_pct": result.summary["median_return_pct"],
                "trade_sharpe": result.summary["trade_sharpe"],
                "trade_return_std_pct": result.summary["trade_return_std_pct"],
                "avg_gap_pct": result.summary["avg_gap_pct"],
                "avg_holding_bars": result.summary["avg_holding_bars"],
                "median_days_to_fill": result.summary["median_days_to_fill"],
                "timeout_count": result.summary["timeout_count"],
                "stop_count": result.summary["stop_count"],
                "meets_min_trades": result.summary["trade_count"] >= min_trades,
            }
        )

    results = pd.DataFrame(rows)
    if not results.empty:
        ascending = sort_by in LOWER_IS_BETTER_SORT_COLUMNS
        sort_columns = ["meets_min_trades", sort_by, "fill_rate_pct", "trade_count"]
        sort_orders = [False, ascending, False, False]
        deduped_columns = []
        deduped_orders = []
        for column, order in zip(sort_columns, sort_orders):
            if column in deduped_columns:
                continue
            deduped_columns.append(column)
            deduped_orders.append(order)
        results.sort_values(
            by=deduped_columns,
            ascending=deduped_orders,
            inplace=True,
            na_position="last",
        )
        results.reset_index(drop=True, inplace=True)
        results.insert(0, "rank", range(1, len(results) + 1))

    return GridSearchResult(
        strategy_name="gap-fill",
        search_space=search_space,
        sort_by=sort_by,
        min_trades=min_trades,
        results=results,
        symbols=symbols,
    )


def _parameter_label(min_gap_pct: float, max_hold_days: int, stop_gap_multiple: Optional[float]) -> str:
    stop_label = "none" if stop_gap_multiple is None else f"{stop_gap_multiple}x"
    return f"gap>={min_gap_pct:.2f}% | hold={max_hold_days} | stop={stop_label}"
