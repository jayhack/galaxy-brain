from __future__ import annotations

from collections import Counter
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from gapfill_sandbox.data import load_cached
from gapfill_sandbox.strategies import Strategy


@dataclass
class RunConfig:
    run_name: str
    universe: str
    tickers: list[str]
    start: str
    end: str
    min_gap_pct: float
    stop_multiple: float
    time_stop_days: int
    strategy_names: list[str]
    horizons: tuple[int, ...] = (1, 5, 20, 60)


@dataclass
class RunResult:
    config: dict[str, Any]
    strategies: list[dict[str, str]]
    per_horizon: dict[str, dict[str, float]]
    equity_curve: list[dict[str, Any]]
    sample_pnls: list[float]
    summary: dict[str, float]


def _strict_gap_row(
    prev_high: float,
    prev_low: float,
    o: float,
    h: float,
    l: float,
    c: float,
    min_gap_pct: float,
) -> dict[str, Any] | None:
    """Return gap info for row t vs prior bar t-1, or None if no strict gap."""
    # next bar open for entry (we use next session after gap detection on close of gap day)
    if prev_high <= 0 or prev_low <= 0:
        return None
    gap_up = l > prev_high
    gap_down = h < prev_low
    if gap_up and gap_down:
        return None
    if gap_up:
        gap_size = l - prev_high
        mid = 0.5 * (prev_high + l)
        gap_pct = 100.0 * gap_size / mid if mid > 0 else 0.0
        if gap_pct < min_gap_pct:
            return None
        return {
            "direction": "up",
            "gap_size": gap_size,
            "fill_level": prev_high,
            "gap_pct": gap_pct,
            "gap_day_o": o,
            "gap_day_h": h,
            "gap_day_l": l,
            "gap_day_c": c,
        }
    if gap_down:
        gap_size = prev_low - h
        mid = 0.5 * (prev_low + h)
        gap_pct = 100.0 * gap_size / mid if mid > 0 else 0.0
        if gap_pct < min_gap_pct:
            return None
        return {
            "direction": "down",
            "gap_size": gap_size,
            "fill_level": prev_low,
            "gap_pct": gap_pct,
            "gap_day_o": o,
            "gap_day_h": h,
            "gap_day_l": l,
            "gap_day_c": c,
        }
    return None


def _simulate_trade(
    direction: str,
    gap_size: float,
    fill_level: float,
    stop_multiple: float,
    time_stop_days: int,
    future_high: np.ndarray,
    future_low: np.ndarray,
    future_open: np.ndarray,
) -> tuple[float | None, str]:
    """
    Enter at next bar open[0], fade toward fill_level.
    Stop: adverse move >= stop_multiple * gap_size from entry.
    """
    if len(future_open) < 2:
        return None, "no_future"
    entry = float(future_open[0])
    stop_dist = stop_multiple * gap_size
    if direction == "up":
        # short fade: profit if price drops to fill_level
        stop_price = entry + stop_dist
        pos = -1  # short
    else:
        # long fade
        stop_price = entry - stop_dist
        pos = 1

    for d in range(1, min(time_stop_days + 1, len(future_open))):
        hi = float(future_high[d])
        lo = float(future_low[d])
        if direction == "up":
            if lo <= fill_level:
                pnl = (entry - fill_level) / entry * 100.0
                return pnl, "target_fill"
            if hi >= stop_price:
                pnl = (entry - stop_price) / entry * 100.0
                return pnl, "stop"
        else:
            if hi >= fill_level:
                pnl = (fill_level - entry) / entry * 100.0
                return pnl, "target_fill"
            if lo <= stop_price:
                pnl = (stop_price - entry) / entry * 100.0
                return pnl, "stop"
    # exit at last bar close approximated by open of day after horizon — use last available close path
    last = min(time_stop_days, len(future_open) - 1)
    exit_px = float(future_open[last]) if last < len(future_open) else float(future_open[-1])
    if direction == "up":
        pnl = (entry - exit_px) / entry * 100.0
    else:
        pnl = (exit_px - entry) / entry * 100.0
    return pnl, "time_stop"


def _horizon_fill(
    direction: str,
    fill_level: float,
    future_high: np.ndarray,
    future_low: np.ndarray,
    H: int,
) -> tuple[bool, int | None]:
    n = min(H, len(future_high))
    for d in range(n):
        if direction == "up":
            if future_low[d] <= fill_level:
                return True, d + 1
        else:
            if future_high[d] >= fill_level:
                return True, d + 1
    return False, None


