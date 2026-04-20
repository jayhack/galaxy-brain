from __future__ import annotations

from pathlib import Path
from typing import Iterable

import pandas as pd
import yfinance as yf


REQUIRED_COLUMNS = ("open", "high", "low", "close", "volume")
KNOWN_PRICE_COLUMNS = set(REQUIRED_COLUMNS) | {"adj close"}


def load_ohlcv(
    symbol: str,
    start: str,
    end: str,
    use_cache: bool = True,
) -> pd.DataFrame:
    cache_path = _cache_path(symbol=symbol, start=start, end=end)
    if use_cache and cache_path.exists():
        frame = pd.read_csv(cache_path, index_col="date", parse_dates=["date"])
        return _finalize_price_frame(frame)

    frame = yf.download(
        symbol,
        start=start,
        end=end,
        interval="1d",
        auto_adjust=False,
        progress=False,
        threads=False,
    )
    if frame.empty:
        raise ValueError(f"No data returned for {symbol}")

    normalized = _normalize_columns(frame)
    missing = [column for column in REQUIRED_COLUMNS if column not in normalized.columns]
    if missing:
        raise ValueError(f"{symbol} is missing columns: {', '.join(missing)}")

    normalized = normalized.loc[:, list(REQUIRED_COLUMNS)].copy()
    normalized.index = _to_naive_datetime_index(normalized.index)
    normalized.index.name = "date"
    normalized.sort_index(inplace=True)
    normalized.dropna(inplace=True)

    cache_path.parent.mkdir(parents=True, exist_ok=True)
    normalized.to_csv(cache_path)
    return normalized


def prefetch_ohlcv(symbols: Iterable[str], start: str, end: str) -> dict[str, int]:
    rows_by_symbol = {}
    for symbol in normalize_symbols(symbols):
        frame = load_ohlcv(symbol=symbol, start=start, end=end, use_cache=True)
        rows_by_symbol[symbol] = int(len(frame))
    return rows_by_symbol


def _normalize_columns(frame: pd.DataFrame) -> pd.DataFrame:
    normalized = frame.copy()
    if isinstance(normalized.columns, pd.MultiIndex):
        flattened = []
        for column in normalized.columns:
            parts = [str(part).strip().lower() for part in column if str(part).strip()]
            preferred = next((part for part in parts if part in KNOWN_PRICE_COLUMNS), None)
            flattened.append(preferred or (parts[0] if parts else ""))
        normalized.columns = flattened
    else:
        normalized.columns = [str(column).strip().lower() for column in normalized.columns]

    if "adj close" in normalized.columns and "close" not in normalized.columns:
        normalized.rename(columns={"adj close": "close"}, inplace=True)
    return normalized


def _finalize_price_frame(frame: pd.DataFrame) -> pd.DataFrame:
    finalized = frame.copy()
    finalized.index = _to_naive_datetime_index(finalized.index)
    finalized.index.name = "date"
    finalized.sort_index(inplace=True)
    return finalized


def _cache_path(symbol: str, start: str, end: str) -> Path:
    safe_symbol = symbol.replace("/", "-").replace("^", "")
    return project_root() / "data" / "cache" / f"{safe_symbol}_{start}_{end}.csv"


def project_root() -> Path:
    return Path(__file__).resolve().parents[2]


def normalize_symbols(symbols: Iterable[str]) -> list[str]:
    cleaned = []
    for symbol in symbols:
        normalized = symbol.strip().upper()
        if normalized:
            cleaned.append(normalized)
    return cleaned


def _to_naive_datetime_index(index_like) -> pd.DatetimeIndex:
    index = pd.to_datetime(index_like)
    if getattr(index, "tz", None) is not None:
        return index.tz_convert(None)
    return index
