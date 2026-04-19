"""Streamlit UI for exploring N472JW backtest runs.

Reads whatever's in `results/runs/`. Pick a run in the sidebar; the app shows:
  - summary metrics (fill rates, trade stats, Sharpe, max DD)
  - filterable gap table
  - filterable trade table
  - equity curve
  - fill-rate-by-horizon chart
  - PnL distribution + breakdown by exit reason / direction / gap size
"""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd
import plotly.express as px
import streamlit as st
import yaml

st.set_page_config(page_title="N472JW • Backtest Results", layout="wide")

RUNS_ROOT = Path("results/runs")


def list_runs() -> list[Path]:
    if not RUNS_ROOT.exists():
        return []
    return sorted([p for p in RUNS_ROOT.iterdir() if p.is_dir()], reverse=True)


@st.cache_data(show_spinner=False)
def load_run(run_dir_str: str) -> dict:
    run_dir = Path(run_dir_str)
    out: dict = {"name": run_dir.name}
    s = run_dir / "summary.json"
    out["summary"] = json.loads(s.read_text()) if s.exists() else {}
    c = run_dir / "config.yaml"
    out["config"] = yaml.safe_load(c.read_text()) if c.exists() else {}
    g = run_dir / "gaps.parquet"
    out["gaps"] = pd.read_parquet(g) if g.exists() else pd.DataFrame()
    t = run_dir / "trades.parquet"
    out["trades"] = pd.read_parquet(t) if t.exists() else pd.DataFrame()
    e = run_dir / "equity.parquet"
    out["equity"] = pd.read_parquet(e) if e.exists() else pd.DataFrame()
    return out


# ---- sidebar ---------------------------------------------------------------

st.sidebar.title("N472JW")
st.sidebar.caption("Backtest results browser")

runs = list_runs()
if not runs:
    st.title("No runs yet")
    st.markdown(
        "Run a backtest first:\n\n"
        "```bash\n"
        "python scripts/run_gap_fill.py --config config/default.yaml\n"
        "```"
    )
    st.stop()

run_labels = [p.name for p in runs]
selected = st.sidebar.selectbox("Run", run_labels, index=0)
run_dir = RUNS_ROOT / selected
data = load_run(str(run_dir))
summary = data["summary"]
config = data["config"]
gaps = data["gaps"]
trades = data["trades"]
equity = data["equity"]

with st.sidebar.expander("Config", expanded=False):
    st.code(yaml.safe_dump(config, sort_keys=False), language="yaml")

# ---- header ---------------------------------------------------------------

st.title(f"Run: {selected}")
cols = st.columns(4)
cols[0].metric("Symbols", summary.get("n_symbols", 0))
cols[1].metric("Date range",
               f"{summary.get('start_date', '?')} → {summary.get('end_date', '?')}")
cols[2].metric("Gaps detected", summary.get("gap_diagnostic", {}).get("n_gaps", 0))
cols[3].metric("Trades", summary.get("trade_summary", {}).get("n_trades", 0))

# ---- tabs -----------------------------------------------------------------

tab_diag, tab_trades, tab_equity, tab_gaps, tab_raw = st.tabs(
    ["Fill diagnostic", "Trade performance", "Equity curve", "Gap explorer", "Raw summary"]
)

# ---- fill diagnostic -------------------------------------------------------

with tab_diag:
    st.subheader("Do gaps actually get filled?")
    diag = summary.get("gap_diagnostic", {})
    if diag.get("n_gaps", 0) == 0:
        st.info("No gaps detected in this run.")
    else:
        horizons = sorted(
            int(k.split("_")[2].rstrip("d"))
            for k in diag if k.startswith("fill_rate_")
        )
        rates = [diag[f"fill_rate_{h}d_pct"] for h in horizons]
        df_rates = pd.DataFrame({"horizon_days": horizons, "fill_rate_pct": rates})
        fig = px.bar(df_rates, x="horizon_days", y="fill_rate_pct",
                     title="Fraction of gaps filled by trading-day horizon",
                     labels={"horizon_days": "Days", "fill_rate_pct": "Fill rate (%)"})
        fig.update_yaxes(range=[0, 100])
        st.plotly_chart(fig, use_container_width=True)

        if not gaps.empty and "direction" in gaps.columns:
            st.subheader("Fill rate by direction and gap size")
            bucket = pd.cut(
                gaps["gap_pct"],
                bins=[0, 0.005, 0.01, 0.02, 0.05, 1.0],
                labels=["<0.5%", "0.5–1%", "1–2%", "2–5%", ">5%"],
            )
            gaps2 = gaps.copy()
            gaps2["gap_bucket"] = bucket
            fill_cols = [c for c in gaps.columns if c.startswith("fill_by_")]
            if fill_cols:
                agg = (
                    gaps2.groupby(["direction", "gap_bucket"], observed=True)[fill_cols]
                    .mean()
                    .reset_index()
                )
                st.dataframe(agg, use_container_width=True)

