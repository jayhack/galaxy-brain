from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

import pandas as pd

Side = Literal["long", "short"]


@dataclass
class TradeIntent:
    symbol: str
    signal_date: pd.Timestamp
    side: Side
    target_price: float
    stop_price: float
    time_stop_days: int
    meta: dict[str, object] = field(default_factory=dict)


class Strategy:
    name = "base"

    def generate_signals(self, symbol: str, df: pd.DataFrame) -> list[TradeIntent]:
        raise NotImplementedError


class GapFadeStrategy(Strategy):
    name = "gap_fade"

    def __init__(self, *, min_gap_pct: float, direction: str, stop_loss_pct: float, time_stop_days: int) -> None:
        self.min_gap_pct = min_gap_pct
        self.direction = direction
        self.stop_loss_pct = stop_loss_pct
        self.time_stop_days = time_stop_days

    def generate_signals(self, symbol: str, df: pd.DataFrame) -> list[TradeIntent]:
        from .gaps import detect_strict_gaps

        gaps = detect_strict_gaps(df, min_gap_pct=self.min_gap_pct, direction=self.direction)
        intents: list[TradeIntent] = []
        for _, gap in gaps.iterrows():
            if gap["direction"] == "up":
                side: Side = "short"
                stop_price = float(gap["close"]) * (1 + self.stop_loss_pct)
            else:
                side = "long"
                stop_price = float(gap["close"]) * (1 - self.stop_loss_pct)
            intents.append(
                TradeIntent(
                    symbol=symbol,
                    signal_date=pd.Timestamp(gap["date"]),
                    side=side,
                    target_price=float(gap["fill_level"]),
                    stop_price=stop_price,
                    time_stop_days=self.time_stop_days,
                    meta={
                        "gap_direction": gap["direction"],
                        "gap_pct": float(gap["gap_pct"]),
                        "gap_size": float(gap["gap_size"]),
                        "prev_close": float(gap["prev_close"]),
                        "gap_close": float(gap["close"]),
                    },
                )
            )
        return intents

