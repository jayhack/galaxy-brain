import pandas as pd

from gpt_5_4_backtesting.engine import build_summary
from gpt_5_4_backtesting.strategies.gap_fill import GapFillStrategy, study_gap_fills


def test_gap_up_fills_next_day() -> None:
    prices = pd.DataFrame(
        [
            {"open": 100, "high": 102, "low": 99, "close": 101, "volume": 1_000_000},
            {"open": 105, "high": 106, "low": 104, "close": 105, "volume": 1_000_000},
            {"open": 103, "high": 104, "low": 101, "close": 102, "volume": 1_000_000},
        ],
        index=pd.to_datetime(["2024-01-02", "2024-01-03", "2024-01-04"]),
    )

    strategy = GapFillStrategy(min_gap_pct=1.0, max_hold_days=3)
    trades = strategy.run("TEST", prices)

    assert len(trades) == 1
    trade = trades.iloc[0]
    assert trade["gap_direction"] == "up"
    assert trade["trade_direction"] == "short"
    assert bool(trade["gap_filled_within_horizon"]) is True
    assert trade["days_to_fill"] == 1
    assert trade["exit_reason"] == "gap_filled"
    assert trade["exit_date"] == "2024-01-04"


def test_gap_down_times_out_when_not_filled() -> None:
    prices = pd.DataFrame(
        [
            {"open": 100, "high": 101, "low": 98, "close": 99, "volume": 1_000_000},
            {"open": 95, "high": 96, "low": 94, "close": 95, "volume": 1_000_000},
            {"open": 95, "high": 97, "low": 94, "close": 96, "volume": 1_000_000},
            {"open": 96, "high": 97, "low": 95, "close": 97, "volume": 1_000_000},
        ],
        index=pd.to_datetime(["2024-02-01", "2024-02-02", "2024-02-05", "2024-02-06"]),
    )

    strategy = GapFillStrategy(min_gap_pct=1.0, max_hold_days=2)
    trades = strategy.run("TEST", prices)

    assert len(trades) == 1
    trade = trades.iloc[0]
    assert trade["gap_direction"] == "down"
    assert trade["trade_direction"] == "long"
    assert bool(trade["gap_filled_within_horizon"]) is False
    assert pd.isna(trade["days_to_fill"])
    assert trade["exit_reason"] == "timeout"


def test_fill_study_tracks_multiple_horizons() -> None:
    prices = pd.DataFrame(
        [
            {"open": 100, "high": 102, "low": 99, "close": 101, "volume": 1_000_000},
            {"open": 105, "high": 106, "low": 104, "close": 105, "volume": 1_000_000},
            {"open": 104, "high": 105, "low": 103, "close": 104, "volume": 1_000_000},
            {"open": 103, "high": 104, "low": 101, "close": 102, "volume": 1_000_000},
        ],
        index=pd.to_datetime(["2024-01-02", "2024-01-03", "2024-01-04", "2024-01-05"]),
    )

    study = study_gap_fills("TEST", prices, min_gap_pct=1.0, horizons=(1, 2, 3))

    assert len(study) == 1
    row = study.iloc[0]
    assert bool(row["fills_within_1d"]) is False
    assert bool(row["fills_within_2d"]) is True
    assert bool(row["fills_within_3d"]) is True


def test_summary_aggregates_trade_metrics() -> None:
    trades = pd.DataFrame(
        [
            {
                "symbol": "AAA",
                "gap_filled_within_horizon": True,
                "return_pct": 2.0,
                "gap_pct": 1.5,
                "holding_bars": 2,
                "days_to_fill": 1,
                "exit_reason": "gap_filled",
            },
            {
                "symbol": "BBB",
                "gap_filled_within_horizon": False,
                "return_pct": -1.0,
                "gap_pct": 2.0,
                "holding_bars": 5,
                "days_to_fill": None,
                "exit_reason": "timeout",
            },
        ]
    )

    summary = build_summary(
        symbols=["AAA", "BBB"],
        rows_by_symbol={"AAA": 30, "BBB": 30},
        skipped_symbols={},
        trades=trades,
    )

    assert summary["trade_count"] == 2
    assert summary["fill_rate_pct"] == 50.0
    assert summary["win_rate_pct"] == 50.0
    assert summary["avg_return_pct"] == 0.5
    assert summary["trade_sharpe"] is not None
    assert summary["avg_win_pct"] == 2.0
    assert summary["avg_loss_pct"] == -1.0
    assert summary["median_days_to_fill"] == 1.0
