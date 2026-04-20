from __future__ import annotations

import json
from pathlib import Path

import pandas as pd
import yfinance as yf


def cache_path(root: Path, ticker: str) -> Path:
    safe = ticker.replace("/", "-")
    return root / f"{safe}.parquet"


def load_cached(root: Path, ticker: str) -> pd.DataFrame | None:
    p = cache_path(root, ticker)
    if not p.exists():
        return None
    df = pd.read_parquet(p)
    df.index = pd.to_datetime(df.index).tz_localize(None)
    return df.sort_index()


def download_symbol(
    ticker: str, start: str, end: str, cache_dir: Path, progress: bool = False
) -> pd.DataFrame | None:
    """Download daily OHLC via yfinance; write parquet cache. Returns None on failure."""
    cache_dir.mkdir(parents=True, exist_ok=True)
    try:
        t = yf.Ticker(ticker)
        df = t.history(start=start, end=end, auto_adjust=False, actions=False)
    except Exception:
        return None
    if df is None or df.empty:
        return None
    df = df.rename(
        columns={
            "Open": "open",
            "High": "high",
            "Low": "low",
            "Close": "close",
            "Volume": "volume",
        }
    )
    keep = [c for c in ("open", "high", "low", "close", "volume") if c in df.columns]
    df = df[keep].copy()
    df.index = pd.to_datetime(df.index).tz_localize(None)
    df = df.sort_index()
    df.to_parquet(cache_path(cache_dir, ticker))
    if progress:
        print(f"  ok {ticker} ({len(df)} rows)")
    return df


def fetch_universe(
    tickers: list[str],
    start: str,
    end: str,
    cache_dir: Path,
    progress: bool = True,
) -> dict[str, str]:
    """Download all symbols; returns status map ticker -> ok|empty|error."""
    status: dict[str, str] = {}
    for i, t in enumerate(tickers):
        if progress:
            print(f"[{i+1}/{len(tickers)}] {t}")
        prev = load_cached(cache_dir, t)
        if prev is not None and len(prev) > 100:
            # Refresh if range might extend; for simplicity re-download always in fetch
            pass
        df = download_symbol(t, start, end, cache_dir, progress=progress)
        if df is None:
            status[t] = "error"
        elif len(df) < 20:
            status[t] = "empty"
        else:
            status[t] = "ok"
    return status


def write_fetch_report(path: Path, status: dict[str, str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(status, indent=2), encoding="utf-8")
