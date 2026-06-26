"""
FILE    : backend/data_loader.py
BAHASA  : Python
KEGUNAAN: Membaca file yang diupload (CSV, Excel, TXT) menjadi
          DataFrame pandas. Mendeteksi encoding otomatis dengan chardet,
          mendeteksi separator CSV otomatis, dan menyediakan
          sample dataset bawaan untuk demo.
"""

import os
import io
import chardet
import pandas as pd
import numpy as np
from backend.preprocessing import preprocess


ALLOWED_EXTENSIONS = {'csv', 'xlsx', 'xls', 'txt'}


# ============================================================
# DETECT ENCODING
# ============================================================

def detect_encoding(filepath):
    """
    Membaca sebagian byte dari file untuk mendeteksi encoding
    menggunakan library chardet.
    Mengembalikan string encoding seperti 'utf-8', 'latin-1', dll.
    """
    with open(filepath, 'rb') as f:
        raw = f.read(100_000)
    result = chardet.detect(raw)
    encoding = result.get('encoding') or 'utf-8'
    return encoding


# ============================================================
# DETECT CSV SEPARATOR
# ============================================================

def detect_separator(filepath, encoding):
    """
    Mendeteksi separator CSV/TXT secara otomatis dengan mencoba
    berbagai delimiter umum. Separator yang menghasilkan
    kolom paling banyak dianggap sebagai separator yang benar.
    """
    separators = [',', ';', '\t', '|']
    best_sep   = ','
    best_cols  = 0

    with open(filepath, 'r', encoding=encoding, errors='replace') as f:
        first_line = f.readline().lstrip('\ufeff').strip()

    if not first_line:
        return best_sep

    for sep in separators:
        count = len(first_line.split(sep))
        if count > best_cols:
            best_cols = count
            best_sep  = sep

    return best_sep


# ============================================================
# LOAD FILE
# ============================================================

def load_file(filepath):
    """
    Membaca file berdasarkan ekstensinya.
    - .xlsx / .xls  : dibaca dengan pandas read_excel
    - .csv          : deteksi encoding dan separator otomatis
    - .txt          : dicoba sebagai CSV dengan deteksi separator
    Mengembalikan DataFrame pandas.
    """
    ext = filepath.rsplit('.', 1)[-1].lower()

    if ext in ('xlsx', 'xls'):
        df = pd.read_excel(filepath)

    elif ext == 'csv':
        encoding = detect_encoding(filepath)
        sep      = detect_separator(filepath, encoding)
        df       = pd.read_csv(filepath, sep=sep, encoding=encoding, encoding_errors='replace')

    elif ext == 'txt':
        encoding = detect_encoding(filepath)
        sep      = detect_separator(filepath, encoding)
        errors = []

        # Strategi 1: fast path dengan separator terdeteksi (C engine)
        try:
            df = pd.read_csv(filepath, sep=sep, encoding=encoding,
                             encoding_errors='replace', low_memory=False)
            if len(df.columns) <= 1 and sep != ',':
                df = None
        except Exception as e:
            errors.append(f"sep='{sep}': {e}")
            df = None

        # Strategi 2: default comma (C engine)
        if df is None or len(df.columns) <= 1:
            try:
                df = pd.read_csv(filepath, encoding=encoding,
                                 encoding_errors='replace', low_memory=False)
                if len(df.columns) <= 1:
                    df = None
            except Exception as e:
                errors.append(f"default sep: {e}")

        # Strategi 3: auto-detect separator (Python engine)
        if df is None or len(df.columns) <= 1:
            try:
                df = pd.read_csv(filepath, sep=None, engine='python',
                                 encoding=encoding, encoding_errors='replace')
                if len(df.columns) <= 1:
                    df = None
            except Exception as e:
                errors.append(f"auto sep: {e}")

        # Strategi 4: regex whitespace (Python engine — handles multi-space)
        if df is None or len(df.columns) <= 1:
            try:
                df = pd.read_csv(filepath, sep=r'\s+', engine='python',
                                 encoding=encoding, encoding_errors='replace')
                if len(df.columns) <= 1:
                    df = None
            except Exception as e:
                errors.append(f"regex sep: {e}")

        # Strategi 5: fixed-width
        if df is None or len(df.columns) <= 1:
            try:
                df = pd.read_fwf(filepath, encoding=encoding,
                                 encoding_errors='replace')
                if len(df.columns) <= 1:
                    df = None
            except Exception as e:
                errors.append(f"fwf: {e}")

        if df is None or len(df.columns) <= 1:
            raise ValueError(
                f"Format TXT tidak dikenal atau hanya 1 kolom. "
                f"Sudah dicoba: {'; '.join(errors) if errors else 'semua gagal'}"
            )

    else:
        raise ValueError(f"Format file tidak didukung: .{ext}")

    # Drop kolom tanpa nama (Unnamed)
    df = df.loc[:, ~df.columns.str.contains('^Unnamed')]

    return df


# ============================================================
# LOAD SAMPLE DATASET
# ============================================================

def load_sample():
    """
    Membuat sample dataset sintetik berisi data penjualan.
    Digunakan untuk demo ketika user tidak memiliki file sendiri.
    Mengembalikan tuple (DataFrame, col_meta).
    """
    np.random.seed(42)
    n = 200

    categories = ['Electronics', 'Clothing', 'Accessories', 'Furniture']
    regions    = ['Jakarta', 'Surabaya', 'Bandung', 'Medan']
    payment    = ['Credit Card', 'Transfer', 'Cash', 'E-Wallet']

    df = pd.DataFrame({
        'Date':           pd.date_range('2024-01-01', periods=n, freq='D').strftime('%Y-%m-%d'),
        'Product':        np.random.choice(['Laptop', 'Keyboard', 'Monitor', 'Headset', 'Shirt', 'Pants'], n),
        'Category':       np.random.choice(categories, n),
        'Region':         np.random.choice(regions, n),
        'Sales':          np.random.randint(500_000, 5_000_000, n),
        'Quantity':       np.random.randint(1, 20, n),
        'Discount':       np.round(np.random.uniform(0, 0.3, n), 2),
        'Profit':         np.random.randint(50_000, 1_500_000, n),
        'Payment_Method': np.random.choice(payment, n),
        'Rating':         np.random.choice([1, 2, 3, 4, 5], n),
    })

    # Tambahkan sedikit missing values
    for col in ['Sales', 'Profit', 'Category']:
        idx = np.random.choice(df.index, size=3, replace=False)
        df.loc[idx, col] = np.nan

    df, col_meta = preprocess(df)
    return df, col_meta
