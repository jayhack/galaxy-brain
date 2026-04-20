from __future__ import annotations

from pathlib import Path
from typing import Optional

import pandas as pd

from gpt_5_4_backtesting.data import normalize_symbols, project_root


SP500_CSV_URLS = [
    "https://raw.githubusercontent.com/datasets/s-and-p-500-companies/main/data/constituents.csv",
    "https://raw.githubusercontent.com/datasets/s-and-p-500-companies/master/data/constituents.csv",
]


def resolve_universe(universe: Optional[str], symbols_csv: Optional[str]) -> list[str]:
    symbols = []
    if universe:
        normalized_universe = universe.strip().lower()
        if normalized_universe == "sp500":
            symbols.extend(get_sp500_symbols())
        else:
            raise ValueError(f"Unsupported universe '{universe}'")

    if symbols_csv:
        symbols.extend(normalize_symbols(symbols_csv.split(",")))

    resolved = normalize_symbols(symbols)
    if not resolved:
        raise ValueError("Provide either --universe sp500 or --symbols AAPL,MSFT,...")
    return sorted(dict.fromkeys(resolved))


def get_sp500_symbols(refresh: bool = False) -> list[str]:
    cache_path = project_root() / "data" / "universes" / "sp500.csv"
    if cache_path.exists() and not refresh:
        frame = pd.read_csv(cache_path)
        return normalize_symbols(frame["symbol"].tolist())

    frame = None
    last_error = None
    for url in SP500_CSV_URLS:
        try:
            frame = pd.read_csv(url)
            break
        except Exception as exc:
            last_error = exc

    if frame is None:
        raise RuntimeError("Unable to fetch S&P 500 constituents") from last_error

    source_column = "Symbol" if "Symbol" in frame.columns else "symbol"
    symbols = normalize_symbols(frame[source_column].astype(str).str.replace(".", "-", regex=False).tolist())
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    pd.DataFrame({"symbol": symbols}).to_csv(cache_path, index=False)
    return symbols