def _downsample_equity_curve(
    dates: list[str], pnl_per_trade: list[float], max_points: int = 2500
) -> list[dict[str, Any]]:
    n = len(pnl_per_trade)
    cum = 0.0
    cum_series: list[float] = []
    for p in pnl_per_trade:
        cum += p
        cum_series.append(cum)
    if n <= max_points:
        return [{"date": d, "cum_pnl_pct": c} for d, c in zip(dates, cum_series, strict=True)]
    step = max(1, n // max_points)
    out: list[dict[str, Any]] = [
        {"date": dates[i], "cum_pnl_pct": cum_series[i]} for i in range(0, n, step)
    ]
    last = {"date": dates[-1], "cum_pnl_pct": cum_series[-1]}
    if out[-1]["date"] != last["date"]:
        out.append(last)
    else:
        out[-1] = last
    return out


def run_backtest(cfg: RunConfig, cache_dir: Path, strategies: list[Strategy]) -> RunResult:
    horizons = cfg.horizons
    horizon_ok: dict[int, int] = {int(h): 0 for h in horizons}
    trade_pnls: list[float] = []
    daily_pnl: list[float] = []
    daily_dates: list[str] = []
    exit_counts: Counter[str] = Counter()

    for sym in cfg.tickers:
        df = load_cached(cache_dir, sym)
        if df is None or len(df) < 5:
            continue
        df = df.loc[(df.index >= pd.Timestamp(cfg.start)) & (df.index <= pd.Timestamp(cfg.end))]
        if len(df) < 5:
            continue
        o = df["open"].to_numpy(dtype=float)
        h = df["high"].to_numpy()
        l = df["low"].to_numpy()
        c = df["close"].to_numpy()
        idx = df.index
        for t in range(1, len(df) - 2):
            prev_high, prev_low = float(h[t - 1]), float(l[t - 1])
            g = _strict_gap_row(prev_high, prev_low, float(o[t]), float(h[t]), float(l[t]), float(c[t]), cfg.min_gap_pct)
            if g is None:
                continue
            direction = g["direction"]
            gap_size = float(g["gap_size"])
            fill_level = float(g["fill_level"])
            gap_pct = float(g["gap_pct"])
            future_high = h[t + 1 :]
            future_low = l[t + 1 :]
            future_open = o[t + 1 :]
            for H in horizons:
                ok, _day = _horizon_fill(direction, fill_level, future_high, future_low, H)
                if ok:
                    horizon_ok[int(H)] += 1
            pnl, exit_reason = _simulate_trade(
                direction,
                gap_size,
                fill_level,
                cfg.stop_multiple,
                cfg.time_stop_days,
                future_high,
                future_low,
                future_open,
            )
            if pnl is not None:
                trade_pnls.append(pnl)
                exit_counts[exit_reason or "unknown"] += 1
                daily_pnl.append(pnl)
                daily_dates.append(str(idx[t + 1].date()))

    n_events = len(trade_pnls)
    per_horizon: dict[str, dict[str, float]] = {}
    for H in horizons:
        key = f"{H}d"
        ok = horizon_ok[int(H)]
        per_horizon[key] = {
            "fill_rate": (ok / n_events) if n_events else 0.0,
            "n": float(n_events),
        }
    wins = sum(1 for p in trade_pnls if p > 0)
    losses = sum(1 for p in trade_pnls if p < 0)
    flat = sum(1 for p in trade_pnls if p == 0)
    win_rate = wins / len(trade_pnls) if trade_pnls else 0.0
    mean_pnl = float(np.mean(trade_pnls)) if trade_pnls else 0.0
    std_pnl = float(np.std(trade_pnls, ddof=1)) if len(trade_pnls) > 1 else 0.0
    # Per-trade signal-to-noise (not an annualized Sharpe — trades are overlapping across names/dates).
    sharpe_simple = (mean_pnl / std_pnl) if std_pnl > 1e-12 else 0.0

    # equity curve: cumulative sum of trade returns (simple), downsampled for JSON size
    eq = _downsample_equity_curve(daily_dates, daily_pnl, max_points=2500)

    rng = np.random.default_rng(42)
    sample_pnls: list[float]
    if len(trade_pnls) <= 8000:
        sample_pnls = trade_pnls
    else:
        idx = rng.choice(len(trade_pnls), size=8000, replace=False)
        sample_pnls = [trade_pnls[i] for i in sorted(idx)]

    summary = {
        "n_gap_events": float(n_events),
        "n_symbols_used": float(len(cfg.tickers)),
        "win_rate": win_rate,
        "mean_trade_pnl_pct": mean_pnl,
        "std_trade_pnl_pct": std_pnl,
        "mean_over_std_per_trade": sharpe_simple,
        "wins": float(wins),
        "losses": float(losses),
        "flat": float(flat),
        "exit_counts": {k: float(v) for k, v in exit_counts.items()},
    }

    cfg_dict = asdict(cfg)
    cfg_dict["horizons"] = list(cfg.horizons)
    strat_meta = [{"name": s.meta().name, "description": s.meta().description} for s in strategies]

    return RunResult(
        config=cfg_dict,
        strategies=strat_meta,
        per_horizon=per_horizon,
        equity_curve=eq,
        sample_pnls=sample_pnls,
        summary=summary,
    )


def write_run_json(result: RunResult, path: Path) -> None:
    import json

    path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "config": result.config,
        "strategies": result.strategies,
        "per_horizon": result.per_horizon,
        "summary": result.summary,
        "equity_curve": result.equity_curve,
        "sample_pnls": result.sample_pnls,
    }
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
