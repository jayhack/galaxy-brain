"""Config loading + param schema.

Keeps a tiny dataclass tree instead of passing dicts everywhere, so that new
params surface as AttributeErrors rather than silent KeyErrors.
"""

from __future__ import annotations

import dataclasses
from dataclasses import dataclass, field
from datetime import date, timedelta
from pathlib import Path
from typing import Any, List, Optional, Union

import yaml


@dataclass
class GapParams:
    type: str = "strict"
    min_gap_pct: float = 0.005
    direction: str = "both"  # "up" | "down" | "both"
    fill_horizons: List[int] = field(default_factory=lambda: [1, 5, 20, 60])


@dataclass
class TradeParams:
    enabled: bool = True
    time_stop_days: int = 20
    stop_loss_pct: float = 0.02
    position_size_usd: float = 10_000.0
    allow_short: bool = True
    commission_bps: float = 1.0
    slippage_bps: float = 2.0


@dataclass
class OutputParams:
    results_dir: str = "results/runs"
    run_name: Optional[str] = None


@dataclass
class Config:
    universe: Union[str, List[str]] = "sp500"
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    years: int = 10
    gap: GapParams = field(default_factory=GapParams)
    trade: TradeParams = field(default_factory=TradeParams)
    output: OutputParams = field(default_factory=OutputParams)

    def resolved_dates(self) -> tuple[date, date]:
        end = date.fromisoformat(self.end_date) if self.end_date else date.today()
        if self.start_date:
            start = date.fromisoformat(self.start_date)
        else:
            start = end - timedelta(days=self.years * 365)
        return start, end


def _merge(base: dict, override: dict) -> dict:
    """Shallow-then-nested merge — override wins; nested dicts are merged not replaced."""
    out = dict(base)
    for k, v in override.items():
        if v is None:
            continue
        if isinstance(v, dict) and isinstance(out.get(k), dict):
            out[k] = _merge(out[k], v)
        else:
            out[k] = v
    return out


def load_config(path: Optional[str] = None, overrides: Optional[dict] = None) -> Config:
    """Load YAML config, overlay CLI overrides, and materialize a Config.

    Unknown keys fail loudly so typos surface immediately.
    """
    data: dict[str, Any] = {}
    if path:
        with open(path) as f:
            data = yaml.safe_load(f) or {}
    if overrides:
        data = _merge(data, overrides)

    gap = GapParams(**(data.pop("gap", {}) or {}))
    trade = TradeParams(**(data.pop("trade", {}) or {}))
    output = OutputParams(**(data.pop("output", {}) or {}))
    return Config(gap=gap, trade=trade, output=output, **data)


def config_to_dict(cfg: Config) -> dict:
    return dataclasses.asdict(cfg)


def save_config(cfg: Config, path: str | Path) -> None:
    Path(path).write_text(yaml.safe_dump(config_to_dict(cfg), sort_keys=False))
