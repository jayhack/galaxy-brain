from __future__ import annotations

import math

import pandas as pd


def detect_strict_gaps(
    df: pd.DataFrame,
    *,
    min_gap_pct: float = 0.0,
    direction: str = "both",
) -> pd.DataFrame:
    if len(df) < 2:
        return pd.DataFrame(
            columns=[
                "date",
                "prev_close",
                "prev_high",
                "prev_low",
                "open",
                "high",
                "low",
                "close",
                "direction",
                "gap_size",
                "gap_pct",
                "fill_level",
            ]
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

    rows: list[dict[str, object]] = []
    for idx in df.index:
        if not bool(up_mask.loc[idx] or down_mask.loc[idx]):
            continue
        if bool(up_mask.loc[idx]):
            gap_size = float(df.at[idx, "low"] - prev_high.loc[idx])
            gap_direction = "up"
            fill_level = float(prev_high.loc[idx])
        else:
            gap_size = float(prev_low.loc[idx] - df.at[idx, "high"])
            gap_direction = "down"
            fill_level = float(prev_low.loc[idx])
        base = float(prev_close.loc[idx])
        gap_pct = gap_size / base if base else math.nan
        if gap_pct < min_gap_pct:
            continue
        rows.append(
            {
                "date": idx,
                "prev_close": base,
                "prev_high": float(prev_high.loc[idx]),
                "prev_low": float(prev_low.loc[idx]),
                "open": float(df.at[idx, "open"]),
                "high": float(df.at[idx, "high"]),
                "low": float(df.at[idx, "low"]),
                "close": float(df.at[idx, "close"]),
                "direction": gap_direction,
                "gap_size": gap_size,
                "gap_pct": gap_pct,
                "fill_level": fill_level,
            }
        )

    return pd.DataFrame(rows)


def measure_fills(df: pd.DataFrame, gaps: pd.DataFrame, horizons: list[int]) -> pd.DataFrame:
    if gaps.empty:
        return pd.DataFrame(columns=["date", "days_to_fill", *[f"fill_by_{h}d" for h in horizons]])

    idx_of = {timestamp: position for position, timestamp in enumerate(df.index)}
    highs = df["high"].to_numpy()
    lows = df["low"].to_numpy()
    rows: list[dict[str, object]] = []

    for _, gap in gaps.iterrows():
        start = idx_of[gap["date"]]
        days_to_fill: int | None = None
        for day_offset in range(1, len(df.index) - start):
            high = highs[start + day_offset]
            low = lows[start + day_offset]
            if gap["direction"] == "up" and low <= gap["fill_level"]:
                days_to_fill = day_offset
                break
            if gap["direction"] == "down" and high >= gap["fill_level"]:
                days_to_fill = day_offset
                break
        row: dict[str, object] = {"date": gap["date"], "days_to_fill": days_to_fill}
        for horizon in horizons:
            row[f"fill_by_{horizon}d"] = days_to_fill is not None and days_to_fill <= horizon
        rows.append(row)

    return pd.DataFrame(rows)


def bucket_gap_size(gap_pct: float) -> str:
    if gap_pct < 0.005:
        return "<0.5%"
    if gap_pct < 0.01:
        return "0.5-1%"
    if gap_pct < 0.02:
        return "1-2%"
    if gap_pct < 0.05:
        return "2-5%"
    return ">5%"

