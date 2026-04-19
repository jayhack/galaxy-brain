"""Download and cache price data for a universe.

Usage:
    python scripts/fetch_data.py --universe sp500 --years 10
    python scripts/fetch_data.py --universe AAPL MSFT SPY --start 2015-01-01
    python scripts/fetch_data.py --limit 50          # first 50 S&P 500 tickers only
"""

from __future__ import annotations

import argparse
import logging
import sys
from datetime import date, timedelta
from pathlib import Path

# allow running without installing the package
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from n472jw.data import fetch_prices, resolve_universe  # noqa: E402


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--universe", nargs="+", default=["sp500"],
                   help='"sp500" or a list of tickers')
    p.add_argument("--years", type=int, default=10)
    p.add_argument("--start", type=str, default=None, help="YYYY-MM-DD")
    p.add_argument("--end", type=str, default=None, help="YYYY-MM-DD")
    p.add_argument("--limit", type=int, default=None,
                   help="keep only the first N symbols after resolving (for testing)")
    p.add_argument("--force-refresh", action="store_true")
    p.add_argument("--batch-size", type=int, default=50)
    p.add_argument("--sleep", type=float, default=0.0, help="seconds between batches")
    p.add_argument("-v", "--verbose", action="store_true")
    args = p.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    log = logging.getLogger("fetch_data")

    end = date.fromisoformat(args.end) if args.end else date.today()
    start = date.fromisoformat(args.start) if args.start else end - timedelta(days=args.years * 365)

    # resolve_universe expects a single entry if it's "sp500", else takes the list as-is
    if len(args.universe) == 1:
        universe = resolve_universe(args.universe[0])
    else:
        universe = [s.upper() for s in args.universe]
    if args.limit:
        universe = universe[: args.limit]

    log.info("fetching %d symbols from %s to %s", len(universe), start, end)
    prices = fetch_prices(
        universe, start=start, end=end,
        batch_size=args.batch_size,
        force_refresh=args.force_refresh,
        sleep_between_batches=args.sleep,
    )
    log.info("done: %d symbols have data in cache", len(prices))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
