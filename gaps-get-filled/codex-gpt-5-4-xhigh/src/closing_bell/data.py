from __future__ import annotations

import logging
import time
from datetime import date, timedelta
from pathlib import Path

import pandas as pd

log = logging.getLogger(__name__)

CACHE_DIR = Path("data/cache")


def _cache_path(symbol: str) -> Path:
    return CACHE_DIR / f"{symbol}.csv"


def _normalize(df: pd.DataFrame) -> pd.DataFrame:
    normalized = df.rename(columns={column: column.lower().replace(" ", "_") for column in df.columns})
    keep = [column for column in ("open", "high", "low", "close", "adj_close", "volume") if column in normalized.columns]
    normalized = normalized[keep].copy()
    normalized.index = pd.to_datetime(normalized.index).tz_localize(None)
    normalized.index.name = "date"
    return normalized.sort_index()


def _load_cached(symbol: str) -> pd.DataFrame | None:
    path = _cache_path(symbol)
    if not path.exists():
        return None
    try:
        frame = pd.read_csv(path, index_col="date", parse_dates=["date"])
    except Exception as exc:
        log.warning("cache read failed for %s: %s", symbol, exc)
        return None
    frame.index = pd.to_datetime(frame.index).tz_localize(None)
    return frame.sort_index()


def _save_cached(symbol: str, df: pd.DataFrame) -> None:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    df.to_csv(_cache_path(symbol))


def _download_batch(symbols: list[str], start: date, end: date) -> dict[str, pd.DataFrame]:
    import yfinance as yf

    if not symbols:
        return {}

    downloaded = yf.download(
        symbols,
        start=start.isoformat(),
        end=(end + timedelta(days=1)).isoformat(),
        auto_adjust=False,
        group_by="ticker",
        progress=False,
        threads=True,
    )
    outputs: dict[str, pd.DataFrame] = {}
    if isinstance(downloaded.columns, pd.MultiIndex):
        level0 = set(downloaded.columns.get_level_values(0))
        for symbol in symbols:
            if symbol not in level0:
                continue
            frame = downloaded[symbol].dropna(how="all")
            if not frame.empty:
                outputs[symbol] = _normalize(frame)
    else:
        frame = downloaded.dropna(how="all")
        if not frame.empty:
            outputs[symbols[0]] = _normalize(frame)
    return outputs


def fetch_prices(
    symbols: list[str],
    start: date,
    end: date,
    *,
    batch_size: int = 40,
    force_refresh: bool = False,
    sleep_between_batches: float = 0.2,
) -> dict[str, pd.DataFrame]:
    outputs: dict[str, pd.DataFrame] = {}
    to_fetch: list[str] = []

    for symbol in symbols:
        cached = None if force_refresh else _load_cached(symbol)
        if cached is None or cached.empty:
            to_fetch.append(symbol)
            continue
        if cached.index.min().date() > start or cached.index.max().date() < (end - timedelta(days=5)):
            to_fetch.append(symbol)
            continue
        mask = (cached.index.date >= start) & (cached.index.date <= end)
        outputs[symbol] = cached.loc[mask].copy()

    log.info("price cache: %d warm, %d missing", len(outputs), len(to_fetch))

    for offset in range(0, len(to_fetch), batch_size):
        batch = to_fetch[offset : offset + batch_size]
        if not batch:
            continue
        chunk_no = offset // batch_size + 1
        chunk_total = (len(to_fetch) + batch_size - 1) // batch_size
        log.info("downloading batch %d/%d (%d symbols)", chunk_no, chunk_total, len(batch))
        batch_frames = _download_batch(batch, start, end)
        for symbol, frame in batch_frames.items():
            _save_cached(symbol, frame)
            outputs[symbol] = frame
        missing = sorted(set(batch) - set(batch_frames))
        if missing:
            log.warning("missing price history for %d symbols; first few: %s", len(missing), ", ".join(missing[:10]))
        if sleep_between_batches:
            time.sleep(sleep_between_batches)

    return outputs

