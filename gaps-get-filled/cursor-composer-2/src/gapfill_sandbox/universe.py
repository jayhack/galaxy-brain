from __future__ import annotations

import io
import re
import urllib.request

import pandas as pd

_UA = "Mozilla/5.0 (compatible; gapfill-sandbox/0.1; +https://github.com/jayhack/galaxy-brain)"


def load_sp500_symbols() -> list[str]:
    """Return current S&P 500 tickers from Wikipedia (BRK.B → BRK-B for Yahoo)."""
    url = "https://en.wikipedia.org/wiki/List_of_S%26P_500_companies"
    req = urllib.request.Request(url, headers={"User-Agent": _UA})
    with urllib.request.urlopen(req, timeout=60) as resp:
        html_bytes = resp.read()
    tables = pd.read_html(io.BytesIO(html_bytes))
    table = tables[0]
    sym = table["Symbol"].astype(str).str.strip()
    sym = sym.str.replace(".", "-", regex=False)
    return sorted(sym.unique().tolist())


def parse_tickers_arg(raw: str | None) -> list[str] | None:
    if not raw:
        return None
    parts = re.split(r"[\s,;]+", raw.strip())
    return [p.upper() for p in parts if p]
