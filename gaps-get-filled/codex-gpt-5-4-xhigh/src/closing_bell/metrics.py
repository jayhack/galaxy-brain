from __future__ import annotations

import math

import numpy as np
import pandas as pd


def fill_summary(gaps: pd.DataFrame, horizons: list[int]) -> dict[str, float]:
    summary: dict[str, float] = {"n_gaps": int(len(gaps))}
    if gaps.empty:
        return summary
    filled = gaps["days_to_fill"].notna()
    summary["eventual_fill_rate_pct"] = float(filled.mean() * 100)
    summary["median_days_to_fill"] = float(gaps.loc[filled, "days_to_fill"].median()) if filled.any() else math.nan
    summary["median_gap_pct"] = float(gaps["gap_pct"].median() * 100)
    summary["mean_gap_pct"] = float(gaps["gap_pct"].mean() * 100)
    for horizon in horizons:
        column = f"fill_by_{horizon}d"
        if column in gaps.columns:
            summary[f"fill_rate_{horizon}d_pct"] = float(gaps[column].mean() * 100)
    return summary


def summarize_trades(trades: pd.DataFrame) -> dict[str, float]:
    if trades.empty:
        return {"n_trades": 0}
    wins = trades["net_pnl_usd"] > 0
    losses = trades["net_pnl_usd"] < 0
    return {
        "n_trades": int(len(trades)),
        "win_rate_pct": float(wins.mean() * 100),
        "loss_rate_pct": float(losses.mean() * 100),
        "avg_return_pct": float(trades["net_return"].mean() * 100),
        "median_return_pct": float(trades["net_return"].median() * 100),
        "best_return_pct": float(trades["net_return"].max() * 100),
        "worst_return_pct": float(trades["net_return"].min() * 100),
        "avg_bars_held": float(trades["bars_held"].mean()),
        "median_bars_held": float(trades["bars_held"].median()),
        "total_net_pnl_usd": float(trades["net_pnl_usd"].sum()),
        "pct_target": float((trades["exit_reason"] == "target").mean() * 100),
        "pct_stop": float((trades["exit_reason"] == "stop").mean() * 100),
        "pct_time_stop": float((trades["exit_reason"] == "time_stop").mean() * 100),
    }


def equity_curve(trades: pd.DataFrame) -> pd.DataFrame:
    if trades.empty:
        return pd.DataFrame(columns=["date", "net_pnl_usd", "cum_pnl_usd"])
    equity = (
        trades.sort_values("exit_date")
        .groupby("exit_date", as_index=False)["net_pnl_usd"]
        .sum()
        .rename(columns={"exit_date": "date"})
    )
    equity["cum_pnl_usd"] = equity["net_pnl_usd"].cumsum()
    return equity


def max_drawdown_usd(equity: pd.DataFrame) -> float:
    if equity.empty:
        return 0.0
    values = equity["cum_pnl_usd"].to_numpy()
    peaks = np.maximum.accumulate(values)
    return float((values - peaks).min())


def trade_sharpe(trades: pd.DataFrame, trading_days_per_year: int = 252) -> float:
    if trades.empty or len(trades) < 2:
        return 0.0
    returns = trades["net_return"].to_numpy()
    volatility = returns.std(ddof=1)
    if volatility == 0:
        return 0.0
    avg_hold = max(1.0, float(trades["bars_held"].mean()))
    samples_per_year = trading_days_per_year / avg_hold
    return float(returns.mean() / volatility * math.sqrt(samples_per_year))

