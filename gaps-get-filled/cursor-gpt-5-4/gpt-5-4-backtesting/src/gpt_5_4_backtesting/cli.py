from __future__ import annotations

from datetime import date, timedelta
from pathlib import Path
from typing import Optional

import typer
from rich.console import Console
from rich.table import Table

from gpt_5_4_backtesting.data import prefetch_ohlcv, project_root
from gpt_5_4_backtesting.engine import run_backtest, run_gap_fill_fill_study
from gpt_5_4_backtesting.grid_search import VALID_SORT_COLUMNS, run_gap_fill_grid_search
from gpt_5_4_backtesting.reporting import write_backtest_report, write_grid_search_report
from gpt_5_4_backtesting.strategies.gap_fill import GapFillStrategy
from gpt_5_4_backtesting.universes import resolve_universe


app = typer.Typer(add_completion=False, no_args_is_help=True)
console = Console()


@app.command()
def download(
    universe: Optional[str] = typer.Option(None, help="Named universe, currently: sp500"),
    symbols: Optional[str] = typer.Option(None, help="Comma-separated ticker list, e.g. AAPL,MSFT,NVDA"),
    start: Optional[str] = typer.Option(None, help="Inclusive start date in YYYY-MM-DD format"),
    end: Optional[str] = typer.Option(None, help="Exclusive end date in YYYY-MM-DD format"),
    years_back: Optional[int] = typer.Option(10, help="Alternative to explicit dates"),
) -> None:
    resolved_symbols = resolve_universe(universe=universe, symbols_csv=symbols)
    start_date, end_date = _resolve_dates(start=start, end=end, years_back=years_back)
    rows_by_symbol = prefetch_ohlcv(symbols=resolved_symbols, start=start_date, end=end_date)

    table = Table(title="Downloaded / Cached Daily Price Data")
    table.add_column("Metric")
    table.add_column("Value", justify="right")
    table.add_row("Universe size", str(len(resolved_symbols)))
    table.add_row("Date range", f"{start_date} to {end_date}")
    table.add_row("Symbols with rows", str(len(rows_by_symbol)))
    table.add_row("Total rows", str(sum(rows_by_symbol.values())))
    console.print(table)


@app.command()
def backtest(
    universe: Optional[str] = typer.Option(None, help="Named universe, currently: sp500"),
    symbols: Optional[str] = typer.Option(None, help="Comma-separated ticker list, e.g. AAPL,MSFT,NVDA"),
    start: Optional[str] = typer.Option(None, help="Inclusive start date in YYYY-MM-DD format"),
    end: Optional[str] = typer.Option(None, help="Exclusive end date in YYYY-MM-DD format"),
    years_back: Optional[int] = typer.Option(10, help="Alternative to explicit dates"),
    min_gap_pct: float = typer.Option(0.5, help="Minimum gap size as percent of prior close"),
    max_hold_days: int = typer.Option(5, help="Maximum trading days to wait for a fill"),
    stop_gap_multiple: Optional[float] = typer.Option(None, help="Optional stop as a multiple of gap size"),
    no_cache: bool = typer.Option(False, help="Disable local cache reuse"),
) -> None:
    resolved_symbols = resolve_universe(universe=universe, symbols_csv=symbols)
    start_date, end_date = _resolve_dates(start=start, end=end, years_back=years_back)
    strategy = GapFillStrategy(
        min_gap_pct=min_gap_pct,
        max_hold_days=max_hold_days,
        stop_gap_multiple=stop_gap_multiple,
    )
    result = run_backtest(
        symbols=resolved_symbols,
        strategy=strategy,
        start=start_date,
        end=end_date,
        use_cache=not no_cache,
    )
    _print_summary(result.summary)


