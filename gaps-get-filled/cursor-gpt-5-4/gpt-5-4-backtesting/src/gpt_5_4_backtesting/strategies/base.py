from __future__ import annotations

from typing import Any, Dict, Protocol

import pandas as pd


class Strategy(Protocol):
    name: str

    def parameters(self) -> Dict[str, Any]:
        ...

    def run(self, symbol: str, prices: pd.DataFrame) -> pd.DataFrame:
        ...
