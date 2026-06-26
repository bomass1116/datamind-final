"""
FILE    : backend/categorical_analysis.py
BAHASA  : Python
KEGUNAAN: Menghitung statistik deskriptif untuk kolom kategorikal
          (skala Nominal dan Ordinal) serta kolom Boolean dan Datetime.
          Setiap skala mendapat metric yang relevan secara statistik.
          Nominal: count, unique, mode, mode_freq, mode_pct, missing.
          Ordinal: tambahan median dan persentil.
          Boolean: proporsi True/False.
          Datetime: min date, max date, durasi, frekuensi dominan.
"""

import pandas as pd
import numpy as np


# ============================================================
# ROUND HELPER
# ============================================================

def r(val, digits=2):
    try:
        return round(float(val), digits)
    except (TypeError, ValueError):
        return None


# ============================================================
# NOMINAL STATS
# ============================================================

def nominal_stats(series, col, scale):
    """
    Menghitung statistik untuk kolom Nominal.
    Metric: count, unique, mode, mode_freq, mode_pct, missing_count, missing_pct.
    """
    total         = len(series)
    clean         = series.dropna()
    missing_count = int(series.isnull().sum())
    missing_pct   = r(missing_count / max(total, 1) * 100)

    mode_val  = str(clean.mode().iloc[0]) if len(clean.mode()) > 0 else '-'
    mode_freq = int((clean == clean.mode().iloc[0]).sum()) if len(clean.mode()) > 0 else 0
    mode_pct  = r(mode_freq / max(len(clean), 1) * 100)

    return {
        'column':        col,
        'scale':         scale,
        'count':         len(clean),
        'unique':        int(clean.nunique()),
        'mode':          mode_val,
        'mode_freq':     mode_freq,
        'mode_pct':      mode_pct,
        'missing_count': missing_count,
        'missing_pct':   missing_pct,
    }


# ============================================================
# ORDINAL STATS
# ============================================================

def ordinal_stats(series, col):
    """
    Menghitung statistik untuk kolom Ordinal.
    Semua metric Nominal ditambah median, percentile 25, percentile 75,
    dan rank distribution (frekuensi per nilai unik).
    """
    base = nominal_stats(series, col, 'ordinal')
    clean = series.dropna()

    # Jika numerik, hitung median dan persentil
    if pd.api.types.is_numeric_dtype(series):
        base['median']       = r(clean.median())
        base['percentile_25'] = r(clean.quantile(0.25))
        base['percentile_75'] = r(clean.quantile(0.75))
    else:
        base['median']        = '-'
        base['percentile_25'] = '-'
        base['percentile_75'] = '-'

    # Rank distribution: top 5 nilai terbanyak
    rank_dist = clean.value_counts().head(5).to_dict()
    base['rank_distribution'] = {str(k): int(v) for k, v in rank_dist.items()}

    return base


# ============================================================
# BOOLEAN STATS
# ============================================================

def boolean_stats(series, col):
    """
    Menghitung statistik untuk kolom Boolean.
    Metric: true_count, false_count, true_pct, false_pct, missing.
    """
    total         = len(series)
    missing_count = int(series.isnull().sum())
    missing_pct   = r(missing_count / max(total, 1) * 100)
    clean         = series.dropna().astype(str).str.lower()

    true_vals  = {'true', 'yes', '1', 'y', 'ya', 'benar'}
    true_count = int(clean.isin(true_vals).sum())
    false_count = len(clean) - true_count

    return {
        'column':        col,
        'scale':         'boolean',
        'count':         len(clean),
        'unique':        2,
        'true_count':    true_count,
        'false_count':   false_count,
        'true_pct':      r(true_count / max(len(clean), 1) * 100),
        'false_pct':     r(false_count / max(len(clean), 1) * 100),
        'missing_count': missing_count,
        'missing_pct':   missing_pct,
        'mode':          'True' if true_count >= false_count else 'False',
        'mode_freq':     max(true_count, false_count),
        'mode_pct':      r(max(true_count, false_count) / max(len(clean), 1) * 100),
    }


# ============================================================
# DATETIME STATS
# ============================================================

def datetime_stats(series, col):
    """
    Menghitung statistik untuk kolom Datetime.
    Metric: min_date, max_date, duration (hari), dominant_frequency
    (apakah data harian, mingguan, atau bulanan), missing.
    """
    total         = len(series)
    missing_count = int(series.isnull().sum())
    missing_pct   = r(missing_count / max(total, 1) * 100)

    try:
        clean    = pd.to_datetime(series, errors='coerce').dropna()
        min_date = str(clean.min().date()) if len(clean) > 0 else '-'
        max_date = str(clean.max().date()) if len(clean) > 0 else '-'
        duration = int((clean.max() - clean.min()).days) if len(clean) > 1 else 0

        # Deteksi frekuensi dominan
        if duration <= 90:
            frequency = 'Daily'
        elif duration <= 730:
            frequency = 'Weekly/Monthly'
        else:
            frequency = 'Yearly'

    except Exception:
        min_date  = '-'
        max_date  = '-'
        duration  = 0
        frequency = '-'

    return {
        'column':        col,
        'scale':         'datetime',
        'count':         total - missing_count,
        'unique':        int(series.nunique()),
        'min_date':      min_date,
        'max_date':      max_date,
        'duration_days': duration,
        'frequency':     frequency,
        'missing_count': missing_count,
        'missing_pct':   missing_pct,
        'mode':          min_date,
        'mode_freq':     '-',
        'mode_pct':      '-',
    }


# ============================================================
# MAIN : GET CATEGORICAL STATS
# ============================================================

def get_categorical_stats(df, col_meta):
    """
    Fungsi utama yang menghitung statistik untuk semua kolom
    non-numerik (nominal, ordinal, boolean, datetime).

    Mengembalikan list of dict, satu dict per kolom.
    Setiap dict berisi metric yang relevan berdasarkan skala.
    """
    categorical_scales = {'nominal', 'ordinal', 'boolean', 'datetime'}
    result = []

    for col, scale in col_meta.items():
        if scale not in categorical_scales:
            continue
        if col not in df.columns:
            continue

        series = df[col]

        if scale == 'nominal':
            row = nominal_stats(series, col, 'nominal')
        elif scale == 'ordinal':
            row = ordinal_stats(series, col)
        elif scale == 'boolean':
            row = boolean_stats(series, col)
        elif scale == 'datetime':
            row = datetime_stats(series, col)
        else:
            row = nominal_stats(series, col, scale)

        result.append(row)

    return result
