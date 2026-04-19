"""Single-symbol event-driven backtester.

Scope: simple, auditable, fast enough for S&P-500 × 10yr. Each trade lives in
isolation (no portfolio constraints, no leverage modeling) — position sizing
is a fixed notional. That's deliberately dumb; when we want a portfolio-level
backtest we'll add a second layer on top.

Fill model:
    - Entry fill = next bar's open  (can't see the current bar's open when
      the signal is emitted from *that bar's* close data in a realistic feed;
      a strict-gap signal is actually known at the close of day t, so filling
      at open of t+1 is conservative)
    - Exit fills: if target or stop is traversed intra-bar, fill at that price
      (worst-case assumption: the bar opened between; if the bar gapped
      through the level, fill at the open).
    - Commissions + slippage applied symmetrically in bps of notional.
"""

from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import List

import numpy as np
import pandas as pd

from .strategy import TradeIntent


@dataclass
class TradeResult:
    symbol: str
    side: str
    signal_date: pd.Timestamp
    entry_date: pd.Timestamp
    entry_price: float
    exit_date: pd.Timestamp
    exit_price: float
    exit_reason: str           # "target" | "stop" | "time_stop" | "end_of_data"
    bars_held: int
    position_size_usd: float
    gross_pnl_usd: float
    costs_usd: float
    net_pnl_usd: float
    net_return: float          # net_pnl / position_size
    meta: dict


def _cost_usd(notional: float, commission_bps: float, slippage_bps: float) -> float:
    # charged once per side; entry + exit => 2x
    return notional * (commission_bps + slippage_bps) / 10_000.0


def run_single_symbol(
    df: pd.DataFrame,
    intents: List[TradeIntent],
    position_size_usd: float,
    commission_bps: float,
    slippage_bps: float,
) -> List[TradeResult]:
    """Apply each TradeIntent to the bar data, one at a time.

    Intents are assumed to be sorted by date. If intents overlap in time the
    backtest still treats each as an independent trade (no portfolio cap).
    """
    if df.empty or not intents:
        return []

    # positional lookup
    idx = df.index
    pos_of = {d: i for i, d in enumerate(idx)}
    opens = df["open"].values
    highs = df["high"].values
    lows = df["low"].values
    closes = df["close"].values
    n = len(df)

    results: List[TradeResult] = []
    for it in intents:
        if it.entry_date not in pos_of:
            continue
        t = pos_of[it.entry_date]
        # entry bar = t+1 (next open). If no next bar, skip.
        if t + 1 >= n:
            continue
        entry_i = t + 1
        entry_px = float(opens[entry_i])
        # Sanity: if entry open is already past the target (gap already filled
        # overnight), we resolve immediately as a target fill at that price.
        # For a short, target is below entry; for a long, target is above.
        qty = position_size_usd / entry_px if entry_px > 0 else 0.0
        if qty <= 0:
            continue

        exit_reason = "end_of_data"
        exit_i = n - 1
        exit_px = float(closes[exit_i])

        last_i = min(n - 1, entry_i + it.time_stop_days)
        for k in range(entry_i, last_i + 1):
            hi = highs[k]
            lo = lows[k]
            op = opens[k]
            if it.side == "short":
                # Target is below entry (gap fill downward). Stop is above entry.
                # If the bar gaps past target at open, fill at open (better
                # for us? worse? For a short, target fill at lower open is
                # actually *better* PnL than target, which is conservative —
                # but we want the *actual* fill price, so use the open).
                # Stop-out on open above stop: fill at open (worse PnL).
                if k == entry_i:
                    # allow same-bar hit (after entry fill)
                    pass
                if op <= it.target_price:
                    exit_reason = "target"; exit_i = k; exit_px = float(op); break
                if op >= it.stop_price:
                    exit_reason = "stop"; exit_i = k; exit_px = float(op); break
                if lo <= it.target_price:
                    exit_reason = "target"; exit_i = k; exit_px = float(it.target_price); break
                if hi >= it.stop_price:
                    exit_reason = "stop"; exit_i = k; exit_px = float(it.stop_price); break
            else:  # long
                if op >= it.target_price:
                    exit_reason = "target"; exit_i = k; exit_px = float(op); break
                if op <= it.stop_price:
                    exit_reason = "stop"; exit_i = k; exit_px = float(op); break
                if hi >= it.target_price:
                    exit_reason = "target"; exit_i = k; exit_px = float(it.target_price); break
                if lo <= it.stop_price:
                    exit_reason = "stop"; exit_i = k; exit_px = float(it.stop_price); break
        else:
            # loop fell through without break => time stop
            if last_i < n - 1 or last_i == entry_i + it.time_stop_days:
                exit_reason = "time_stop"
                exit_i = last_i
                exit_px = float(closes[exit_i])

        gross = (entry_px - exit_px) * qty if it.side == "short" else (exit_px - entry_px) * qty
        costs = 2 * _cost_usd(position_size_usd, commission_bps, slippage_bps)
        net = gross - costs

        results.append(
            TradeResult(
                symbol=it.symbol,
                side=it.side,
                signal_date=pd.Timestamp(it.entry_date),
                entry_date=pd.Timestamp(idx[entry_i]),
                entry_price=entry_px,
                exit_date=pd.Timestamp(idx[exit_i]),
                exit_price=exit_px,
                exit_reason=exit_reason,
                bars_held=exit_i - entry_i,
                position_size_usd=position_size_usd,
                gross_pnl_usd=gross,
                costs_usd=costs,
                net_pnl_usd=net,
                net_return=net / position_size_usd,
                meta=dict(it.meta or {}),
            )
        )

    return results


def trades_to_frame(trades: List[TradeResult]) -> pd.DataFrame:
    if not trades:
        return pd.DataFrame()
    rows = []
    for t in trades:
        row = asdict(t)
        meta = row.pop("meta") or {}
        for k, v in meta.items():
            row[f"meta_{k}"] = v
        rows.append(row)
    return pd.DataFrame(rows)
