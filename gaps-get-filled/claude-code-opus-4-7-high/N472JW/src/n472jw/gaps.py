"""Strict gap detection and fill measurement.

A *strict* gap on day t is defined as:
    gap-up:   low_t  > high_{t-1}
    gap-down: high_t < low_{t-1}

The gap is "filled" on the first subsequent day where price trades back
through the prior bar's extreme (prior high for a gap-up, prior low for a
gap-down). Intra-bar fills count — we check day t's own range as well.
"""

from __future__ import annotations

import numpy as np
import pandas as pd


def detect_strict_gaps(
    df: pd.DataFrame,
    min_gap_pct: float = 0.0,
    direction: str = "both",
) -> pd.DataFrame:
    """Return a DataFrame of gap events with one row per gap day.

    Columns:
        date               gap day (t)
        prev_close         close on t-1
        prev_high          high on t-1
        prev_low           low on t-1
        open               open on t
        high               high on t
        low                low on t
        close              close on t
        direction          "up" | "down"
        gap_size           absolute price gap (low_t - prev_high or prev_low - high_t)
        gap_pct            gap_size / prev_close
        target_price       prior high (up) / prior low (down) — the fill level
    """
    if len(df) < 2:
        return pd.DataFrame(
            columns=["date", "prev_close", "prev_high", "prev_low", "open", "high",
                     "low", "close", "direction", "gap_size", "gap_pct", "target_price"]
        )

    prev_high = df["high"].shift(1)
    prev_low = df["low"].shift(1)
    prev_close = df["close"].shift(1)

    up_mask = df["low"] > prev_high
    down_mask = df["high"] < prev_low

    if direction == "up":
        down_mask[:] = False
    elif direction == "down":
        up_mask[:] = False

    rows = []
    for idx, is_up, is_down in zip(df.index, up_mask.values, down_mask.values):
        if not (is_up or is_down):
            continue
        if is_up:
            gap_size = float(df.at[idx, "low"] - prev_high.loc[idx])
            target = float(prev_high.loc[idx])
            d = "up"
        else:
            gap_size = float(prev_low.loc[idx] - df.at[idx, "high"])
            target = float(prev_low.loc[idx])
            d = "down"
        pc = float(prev_close.loc[idx])
        gap_pct = gap_size / pc if pc else np.nan
        if gap_pct < min_gap_pct:
            continue
        rows.append({
            "date": idx,
            "prev_close": pc,
            "prev_high": float(prev_high.loc[idx]),
            "prev_low": float(prev_low.loc[idx]),
            "open": float(df.at[idx, "open"]),
            "high": float(df.at[idx, "high"]),
            "low": float(df.at[idx, "low"]),
            "close": float(df.at[idx, "close"]),
            "direction": d,
            "gap_size": gap_size,
            "gap_pct": gap_pct,
            "target_price": target,
        })
    return pd.DataFrame(rows)


def measure_fills(
    df: pd.DataFrame,
    gaps: pd.DataFrame,
    horizons: list[int],
) -> pd.DataFrame:
    """For each gap, compute the number of trading days until first fill and
    flags for fill-by-H for each H in `horizons`.

    A gap is considered filled on day t+k (k >= 0) if:
        gap-up:   low at t+k   <= prior_high
        gap-down: high at t+k  >= prior_low
    k=0 means the gap filled intra-bar on the same day it opened.
    """
    if gaps.empty:
        cols = ["date", "days_to_fill"] + [f"fill_by_{h}d" for h in horizons]
        return pd.DataFrame(columns=cols)

    # Precompute positional index for O(1) lookups.
    idx_of = {d: i for i, d in enumerate(df.index)}
    highs = df["high"].values
    lows = df["low"].values
    n = len(df)

    out_rows = []
    max_h = max(horizons) if horizons else 0

    for _, g in gaps.iterrows():
        t = idx_of[g["date"]]
        target = g["target_price"]
        days_to_fill: int | None = None
        # Walk forward from day t itself (k=0 allows intra-bar fill on gap day).
        for k in range(0, n - t):
            lo = lows[t + k]
            hi = highs[t + k]
            if g["direction"] == "up" and lo <= target:
                days_to_fill = k
                break
            if g["direction"] == "down" and hi >= target:
                days_to_fill = k
                break
            if max_h and k > max_h:
                # Continue only up to horizon we might still care about? No —
                # we want the real days_to_fill, so keep going. Cap at 252 to
                # avoid pathological walks.
                if k > 252:
                    break
        row = {"date": g["date"], "days_to_fill": days_to_fill}
        for h in horizons:
            row[f"fill_by_{h}d"] = (days_to_fill is not None and days_to_fill <= h)
        out_rows.append(row)

    return pd.DataFrame(out_rows)
