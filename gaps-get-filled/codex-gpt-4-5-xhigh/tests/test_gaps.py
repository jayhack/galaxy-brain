from __future__ import annotations

import pandas as pd

from closing_bell.backtest import run_single_symbol
from closing_bell.gaps import detect_strict_gaps, measure_fills
from closing_bell.strategy import TradeIntent


def test_detect_strict_gap_and_measure_fill() -> None:
    df = pd.DataFrame(
        {
            "open": [100, 111, 110, 104],
            "high": [105, 112, 111, 107],
            "low": [95, 109, 103, 99],
            "close": [101, 110, 104, 102],
        },
        index=pd.to_datetime(["2024-01-02", "2024-01-03", "2024-01-04", "2024-01-05"]),
    )

    gaps = detect_strict_gaps(df, min_gap_pct=0.01)
    assert len(gaps) == 1
    fills = measure_fills(df, gaps, [1, 5])
    assert fills.iloc[0]["days_to_fill"] == 1
    assert bool(fills.iloc[0]["fill_by_1d"]) is True


def test_backtest_exits_at_target_for_short_gap_fade() -> None:
    df = pd.DataFrame(
        {
            "open": [100, 111, 110, 101],
            "high": [105, 112, 111, 102],
            "low": [95, 109, 100, 99],
            "close": [101, 110, 101, 100],
        },
        index=pd.to_datetime(["2024-01-02", "2024-01-03", "2024-01-04", "2024-01-05"]),
    )
    trades = run_single_symbol(
        df,
        [
            TradeIntent(
                symbol="TEST",
                signal_date=pd.Timestamp("2024-01-03"),
                side="short",
                target_price=105.0,
                stop_price=115.0,
                time_stop_days=3,
            )
        ],
        position_size_usd=10_000,
        commission_bps=0,
        slippage_bps=0,
    )
    assert len(trades) == 1
    assert trades[0].exit_reason == "target"
    assert trades[0].net_pnl_usd > 0

