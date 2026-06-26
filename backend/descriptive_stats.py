"""
FILE    : backend/descriptive_stats.py
BAHASA  : Python
KEGUNAAN: Menghitung statistik deskriptif untuk kolom numerik
          (skala Interval dan Ratio). Metric yang dihitung disesuaikan
          dengan skala data. Kolom Ratio mendapat tambahan CV dan
          Geometric Mean. Normality test otomatis memilih Shapiro-Wilk
          (n < 5000) atau Kolmogorov-Smirnov (n >= 5000).
          Outlier dihitung dengan metode IQR.
"""

import numpy as np
import pandas as pd
from scipy import stats as scipy_stats


# ============================================================
# OUTLIER COUNT (IQR METHOD)
# ============================================================

def count_outliers_iqr(series):
    """
    Menghitung jumlah outlier menggunakan metode IQR.
    Data dianggap outlier jika berada di luar rentang
    [Q1 - 1.5*IQR, Q3 + 1.5*IQR].
    """
    clean = series.dropna()
    if len(clean) < 4:
        return 0
    q1  = clean.quantile(0.25)
    q3  = clean.quantile(0.75)
    iqr = q3 - q1
    lower = q1 - 1.5 * iqr
    upper = q3 + 1.5 * iqr
    return int(((clean < lower) | (clean > upper)).sum())


# ============================================================
# NORMALITY TEST
# ============================================================

def normality_test(series):
    """
    Menguji normalitas distribusi data.
    - n < 5000  : Shapiro-Wilk Test
    - n >= 5000 : Kolmogorov-Smirnov Test (lebih efisien untuk data besar)
    Mengembalikan string 'Normal' atau 'Not Normal' (alpha = 0.05).
    """
    clean = series.dropna()
    n = len(clean)

    if n < 3:
        return 'N/A'

    try:
        if n < 5000:
            _, p_value = scipy_stats.shapiro(clean)
        else:
            _, p_value = scipy_stats.kstest(
                (clean - clean.mean()) / clean.std(),
                'norm'
            )
        return 'Normal' if p_value > 0.05 else 'Not Normal'
    except Exception:
        return 'N/A'


# ============================================================
# GEOMETRIC MEAN (RATIO ONLY)
# ============================================================

def geometric_mean(series):
    """
    Menghitung geometric mean untuk kolom Ratio.
    Hanya berlaku jika semua nilai positif.
    """
    clean = series.dropna()
    if len(clean) == 0 or (clean <= 0).any():
        return None
    return float(scipy_stats.gmean(clean))


# ============================================================
# COEFFICIENT OF VARIATION (RATIO ONLY)
# ============================================================

def coefficient_of_variation(series):
    """
    Menghitung Coefficient of Variation (CV) = (Std / Mean) * 100%.
    Hanya relevan untuk skala Ratio karena memerlukan nol mutlak.
    """
    clean = series.dropna()
    mean  = clean.mean()
    if mean == 0 or len(clean) == 0:
        return None
    cv = (clean.std() / abs(mean)) * 100
    return round(float(cv), 2)


# ============================================================
# ROUND HELPER
# ============================================================

def r(val, digits=4):
    """Pembulatan aman untuk nilai numerik."""
    try:
        return round(float(val), digits)
    except (TypeError, ValueError):
        return None


# ============================================================
# MAIN : GET NUMERICAL STATS
# ============================================================

def get_numerical_stats(df, col_meta):
    """
    Menghitung statistik deskriptif untuk semua kolom numerik
    (skala 'interval' dan 'ratio').

    Mengembalikan list of dict, satu dict per kolom, berisi:
    column, scale, count, mean, median, mode, std, variance,
    min, max, skewness, kurtosis, missing_count, missing_pct,
    outliers, normality. Kolom Ratio juga mendapat cv dan geometric_mean.
    """
    numeric_scales = {'interval', 'ratio'}
    result = []

    for col, scale in col_meta.items():
        if scale not in numeric_scales:
            continue
        if col not in df.columns:
            continue

        series = df[col]
        if not pd.api.types.is_numeric_dtype(series):
            continue

        clean         = series.dropna()
        total         = len(series)
        missing_count = int(series.isnull().sum())
        missing_pct   = round(missing_count / max(total, 1) * 100, 2)

        try:
            mode_val = float(clean.mode().iloc[0]) if len(clean.mode()) > 0 else None
        except Exception:
            mode_val = None

        q1_val = r(clean.quantile(0.25))
        q3_val = r(clean.quantile(0.75))
        row = {
            'column':        col,
            'scale':         scale,
            'count':         total - missing_count,
            'mean':          r(clean.mean()),
            'median':        r(clean.median()),
            'mode':          r(mode_val),
            'std':           r(clean.std()),
            'variance':      r(clean.var()),
            'min':           r(clean.min()),
            'max':           r(clean.max()),
            'q1':            q1_val,
            'q3':            q3_val,
            'skewness':      r(clean.skew()),
            'kurtosis':      r(clean.kurt()),
            'missing_count': missing_count,
            'missing_pct':   missing_pct,
            'outliers':      count_outliers_iqr(series),
            'normality':     normality_test(series),
        }

        # Tambahan khusus Ratio
        if scale == 'ratio':
            row['cv']            = coefficient_of_variation(series)
            row['geometric_mean'] = r(geometric_mean(series))
        else:
            row['cv']            = None
            row['geometric_mean'] = None

        result.append(row)

    return result
