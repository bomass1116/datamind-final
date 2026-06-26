"""
FILE    : backend/time_series.py
KEGUNAAN: Deteksi otomatis kolom datetime dan analisis Time Series.
"""
import pandas as pd
import numpy as np

def detect_time_series(df, col_meta):
    dt_cols = [c for c,v in col_meta.items() if v == 'datetime' and c in df.columns]
    return dt_cols

def get_ts_summary(df, date_col, val_col):
    d = df[[date_col, val_col]].dropna().copy()
    d[date_col] = pd.to_datetime(d[date_col], errors='coerce')
    d = d.dropna().sort_values(date_col)
    if len(d) < 3:
        return {}
    monthly = d.groupby(d[date_col].dt.to_period('M'))[val_col].sum()
    vals = monthly.values
    x = np.arange(len(vals))
    coef = np.polyfit(x, vals, 1)
    trend_dir = "Naik 📈" if coef[0] > 0 else "Turun 📉"
    growth = round((vals[-1] - vals[0]) / max(abs(vals[0]), 1) * 100, 1) if len(vals) > 1 else 0
    return {
        'date_col': date_col,
        'val_col': val_col,
        'periods': len(monthly),
        'min_date': str(d[date_col].min().date()),
        'max_date': str(d[date_col].max().date()),
        'trend': trend_dir,
        'growth_pct': growth,
        'total': float(vals.sum()),
        'avg_per_period': float(vals.mean()),
    }
