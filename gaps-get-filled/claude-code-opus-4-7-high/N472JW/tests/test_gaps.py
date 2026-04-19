"""Unit tests for strict-gap detection and fill measurement."""

from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from n472jw.gaps import detect_strict_gaps, measure_fills  # noqa: E402


def _df(rows):
    """rows = [(open, high, low, close), ...]; dates are sequential."""
    dates = pd.date_range("2024-01-02", periods=len(rows), freq="B")
    return pd.DataFrame(rows, columns=["open", "high", "low", "close"], index=dates)


def test_detect_strict_gap_up():
    # Day 0: 100/102/99/101 -> prior for day 1
    # Day 1 gap up: low 103 > prior high 102
    df = _df([(100, 102, 99, 101), (104, 106, 103, 105)])
    gaps = detect_strict_gaps(df)
    assert len(gaps) == 1
    assert gaps.iloc[0]["direction"] == "up"
    assert gaps.iloc[0]["target_price"] == 102
    assert gaps.iloc[0]["gap_size"] == 1  # 103 - 102
    assert abs(gaps.iloc[0]["gap_pct"] - 1 / 101) < 1e-9


def test_detect_strict_gap_down():
    df = _df([(100, 102, 99, 101), (97, 98, 95, 96)])
    gaps = detect_strict_gaps(df)
    assert len(gaps) == 1
    assert gaps.iloc[0]["direction"] == "down"
    assert gaps.iloc[0]["target_price"] == 99
    assert gaps.iloc[0]["gap_size"] == 1  # 99 - 98


def test_min_gap_pct_filter():
    # tiny gap — 0.01 pts on a $100 stock is ~0.01% — below 1% threshold
    df = _df([(100, 100, 99, 99.5), (100.011, 101, 100.01, 100.5)])
    assert detect_strict_gaps(df, min_gap_pct=0.01).empty
    assert not detect_strict_gaps(df, min_gap_pct=0.0).empty


def test_no_gap_when_ranges_overlap():
    df = _df([(100, 102, 99, 101), (101.5, 103, 100, 102.5)])  # low 100 < prior high 102
    assert detect_strict_gaps(df).empty


def test_direction_filter():
    # gap up then gap down
    df = _df([
        (100, 102, 99, 101),
        (104, 106, 103, 105),   # gap up
        (100, 101, 99, 100),    # gap down (high 101 < prior low 103)
    ])
    up_only = detect_strict_gaps(df, direction="up")
    down_only = detect_strict_gaps(df, direction="down")
    assert len(up_only) == 1 and up_only.iloc[0]["direction"] == "up"
    assert len(down_only) == 1 and down_only.iloc[0]["direction"] == "down"


def test_measure_fills_same_bar():
    # gap up on day 1, same-bar fill because low 102 <= prior high 102
    df = _df([(100, 102, 99, 101), (103, 105, 102, 104)])  # wait — low 102 not > 102
    # force a strict gap up then intra-bar fill: low=102.5 > 102, later drops to 102
    df = _df([(100, 102, 99, 101), (103, 105, 102.5, 103.5), (103, 104, 102, 103)])
    gaps = detect_strict_gaps(df)
    assert len(gaps) == 1
    fills = measure_fills(df, gaps, horizons=[1, 5])
    # fills on day t+1 (k=1): low 102 <= target 102
    assert fills.iloc[0]["days_to_fill"] == 1
    assert fills.iloc[0]["fill_by_1d"] is True or fills.iloc[0]["fill_by_1d"] == True  # noqa


def test_measure_fills_unfilled():
    # gap up that never fills within horizon
    df = _df([
        (100, 102, 99, 101),
        (104, 106, 103, 105),
        (106, 108, 104, 107),
        (108, 110, 106, 109),
    ])
    gaps = detect_strict_gaps(df)
    assert len(gaps) == 1
    fills = measure_fills(df, gaps, horizons=[1, 2])
    assert fills.iloc[0]["days_to_fill"] is None or pd.isna(fills.iloc[0]["days_to_fill"])
    assert not fills.iloc[0]["fill_by_1d"]
    assert not fills.iloc[0]["fill_by_2d"]
