import pandas as pd

from gpt_5_4_backtesting.grid_search import run_gap_fill_grid_search
from gpt_5_4_backtesting.models import BacktestResult
from gpt_5_4_backtesting.reporting import summarize_trades_by_symbol


def test_grid_search_prioritizes_configs_meeting_min_trade_threshold(monkeypatch) -> None:
    def fake_run_backtest(symbols, strategy, start, end, use_cache=True):
        trade_count = 30 if strategy.max_hold_days == 5 else 5
        avg_return_pct = 2.0 if strategy.max_hold_days == 5 else 10.0
        summary = {
            "symbol_count": len(symbols),
            "symbols_with_data": len(symbols),
            "skipped_symbols": {},
            "rows_by_symbol": {symbol: 100 for symbol in symbols},
            "trade_count": trade_count,
            "fill_rate_pct": 40.0 + strategy.min_gap_pct,
            "win_rate_pct": 50.0,
            "avg_return_pct": avg_return_pct,
            "median_return_pct": avg_return_pct,
            "trade_sharpe": avg_return_pct / 10.0,
            "trade_return_std_pct": 10.0,
            "avg_win_pct": avg_return_pct + 1.0,
            "avg_loss_pct": avg_return_pct - 1.0,
            "avg_gap_pct": strategy.min_gap_pct,
            "avg_holding_bars": float(strategy.max_hold_days),
            "median_days_to_fill": 2.0,
            "timeout_count": 1,
            "stop_count": 0,
        }
        return BacktestResult(
            strategy_name=strategy.name,
            parameters=strategy.parameters(),
            trades=pd.DataFrame(),
            summary=summary,
            symbols=symbols,
        )

    monkeypatch.setattr("gpt_5_4_backtesting.grid_search.run_backtest", fake_run_backtest)

    result = run_gap_fill_grid_search(
        symbols=["SPY", "QQQ"],
        start="2020-01-01",
        end="2021-01-01",
        min_gap_pcts=[0.5, 1.0],
        max_hold_days_values=[3, 5],
        stop_gap_multiples=[None],
        sort_by="avg_return_pct",
        min_trades=20,
        use_cache=True,
    )

    assert len(result.results) == 4
    assert bool(result.results.iloc[0]["meets_min_trades"]) is True
    assert int(result.results.iloc[0]["max_hold_days"]) == 5
    assert float(result.results.iloc[-1]["avg_return_pct"]) == 10.0
    assert bool(result.results.iloc[-1]["meets_min_trades"]) is False


def test_summarize_trades_by_symbol_rolls_up_metrics() -> None:
    trades = pd.DataFrame(
        [
            {
                "symbol": "AAA",
                "gap_filled_within_horizon": True,
                "return_pct": 2.0,
                "gap_pct": 1.5,
                "holding_bars": 2,
            },
            {
                "symbol": "AAA",
                "gap_filled_within_horizon": False,
                "return_pct": -1.0,
                "gap_pct": 2.5,
                "holding_bars": 4,
            },
            {
                "symbol": "BBB",
                "gap_filled_within_horizon": True,
                "return_pct": 3.0,
                "gap_pct": 1.0,
                "holding_bars": 1,
            },
        ]
    )

    by_symbol = summarize_trades_by_symbol(trades)

    aaa = by_symbol.loc[by_symbol["symbol"] == "AAA"].iloc[0]
    bbb = by_symbol.loc[by_symbol["symbol"] == "BBB"].iloc[0]

    assert int(aaa["trade_count"]) == 2
    assert float(aaa["fill_rate_pct"]) == 50.0
    assert float(aaa["avg_return_pct"]) == 0.5
    assert float(aaa["avg_holding_bars"]) == 3.0
    assert int(bbb["trade_count"]) == 1
    assert float(bbb["win_rate_pct"]) == 100.0
