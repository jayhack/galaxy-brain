"""Universe listing + cached OHLC download.

Prices are cached as per-symbol parquet files under data/cache/. Re-running the
fetch is cheap — we only download symbols whose cache is missing or stale.
"""

from __future__ import annotations

import logging
import time
from datetime import date, timedelta
from pathlib import Path
from typing import Iterable, List, Optional

import pandas as pd

log = logging.getLogger(__name__)

CACHE_DIR = Path("data/cache")
SP500_WIKI_URL = "https://en.wikipedia.org/wiki/List_of_S%26P_500_companies"


def sp500_tickers() -> List[str]:
    """Pull the current S&P 500 constituents from Wikipedia.

    yfinance uses "-" in place of "." in class-share tickers (BRK.B -> BRK-B),
    so we normalize here.
    """
    tables = pd.read_html(SP500_WIKI_URL)
    df = tables[0]
    symbols = df["Symbol"].astype(str).str.replace(".", "-", regex=False).tolist()
    return sorted(set(symbols))


def resolve_universe(universe: str | Iterable[str]) -> List[str]:
    if isinstance(universe, str):
        if universe.lower() == "sp500":
            return sp500_tickers()
        return [universe.upper()]
    return [s.upper() for s in universe]


def _cache_path(symbol: str) -> Path:
    return CACHE_DIR / f"{symbol}.parquet"


def _load_cached(symbol: str) -> Optional[pd.DataFrame]:
    p = _cache_path(symbol)
    if not p.exists():
        return None
    try:
        return pd.read_parquet(p)
    except Exception as e:  # corrupt cache — refetch
        log.warning("cache read failed for %s: %s", symbol, e)
        return None


def _save_cached(symbol: str, df: pd.DataFrame) -> None:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    df.to_parquet(_cache_path(symbol))


def _download_batch(symbols: List[str], start: date, end: date) -> dict[str, pd.DataFrame]:
    """Download a batch of symbols from yfinance. Returns {symbol: df}."""
    import yfinance as yf

    # end is exclusive in yfinance; bump by a day to include `end`.
    data = yf.download(
        symbols,
        start=start.isoformat(),
        end=(end + timedelta(days=1)).isoformat(),
        auto_adjust=False,
        progress=False,
        group_by="ticker",
        threads=True,
    )
    out: dict[str, pd.DataFrame] = {}
    if isinstance(data.columns, pd.MultiIndex):
        for sym in symbols:
            if sym not in data.columns.get_level_values(0):
                continue
            df = data[sym].dropna(how="all")
            if len(df):
                out[sym] = _normalize(df)
    else:
        # single-symbol path
        df = data.dropna(how="all")
        if len(df):
            out[symbols[0]] = _normalize(df)
    return out


def _normalize(df: pd.DataFrame) -> pd.DataFrame:
    df = df.rename(columns={c: c.lower().replace(" ", "_") for c in df.columns})
    # keep the canonical set only; ignore whatever else yfinance returns.
    keep = [c for c in ("open", "high", "low", "close", "adj_close", "volume") if c in df.columns]
    df = df[keep].copy()
    df.index = pd.to_datetime(df.index).tz_localize(None)
    df.index.name = "date"
    return df


def fetch_prices(
    symbols: Iterable[str],
    start: date,
    end: date,
    batch_size: int = 50,
    force_refresh: bool = False,
    sleep_between_batches: float = 0.0,
) -> dict[str, pd.DataFrame]:
    """Return {symbol: DataFrame(OHLCV)} using local cache when fresh.

    A cache is considered fresh if it spans [start, end] — i.e. its min date is
    <= start and its max date is >= end - a small buffer for holidays/weekends.
    """
    symbols = list(symbols)
    result: dict[str, pd.DataFrame] = {}
    to_fetch: List[str] = []

    if not force_refresh:
        for s in symbols:
            df = _load_cached(s)
            if df is None or len(df) == 0:
                to_fetch.append(s)
                continue
            # 7-day slack on the tail for weekends/holidays
            if df.index.min().date() > start or df.index.max().date() < (end - timedelta(days=7)):
                to_fetch.append(s)
            else:
                # slice to requested range
                mask = (df.index.date >= start) & (df.index.date <= end)
                result[s] = df.loc[mask]
    else:
        to_fetch = list(symbols)

    log.info("fetch_prices: %d cached, %d to download", len(result), len(to_fetch))

    for i in range(0, len(to_fetch), batch_size):
        batch = to_fetch[i : i + batch_size]
        log.info("downloading batch %d/%d (%d symbols)", i // batch_size + 1,
                 (len(to_fetch) + batch_size - 1) // batch_size, len(batch))
        got = _download_batch(batch, start, end)
        for sym, df in got.items():
            _save_cached(sym, df)
            result[sym] = df
        missing = set(batch) - set(got)
        if missing:
            log.warning("no data returned for %d symbols: %s", len(missing), sorted(missing)[:10])
        if sleep_between_batches:
            time.sleep(sleep_between_batches)

    return result