@app.command()
def present(
    universe: Optional[str] = typer.Option(None, help="Named universe, currently: sp500"),
    symbols: Optional[str] = typer.Option(None, help="Comma-separated ticker list, e.g. AAPL,MSFT,NVDA"),
    start: Optional[str] = typer.Option(None, help="Inclusive start date in YYYY-MM-DD format"),
    end: Optional[str] = typer.Option(None, help="Exclusive end date in YYYY-MM-DD format"),
    years_back: Optional[int] = typer.Option(10, help="Alternative to explicit dates"),
    min_gap_pct: float = typer.Option(0.5, help="Minimum gap size as percent of prior close"),
    max_hold_days: int = typer.Option(5, help="Maximum trading days to wait for a fill"),
    stop_gap_multiple: Optional[float] = typer.Option(None, help="Optional stop as a multiple of gap size"),
    report_dir: Path = typer.Option(Path("results/runs/presentation"), help="Directory for report outputs"),
    html_mirror: Optional[Path] = typer.Option(None, help="Optional second HTML path, e.g. docs artifact mirror"),
    no_cache: bool = typer.Option(False, help="Disable local cache reuse"),
) -> None:
    resolved_symbols = resolve_universe(universe=universe, symbols_csv=symbols)
    start_date, end_date = _resolve_dates(start=start, end=end, years_back=years_back)
    strategy = GapFillStrategy(
        min_gap_pct=min_gap_pct,
        max_hold_days=max_hold_days,
        stop_gap_multiple=stop_gap_multiple,
    )
    result = run_backtest(
        symbols=resolved_symbols,
        strategy=strategy,
        start=start_date,
        end=end_date,
        use_cache=not no_cache,
    )
    fill_study = run_gap_fill_fill_study(
        symbols=resolved_symbols,
        start=start_date,
        end=end_date,
        min_gap_pct=min_gap_pct,
        use_cache=not no_cache,
    )
    output_dir = report_dir if report_dir.is_absolute() else project_root() / report_dir
    html_mirror_path = None
    if html_mirror is not None:
        html_mirror_path = html_mirror if html_mirror.is_absolute() else project_root() / html_mirror

    paths = write_backtest_report(
        result=result,
        output_dir=output_dir,
        start=start_date,
        end=end_date,
        fill_study=fill_study,
        html_mirror_path=html_mirror_path,
    )
    _print_summary(result.summary)
    console.print(f"\nSaved presentation to [bold]{paths['html']}[/bold]")
    if "html_mirror" in paths:
        console.print(f"Mirrored click-through HTML to [bold]{paths['html_mirror']}[/bold]")


@app.command("grid-search")
def grid_search(
    universe: Optional[str] = typer.Option(None, help="Named universe, currently: sp500"),
    symbols: Optional[str] = typer.Option(None, help="Comma-separated ticker list, e.g. AAPL,MSFT,NVDA"),
    start: Optional[str] = typer.Option(None, help="Inclusive start date in YYYY-MM-DD format"),
    end: Optional[str] = typer.Option(None, help="Exclusive end date in YYYY-MM-DD format"),
    years_back: Optional[int] = typer.Option(10, help="Alternative to explicit dates"),
    min_gap_pcts: str = typer.Option("0.5,1.0,1.5,2.0", help="Comma-separated minimum gap thresholds"),
    max_hold_days_grid: str = typer.Option("3,5,10", help="Comma-separated holding windows"),
    stop_gap_multiples: str = typer.Option("none,0.5,1.0", help="Comma-separated stop multiples"),
    sort_by: str = typer.Option("avg_return_pct", help="Metric to rank by"),
    min_trades: int = typer.Option(20, min=0, help="Minimum trades to treat a config as credible"),
    top_n: int = typer.Option(20, min=1, help="Top rows to include in the HTML leaderboard"),
    report_dir: Path = typer.Option(Path("results/grid-search"), help="Directory for grid-search outputs"),
    no_cache: bool = typer.Option(False, help="Disable local cache reuse"),
) -> None:
    resolved_symbols = resolve_universe(universe=universe, symbols_csv=symbols)
    start_date, end_date = _resolve_dates(start=start, end=end, years_back=years_back)
    sort_by = _validate_sort_by(sort_by)
    result = run_gap_fill_grid_search(
        symbols=resolved_symbols,
        start=start_date,
        end=end_date,
        min_gap_pcts=_parse_float_list(min_gap_pcts),
        max_hold_days_values=_parse_int_list(max_hold_days_grid),
        stop_gap_multiples=_parse_optional_float_list(stop_gap_multiples),
        sort_by=sort_by,
        min_trades=min_trades,
        use_cache=not no_cache,
    )
    _print_grid_search_preview(result.results, sort_by=sort_by, top_n=top_n)
    output_dir = report_dir if report_dir.is_absolute() else project_root() / report_dir
    paths = write_grid_search_report(result=result, output_dir=output_dir, start=start_date, end=end_date, top_n=max(top_n, 50))
    console.print(f"\nSaved grid-search report to [bold]{paths['html']}[/bold]")