# ---- trade performance ----------------------------------------------------

with tab_trades:
    ts = summary.get("trade_summary", {})
    if ts.get("n_trades", 0) == 0:
        st.info("No trades in this run (diagnostic-only, or no signals).")
    else:
        cols = st.columns(5)
        cols[0].metric("Win rate", f"{ts.get('win_rate', 0) * 100:.1f}%")
        cols[1].metric("Avg return", f"{ts.get('avg_return_pct', 0):.2f}%")
        cols[2].metric("Total PnL", f"${ts.get('total_net_pnl_usd', 0):,.0f}")
        cols[3].metric("Sharpe (ann.)", f"{summary.get('sharpe_annualized', 0):.2f}")
        cols[4].metric("Max drawdown", f"${summary.get('max_drawdown_usd', 0):,.0f}")

        st.subheader("PnL distribution")
        fig = px.histogram(trades, x="net_return", nbins=60,
                           labels={"net_return": "Net return per trade"})
        st.plotly_chart(fig, use_container_width=True)

        c1, c2 = st.columns(2)
        with c1:
            st.subheader("Exit reason mix")
            er = trades["exit_reason"].value_counts().reset_index()
            er.columns = ["exit_reason", "count"]
            fig = px.pie(er, names="exit_reason", values="count")
            st.plotly_chart(fig, use_container_width=True)
        with c2:
            st.subheader("Return by side")
            if "side" in trades.columns:
                bysd = trades.groupby("side")["net_return"].agg(["count", "mean", "median"])
                bysd["mean"] = (bysd["mean"] * 100).round(3)
                bysd["median"] = (bysd["median"] * 100).round(3)
                st.dataframe(bysd, use_container_width=True)

        st.subheader("Trade table")
        symbols = ["(all)"] + sorted(trades["symbol"].unique().tolist())
        pick = st.selectbox("Symbol", symbols, index=0)
        view = trades if pick == "(all)" else trades[trades["symbol"] == pick]
        st.dataframe(view.sort_values("entry_date", ascending=False),
                     use_container_width=True, height=400)

# ---- equity curve ---------------------------------------------------------

with tab_equity:
    if equity.empty:
        st.info("No trades to chart.")
    else:
        fig = px.line(equity, x="date", y="cum_pnl_usd",
                      title="Cumulative net PnL (USD)",
                      labels={"date": "Date", "cum_pnl_usd": "Cumulative PnL ($)"})
        st.plotly_chart(fig, use_container_width=True)
        st.dataframe(equity.tail(50), use_container_width=True)

# ---- gap explorer ---------------------------------------------------------

with tab_gaps:
    if gaps.empty:
        st.info("No gaps to display.")
    else:
        c1, c2, c3 = st.columns(3)
        with c1:
            direction = st.selectbox("Direction", ["both", "up", "down"], index=0)
        with c2:
            min_size = st.slider("Min gap %", 0.0, 10.0, 0.5, 0.1) / 100.0
        with c3:
            sym_pick = st.selectbox("Symbol", ["(all)"] + sorted(gaps["symbol"].unique()))
        g = gaps.copy()
        if direction != "both":
            g = g[g["direction"] == direction]
        g = g[g["gap_pct"] >= min_size]
        if sym_pick != "(all)":
            g = g[g["symbol"] == sym_pick]
        st.caption(f"{len(g):,} gaps matching filter")
        st.dataframe(g.sort_values("gap_pct", ascending=False),
                     use_container_width=True, height=500)

# ---- raw summary ----------------------------------------------------------

with tab_raw:
    st.json(summary)
