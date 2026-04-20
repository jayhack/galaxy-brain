from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List

import pandas as pd


@dataclass
class BacktestResult:
    strategy_name: str
    parameters: Dict[str, Any]
    trades: pd.DataFrame
    summary: Dict[str, Any]
    symbols: List[str]

    def summary_for_json(self) -> Dict[str, Any]:
        return {
            "strategy": self.strategy_name,
            "parameters": self.parameters,
            "symbols": self.symbols,
            "summary": self.summary,
        }


@dataclass
class GridSearchResult:
    strategy_name: str
    search_space: Dict[str, Any]
    sort_by: str
    min_trades: int
    results: pd.DataFrame
    symbols: List[str]

    def summary_for_json(self) -> Dict[str, Any]:
        best_result = None
        if not self.results.empty:
            best_result = self.results.iloc[0].to_dict()

        return {
            "strategy": self.strategy_name,
            "symbols": self.symbols,
            "sort_by": self.sort_by,
            "min_trades": self.min_trades,
            "search_space": self.search_space,
            "result_count": int(len(self.results)),
            "best_result": best_result,
        }
