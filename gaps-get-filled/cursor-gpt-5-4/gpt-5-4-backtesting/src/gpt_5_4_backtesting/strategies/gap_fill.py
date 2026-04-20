from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Optional

import pandas as pd


@dataclass
class GapFillStrategy:
    min_gap_pct: float = 0.5
    max_hold_days: int = 5
    stop_gap_multiple: Optional[float] = None

    name: str = "gap-fill"

    def parameters(self) -> Dict[str, Any]:
        return {
            "min_gap_pct": self.min_gap_pct,
            "max_hold_days": self.max_hold_days,
            "stop_gap_multiple": self.stop_gap_multiple,
        }

    def run(self, symbol: str, prices: pd.DataFrame) -> pd.DataFrame:
        required = {"open", "high", "low", "close", "volume"}
        missing = required.difference(prices.columns)
        if missing:
            raise ValueError(f"{symbol} is missing columns: {', '.join(sorted(missing))}")

        trades: List[Dict[str, Any]] = []
        last_index = len(prices) - 1

        for index in range(1, len(prices)):
            signal = _build_gap_signal(previous=prices.iloc[index - 1], current=prices.iloc[index], min_gap_pct=self.min_gap_pct)
            if signal is None:
                continue

            signal_date = prices.index[index]
            entry_price = float(prices.iloc[index]["open"])
            stop_price = self._stop_price(
                trade_direction=signal["trade_direction"],
                entry_price=entry_price,
                gap_size=signal["gap_size"],
            )
            horizon_end = min(last_index, index + self.max_hold_days)

            fill_date = None
            fill_days = None
            for future_index in range(index + 1, horizon_end + 1):
                if self._target_hit(
                    trade_direction=signal["trade_direction"],
                    bar=prices.iloc[future_index],
                    target_price=signal["target_price"],
                ):
                    fill_date = prices.index[future_index]
                    fill_days = future_index - index
                    break

            exit_date = prices.index[horizon_end]
            exit_price = float(prices.iloc[horizon_end]["close"])
            exit_reason = "timeout"

            for future_index in range(index, horizon_end + 1):
                future_bar = prices.iloc[future_index]
                target_hit = self._target_hit(
                    trade_direction=signal["trade_direction"],
                    bar=future_bar,
                    target_price=signal["target_price"],
                )
                stop_hit = self._stop_hit(
                    trade_direction=signal["trade_direction"],
                    bar=future_bar,
                    stop_price=stop_price,
                )

                if target_hit and stop_hit:
                    exit_date = prices.index[future_index]
                    exit_price = float(stop_price)
                    exit_reason = "stop_before_target_same_bar"
                    break
                if stop_hit:
                    exit_date = prices.index[future_index]
                    exit_price = float(stop_price)
                    exit_reason = "stop"
                    break
                if target_hit:
                    exit_date = prices.index[future_index]
                    exit_price = float(signal["target_price"])
                    exit_reason = "gap_filled"
                    break

            holding_bars = prices.index.get_loc(exit_date) - index + 1
            return_pct = self._return_pct(
                trade_direction=signal["trade_direction"],
                entry_price=entry_price,
                exit_price=exit_price,
            )

            trades.append(
                {
                    "symbol": symbol,
                    "signal_date": signal_date.strftime("%Y-%m-%d"),
                    "gap_direction": signal["gap_direction"],
                    "trade_direction": signal["trade_direction"],
                    "previous_close": signal["previous_close"],
                    "entry_price": entry_price,
                    "target_price": signal["target_price"],
                    "stop_price": stop_price,
                    "gap_lower_price": signal["gap_lower_price"],
                    "gap_upper_price": signal["gap_upper_price"],
                    "gap_size": signal["gap_size"],
                    "gap_pct": signal["gap_pct"],
                    "gap_filled_within_horizon": fill_date is not None,
                    "days_to_fill": fill_days,
                    "exit_date": exit_date.strftime("%Y-%m-%d"),
                    "exit_price": exit_price,
                    "exit_reason": exit_reason,
                    "holding_bars": holding_bars,
                    "return_pct": return_pct,
                }
            )

        frame = pd.DataFrame(trades)
        if frame.empty:
            return frame

        numeric_columns = [
            "previous_close",
            "entry_price",
            "target_price",
            "stop_price",
            "gap_lower_price",
            "gap_upper_price",
            "gap_size",
            "gap_pct",
            "exit_price",
            "return_pct",
        ]
        for column in numeric_columns:
            frame[column] = pd.to_numeric(frame[column], errors="coerce")
        frame["holding_bars"] = pd.to_numeric(frame["holding_bars"], errors="raise").astype(int)
        frame["days_to_fill"] = pd.array(frame["days_to_fill"], dtype="Int64")
        frame["gap_filled_within_horizon"] = frame["gap_filled_within_horizon"].astype(bool)
        return frame

    def _stop_price(
        self,
        trade_direction: str,
        entry_price: float,
        gap_size: float,
    ) -> Optional[float]:
        if self.stop_gap_multiple is None:
            return None
        distance = gap_size * self.stop_gap_multiple
        if trade_direction == "short":
            return entry_price + distance
        return entry_price - distance

    @staticmethod
    def _target_hit(trade_direction: str, bar: pd.Series, target_price: float) -> bool:
        if trade_direction == "short":
            return float(bar["low"]) <= target_price
        return float(bar["high"]) >= target_price

    @staticmethod
    def _stop_hit(
        trade_direction: str,
        bar: pd.Series,
        stop_price: Optional[float],
    ) -> bool:
        if stop_price is None:
            return False
        if trade_direction == "short":
            return float(bar["high"]) >= stop_price
        return float(bar["low"]) <= stop_price

    @staticmethod
    def _return_pct(trade_direction: str, entry_price: float, exit_price: float) -> float:
        if trade_direction == "short":
            return ((entry_price - exit_price) / entry_price) * 100.0
        return ((exit_price - entry_price) / entry_price) * 100.0