def _print_summary(summary: dict) -> None:
    table = Table(title="Gap Fill Backtest Summary")
    table.add_column("Metric")
    table.add_column("Value", justify="right")
    ordered_metrics = [
        ("Symbols requested", summary["symbol_count"]),
        ("Symbols with data", summary["symbols_with_data"]),
        ("Trades", summary["trade_count"]),
        ("Fill rate", f'{summary["fill_rate_pct"]:.2f}%'),
        ("Win rate", f'{summary["win_rate_pct"]:.2f}%'),
        ("Average return", f'{summary["avg_return_pct"]:.3f}%'),
        ("Median return", f'{summary["median_return_pct"]:.3f}%'),
        ("Trade return stdev", f'{summary["trade_return_std_pct"]:.3f}%'),
        ("Trade Sharpe", "n/a" if summary["trade_sharpe"] is None else f'{summary["trade_sharpe"]:.3f}'),
        ("Average holding bars", f'{summary["avg_holding_bars"]:.2f}'),
        ("Median bars to fill", summary["median_days_to_fill"] or "n/a"),
        ("Timeout exits", summary["timeout_count"]),
        ("Stop exits", summary["stop_count"]),
    ]
    for label, value in ordered_metrics:
        table.add_row(str(label), str(value))
    console.print(table)


def _print_grid_search_preview(results, sort_by: str, top_n: int) -> None:
    if results.empty:
        console.print("\nNo parameter combinations were evaluated.")
        return

    preview = results.head(top_n)
    table = Table(title=f"Top {len(preview)} Grid Search Results")
    columns = [
        "rank",
        "min_gap_pct",
        "max_hold_days",
        "stop_gap_multiple",
        "trade_count",
        "fill_rate_pct",
        "avg_return_pct",
        "trade_sharpe",
        sort_by,
    ]
    seen = set()
    for column in columns:
        if column in seen:
            continue
        seen.add(column)
        table.add_column(column, justify="right" if column != "stop_gap_multiple" else "left")

    for _, row in preview.iterrows():
        table.add_row(
            str(int(row["rank"])),
            f'{float(row["min_gap_pct"]):.2f}',
            str(int(row["max_hold_days"])),
            _render_stop_gap_multiple(row["stop_gap_multiple"]),
            str(int(row["trade_count"])),
            f'{float(row["fill_rate_pct"]):.2f}%',
            f'{float(row["avg_return_pct"]):.3f}%',
            _format_grid_value(row["trade_sharpe"], "trade_sharpe"),
            _format_grid_value(row[sort_by], sort_by),
        )
    console.print()
    console.print(table)


def _resolve_dates(start: Optional[str], end: Optional[str], years_back: Optional[int]) -> tuple[str, str]:
    if start and end:
        return start, end
    if years_back is None:
        raise typer.BadParameter("Provide either --start and --end, or --years-back")

    end_date = date.today()
    start_date = end_date - timedelta(days=int(years_back * 365.25))
    return start_date.isoformat(), end_date.isoformat()


def _parse_float_list(raw_value: str) -> list[float]:
    return [float(token) for token in _split_csv(raw_value)]


def _parse_int_list(raw_value: str) -> list[int]:
    return [int(token) for token in _split_csv(raw_value)]


def _parse_optional_float_list(raw_value: str) -> list[Optional[float]]:
    values = []
    for token in _split_csv(raw_value):
        if token.lower() in {"none", "null"}:
            values.append(None)
        else:
            values.append(float(token))
    return values


def _split_csv(raw_value: str) -> list[str]:
    tokens = [token.strip() for token in raw_value.split(",") if token.strip()]
    if not tokens:
        raise typer.BadParameter("Expected at least one comma-separated value")
    return tokens


def _validate_sort_by(value: str) -> str:
    if value not in VALID_SORT_COLUMNS:
        valid = ", ".join(sorted(VALID_SORT_COLUMNS))
        raise typer.BadParameter(f"Unsupported sort metric '{value}'. Choose one of: {valid}")
    return value


def _render_stop_gap_multiple(value) -> str:
    if value is None or str(value).lower() == "nan":
        return "none"
    return f"{float(value):.2f}x"


def _format_grid_value(value, column: str) -> str:
    if value is None or str(value).lower() == "nan":
        return "n/a"
    if column in {"trade_count", "timeout_count", "stop_count"}:
        return str(int(value))
    if column in {"fill_rate_pct", "avg_return_pct", "median_return_pct", "trade_return_std_pct"}:
        return f"{float(value):.3f}%"
    return f"{float(value):.3f}"


def main() -> None:
    app()
