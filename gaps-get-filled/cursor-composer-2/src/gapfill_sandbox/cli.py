from __future__ import annotations

import json
from pathlib import Path

import click

from gapfill_sandbox.data import fetch_universe, write_fetch_report
from gapfill_sandbox.engine import RunConfig, run_backtest, write_run_json
from gapfill_sandbox.present import build_presentation
from gapfill_sandbox.strategies import resolve
from gapfill_sandbox.universe import load_sp500_symbols, parse_tickers_arg


@click.group()
def main() -> None:
    """Gap-fill sandbox CLI."""


@main.command("fetch")
@click.option("--universe", type=click.Choice(["sp500", "tickers"]), default="sp500")
@click.option("--tickers", default=None, help="Comma/space-separated list when universe=tickers")
@click.option("--start", required=True)
@click.option("--end", required=True)
@click.option(
    "--cache-dir",
    type=click.Path(path_type=Path),
    default=Path("data/cache"),
)
@click.option("--report", type=click.Path(path_type=Path), default=None)
def fetch_cmd(
    universe: str,
    tickers: str | None,
    start: str,
    end: str,
    cache_dir: Path,
    report: Path | None,
) -> None:
    """Download daily OHLC into local parquet cache."""
    if universe == "sp500":
        syms = load_sp500_symbols()
    else:
        p = parse_tickers_arg(tickers)
        if not p:
            raise click.BadParameter("Provide --tickers when universe=tickers")
        syms = p
    click.echo(f"Fetching {len(syms)} symbols → {cache_dir}")
    status = fetch_universe(syms, start, end, cache_dir, progress=True)
    ok = sum(1 for v in status.values() if v == "ok")
    click.echo(f"Done. ok={ok} / {len(status)}")
    rp = report or Path("data/fetch_report.json")
    write_fetch_report(rp, status)
    click.echo(f"Wrote {rp}")


@main.command("run")
@click.option("--run-name", required=True)
@click.option("--universe", type=click.Choice(["sp500", "tickers"]), default="sp500")
@click.option("--tickers", default=None)
@click.option("--start", required=True)
@click.option("--end", required=True)
@click.option("--min-gap-pct", type=float, default=0.5)
@click.option("--stop-multiple", type=float, default=0.5)
@click.option("--time-stop-days", type=int, default=5)
@click.option(
    "--strategies",
    default="gap_fill,naive_momentum_stub",
    help="Comma-separated strategy ids",
)
@click.option(
    "--out-dir",
    type=click.Path(path_type=Path),
    default=Path("results"),
)
@click.option(
    "--cache-dir",
    type=click.Path(path_type=Path),
    default=Path("data/cache"),
)
def run_cmd(
    run_name: str,
    universe: str,
    tickers: str | None,
    start: str,
    end: str,
    min_gap_pct: float,
    stop_multiple: float,
    time_stop_days: int,
    strategies: str,
    out_dir: Path,
    cache_dir: Path,
) -> None:
    """Run backtest using cached bars; write results/<run>/run.json."""
    if universe == "sp500":
        syms = load_sp500_symbols()
    else:
        p = parse_tickers_arg(tickers)
        if not p:
            raise click.BadParameter("Provide --tickers when universe=tickers")
        syms = p
    strat_names = [s.strip() for s in strategies.split(",") if s.strip()]
    strats = resolve(strat_names)
    cfg = RunConfig(
        run_name=run_name,
        universe=universe,
        tickers=syms,
        start=start,
        end=end,
        min_gap_pct=min_gap_pct,
        stop_multiple=stop_multiple,
        time_stop_days=time_stop_days,
        strategy_names=strat_names,
    )
    click.echo(f"Backtesting {len(syms)} symbols (cached) …")
    result = run_backtest(cfg, cache_dir, strats)
    run_path = out_dir / run_name
    write_run_json(result, run_path / "run.json")
    click.echo(f"Wrote {run_path / 'run.json'}")
    click.echo(json.dumps(result.summary, indent=2))


@main.command("present")
@click.option(
    "--run",
    "run_path",
    type=click.Path(exists=True, file_okay=False, path_type=Path),
    required=True,
    help="Path to results/<run_name> containing run.json",
)
def present_cmd(run_path: Path) -> None:
    """Build self-contained presentation.html next to run.json."""
    out = build_presentation(run_path)
    click.echo(f"Wrote {out}")


if __name__ == "__main__":
    main()