def study_gap_fills(
    symbol: str,
    prices: pd.DataFrame,
    min_gap_pct: float,
    horizons: tuple[int, ...] = (1, 5, 20, 60),
) -> pd.DataFrame:
    rows = []
    last_index = len(prices) - 1

    for index in range(1, len(prices)):
        signal = _build_gap_signal(previous=prices.iloc[index - 1], current=prices.iloc[index], min_gap_pct=min_gap_pct)
        if signal is None:
            continue

        row: Dict[str, Any] = {
            "symbol": symbol,
            "signal_date": prices.index[index].strftime("%Y-%m-%d"),
            "gap_direction": signal["gap_direction"],
            "gap_pct": signal["gap_pct"],
        }
        for horizon in horizons:
            horizon_end = min(last_index, index + horizon)
            filled = False
            for future_index in range(index + 1, horizon_end + 1):
                if _target_hit_static(signal["trade_direction"], prices.iloc[future_index], signal["target_price"]):
                    filled = True
                    break
            row[f"fills_within_{horizon}d"] = filled
        rows.append(row)

    return pd.DataFrame(rows)


def _build_gap_signal(previous: pd.Series, current: pd.Series, min_gap_pct: float) -> Optional[Dict[str, Any]]:
    gap_direction: Optional[str] = None
    trade_direction: Optional[str] = None
    gap_lower: Optional[float] = None
    gap_upper: Optional[float] = None
    target_price: Optional[float] = None

    if float(current["low"]) > float(previous["high"]):
        gap_direction = "up"
        trade_direction = "short"
        gap_lower = float(previous["high"])
        gap_upper = float(current["low"])
        target_price = gap_lower
    elif float(current["high"]) < float(previous["low"]):
        gap_direction = "down"
        trade_direction = "long"
        gap_lower = float(current["high"])
        gap_upper = float(previous["low"])
        target_price = gap_upper

    if gap_direction is None or target_price is None:
        return None

    previous_close = float(previous["close"])
    gap_size = gap_upper - gap_lower
    gap_pct = (gap_size / previous_close) * 100.0 if previous_close else 0.0
    if gap_pct < min_gap_pct:
        return None

    return {
        "gap_direction": gap_direction,
        "trade_direction": trade_direction,
        "previous_close": previous_close,
        "gap_lower_price": gap_lower,
        "gap_upper_price": gap_upper,
        "gap_size": gap_size,
        "gap_pct": gap_pct,
        "target_price": target_price,
    }


def _target_hit_static(trade_direction: str, bar: pd.Series, target_price: float) -> bool:
    if trade_direction == "short":
        return float(bar["low"]) <= target_price
    return float(bar["high"]) >= target_price
