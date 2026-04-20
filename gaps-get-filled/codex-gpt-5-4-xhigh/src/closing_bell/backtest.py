from __future__ import annotations

from dataclasses import asdict, dataclass

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
    exit_reason: str
    bars_held: int
    position_size_usd: float
    gross_pnl_usd: float
    costs_usd: float
    net_pnl_usd: float
    net_return: float
    meta: dict[str, object]


def _costs(position_size_usd: float, commission_bps: float, slippage_bps: float) -> float:
    return 2 * position_size_usd * (commission_bps + slippage_bps) / 10_000.0


def run_single_symbol(
    df: pd.DataFrame,
    intents: list[TradeIntent],
    *,
    position_size_usd: float,
    commission_bps: float,
    slippage_bps: float,
) -> list[TradeResult]:
    if df.empty or not intents:
        return []

    idx = list(df.index)
    loc = {timestamp: position for position, timestamp in enumerate(idx)}
    opens = df["open"].to_numpy()
    highs = df["high"].to_numpy()
    lows = df["low"].to_numpy()
    closes = df["close"].to_numpy()
    results: list[TradeResult] = []

    for intent in intents:
        signal_pos = loc.get(intent.signal_date)
        if signal_pos is None or signal_pos + 1 >= len(idx):
            continue

        entry_pos = signal_pos + 1
        entry_price = float(opens[entry_pos])
        if entry_price <= 0:
            continue

        quantity = position_size_usd / entry_price
        exit_pos = min(len(idx) - 1, entry_pos + intent.time_stop_days)
        exit_price = float(closes[exit_pos])
        exit_reason = "time_stop"

        for bar in range(entry_pos, min(len(idx), entry_pos + intent.time_stop_days + 1)):
            opn = float(opens[bar])
            high = float(highs[bar])
            low = float(lows[bar])
            if intent.side == "short":
                if opn <= intent.target_price:
                    exit_pos = bar
                    exit_price = opn
                    exit_reason = "target"
                    break
                if opn >= intent.stop_price:
                    exit_pos = bar
                    exit_price = opn
                    exit_reason = "stop"
                    break
                if low <= intent.target_price:
                    exit_pos = bar
                    exit_price = float(intent.target_price)
                    exit_reason = "target"
                    break
                if high >= intent.stop_price:
                    exit_pos = bar
                    exit_price = float(intent.stop_price)
                    exit_reason = "stop"
                    break
            else:
                if opn >= intent.target_price:
                    exit_pos = bar
                    exit_price = opn
                    exit_reason = "target"
                    break
                if opn <= intent.stop_price:
                    exit_pos = bar
                    exit_price = opn
                    exit_reason = "stop"
                    break
                if high >= intent.target_price:
                    exit_pos = bar
                    exit_price = float(intent.target_price)
                    exit_reason = "target"
                    break
                if low <= intent.stop_price:
                    exit_pos = bar
                    exit_price = float(intent.stop_price)
                    exit_reason = "stop"
                    break
        else:
            exit_pos = min(len(idx) - 1, entry_pos + intent.time_stop_days)
            exit_price = float(closes[exit_pos])
            exit_reason = "time_stop" if exit_pos < len(idx) - 1 else "end_of_data"

        gross_pnl = (entry_price - exit_price) * quantity if intent.side == "short" else (exit_price - entry_price) * quantity
        costs = _costs(position_size_usd, commission_bps, slippage_bps)
        net_pnl = gross_pnl - costs
        results.append(
            TradeResult(
                symbol=intent.symbol,
                side=intent.side,
                signal_date=intent.signal_date,
                entry_date=pd.Timestamp(idx[entry_pos]),
                entry_price=entry_price,
                exit_date=pd.Timestamp(idx[exit_pos]),
                exit_price=exit_price,
                exit_reason=exit_reason,
                bars_held=exit_pos - entry_pos,
                position_size_usd=position_size_usd,
                gross_pnl_usd=gross_pnl,
                costs_usd=costs,
                net_pnl_usd=net_pnl,
                net_return=net_pnl / position_size_usd,
                meta=dict(intent.meta),
            )
        )

    return results


def trades_to_frame(trades: list[TradeResult]) -> pd.DataFrame:
    if not trades:
        return pd.DataFrame()
    rows = []
    for trade in trades:
        row = asdict(trade)
        meta = row.pop("meta", {})
        for key, value in meta.items():
            row[f"meta_{key}"] = value
        rows.append(row)
    return pd.DataFrame(rows)

