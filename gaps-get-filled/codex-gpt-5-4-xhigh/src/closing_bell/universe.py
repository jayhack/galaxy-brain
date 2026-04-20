from __future__ import annotations

from collections.abc import Iterable
from io import StringIO

import pandas as pd
import requests

SP500_WIKI_URL = "https://en.wikipedia.org/wiki/List_of_S%26P_500_companies"


def sp500_tickers() -> list[str]:
    response = requests.get(
        SP500_WIKI_URL,
        headers={"User-Agent": "Mozilla/5.0 (compatible; ClosingBell/0.1)"},
        timeout=30,
    )
    response.raise_for_status()
    tables = pd.read_html(StringIO(response.text))
    tickers = (
        tables[0]["Symbol"]
        .astype(str)
        .str.upper()
        .str.replace(".", "-", regex=False)
        .tolist()
    )
    return sorted(set(tickers))


def resolve_universe(name: str | None, tickers: Iterable[str] | None = None) -> list[str]:
    if tickers:
        return sorted({ticker.strip().upper() for ticker in tickers if ticker.strip()})
    if not name:
        raise ValueError("either a named universe or an explicit ticker list is required")
    if name.lower() == "sp500":
        return sp500_tickers()
    return [name.upper()]
