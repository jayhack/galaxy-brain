"""Trade- and equity-level performance metrics."""

from __future__ import annotations

from typing import Dict

import numpy as np
import pandas as pd


def summarize_trades(trades: pd.DataFrame) -> Dict[str, float]:
    if trades.empty:
        return {"n_trades": 0}
    wins = (trades["net_pnl_usd"] > 0).sum()
    losses = (trades["net_pnl_usd"] < 0).sum()
    return {
        "n_trades": int(len(trades)),
        "n_wins": int(wins),
        "n_losses": int(losses),
        "win_rate": float(wins / len(trades)),
        "avg_return_pct": float(trades["net_return"].mean() * 100),
        "median_return_pct": float(trades["net_return"].median() * 100),
        "best_return_pct": float(trades["net_return"].max() * 100),
        "worst_return_pct": float(trades["net_return"].min() * 100),
        "total_net_pnl_usd": float(trades["net_pnl_usd"].sum()),
        "avg_bars_held": float(trades["bars_held"].mean()),
        "pct_target": float((trades["exit_reason"] == "target").mean() * 100),
        "pct_stop": float((trades["exit_reason"] == "stop").mean() * 100),
        "pct_time_stop": float((trades["exit_reason"] == "time_stop").mean() * 100),
    }


def equity_curve(trades: pd.DataFrame) -> pd.DataFrame:
    """Rough equity curve: stamp each trade's PnL at its exit date and cumsum.

    This is *not* a real portfolio — positions can overlap and compound
    notionally, but since our position size is fixed USD notional and trades
    are independent, treating this as additive PnL is a fair first look.
    """
    if trades.empty:
        return pd.DataFrame(columns=["date", "net_pnl_usd", "cum_pnl_usd"])
    s = trades.sort_values("exit_date").groupby("exit_date", as_index=False)["net_pnl_usd"].sum()
    s = s.rename(columns={"exit_date": "date"})
    s["cum_pnl_usd"] = s["net_pnl_usd"].cumsum()
    return s


def max_drawdown(equity: pd.DataFrame) -> float:
    if equity.empty:
        return 0.0
    cum = equity["cum_pnl_usd"].values
    peak = np.maximum.accumulate(cum)
    dd = cum - peak
    return float(dd.min())


def sharpe_from_trade_returns(trades: pd.DataFrame, periods_per_year: int = 252) -> float:
    """Trade-level Sharpe: mean / std of net_return, scaled to annual.

    Intentionally approximate: treats each trade as a sample and annualizes
    by trades-per-year implied by the average bars_held. Real Sharpe would
    come from a daily equity time series; we'll add that when we layer on a
    portfolio model.
    """
    if trades.empty or len(trades) < 2:
        return 0.0
    r = trades["net_return"].values
    mu = r.mean()
    sd = r.std(ddof=1)
    if sd == 0:
        return 0.0
    avg_hold = max(1.0, float(trades["bars_held"].mean()))
    trades_per_year = periods_per_year / avg_hold
    return float((mu / sd) * np.sqrt(trades_per_year))


def diagnostic_summary(gap_fills: pd.DataFrame, horizons: list[int]) -> Dict[str, float]:
    """For every detected gap, what fraction fill by each horizon?"""
    if gap_fills.empty:
        return {"n_gaps": 0}
    out = {"n_gaps": int(len(gap_fills))}
    for h in horizons:
        col = f"fill_by_{h}d"
        if col in gap_fills.columns:
            out[f"fill_rate_{h}d_pct"] = float(gap_fills[col].mean() * 100)
    return out
