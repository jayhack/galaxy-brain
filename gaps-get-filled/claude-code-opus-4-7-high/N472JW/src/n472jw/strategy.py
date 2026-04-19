"""Strategy base class.

A strategy turns a symbol's OHLC history + config into a list of trade
intents. Trade intents are interpreted by the backtester, which handles
execution details (fill price, commissions, slippage, sizing, stops, etc.).
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import List, Literal, Optional

import pandas as pd

Side = Literal["long", "short"]


@dataclass
class TradeIntent:
    """A 'please enter a position' signal emitted by a strategy.

    The backtester decides the fill price (next-open by default), applies
    commission/slippage, and tracks the position until one of the exit
    conditions is met:
      - price touches `target_price`  (take-profit)
      - price touches `stop_price`    (stop-loss)
      - `time_stop_days` bars elapse  (time stop)
    """

    symbol: str
    entry_date: datetime         # the bar on which the signal was emitted (fill happens on next bar's open by default)
    side: Side
    target_price: float
    stop_price: float
    time_stop_days: int
    # Free-form metadata for diagnostics (gap size, direction, etc.). Stored
    # alongside trade results so the UI can slice by it.
    meta: dict = None

    def __post_init__(self):
        if self.meta is None:
            self.meta = {}


class Strategy:
    """Subclass this for each strategy."""

    name: str = "base"

    def generate_signals(self, symbol: str, df: pd.DataFrame) -> List[TradeIntent]:
        raise NotImplementedError
