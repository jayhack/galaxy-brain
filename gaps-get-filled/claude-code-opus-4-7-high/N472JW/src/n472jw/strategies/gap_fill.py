"""Gap-fill strategy.

Thesis (grandfather's): gaps get filled.

Concrete rules:
  - Detect strict gaps of at least `min_gap_pct` in the configured direction.
  - On the close of gap day t, emit a TradeIntent against the gap:
      * gap-up   -> short, target = prior high, stop = entry * (1 + stop_loss_pct)
      * gap-down -> long,  target = prior low,  stop = entry * (1 - stop_loss_pct)
  - Entry fills at next bar's open (the backtester handles that).
  - Time stop: `time_stop_days` bars after entry.

We use the gap day's *close* as the reference for the stop level since that's
what's known when the signal fires. Entry fill happens at the next open, so
actual stop distance will vary slightly — that's realistic.
"""

from __future__ import annotations

from typing import List

import pandas as pd

from ..config import GapParams, TradeParams
from ..gaps import detect_strict_gaps
from ..strategy import Strategy, TradeIntent


class GapFillStrategy(Strategy):
    name = "gap_fill"

    def __init__(self, gap: GapParams, trade: TradeParams):
        self.gap = gap
        self.trade = trade

    def generate_signals(self, symbol: str, df: pd.DataFrame) -> List[TradeIntent]:
        gaps = detect_strict_gaps(
            df,
            min_gap_pct=self.gap.min_gap_pct,
            direction=self.gap.direction,
        )
        if gaps.empty:
            return []

        intents: List[TradeIntent] = []
        for _, g in gaps.iterrows():
            ref_px = g["close"]  # known at the close of the gap day
            if g["direction"] == "up":
                if not self.trade.allow_short:
                    continue
                side = "short"
                target = g["target_price"]  # prior high
                stop = ref_px * (1 + self.trade.stop_loss_pct)
            else:
                side = "long"
                target = g["target_price"]  # prior low
                stop = ref_px * (1 - self.trade.stop_loss_pct)

            intents.append(
                TradeIntent(
                    symbol=symbol,
                    entry_date=g["date"],
                    side=side,
                    target_price=float(target),
                    stop_price=float(stop),
                    time_stop_days=self.trade.time_stop_days,
                    meta={
                        "gap_direction": g["direction"],
                        "gap_pct": float(g["gap_pct"]),
                        "gap_size": float(g["gap_size"]),
                        "prev_close": float(g["prev_close"]),
                        "gap_open": float(g["open"]),
                    },
                )
            )
        return intents
