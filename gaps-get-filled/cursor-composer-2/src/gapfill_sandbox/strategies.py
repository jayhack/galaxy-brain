from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol, runtime_checkable


@dataclass
class StrategyContext:
    name: str
    description: str


@runtime_checkable
class Strategy(Protocol):
    """Pluggable strategy: implement `meta()` and optional hooks later."""

    def meta(self) -> StrategyContext: ...


class GapFillStrategy:
    """Primary hypothesis: strict range gaps tend to fill within N days."""

    def meta(self) -> StrategyContext:
        return StrategyContext(
            name="gap_fill",
            description="Strict candle-range gaps; fill when price retraces to prior bar extreme.",
        )


class NaiveMomentumStub:
    """Placeholder second strategy — documents extension point without extra logic."""

    def meta(self) -> StrategyContext:
        return StrategyContext(
            name="naive_momentum_stub",
            description="Reserved slot for a momentum/continuation strategy (not implemented).",
        )


REGISTRY: dict[str, type] = {
    "gap_fill": GapFillStrategy,
    "naive_momentum_stub": NaiveMomentumStub,
}


def resolve(names: list[str]) -> list[Strategy]:
    out: list[Strategy] = []
    for n in names:
        cls = REGISTRY.get(n)
        if cls is None:
            raise ValueError(f"Unknown strategy {n!r}. Known: {sorted(REGISTRY)}")
        out.append(cls())  # type: ignore[assignment]
    return out
