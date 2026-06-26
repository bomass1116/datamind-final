"""
FILE    : backend/preprocessing.py
BAHASA  : Python
KEGUNAAN: Mendeteksi skala pengukuran statistik setiap kolom secara otomatis
          (Nominal, Ordinal, Interval, Ratio, Datetime, Boolean).
          Mengembalikan DataFrame yang sudah diproses beserta dict col_meta
          yang berisi skala setiap kolom, digunakan oleh modul statistik
          dan visualisasi.
"""

import pandas as pd
import numpy as np
import re


# ============================================================
# CONSTANTS
# ============================================================

BOOLEAN_TRUE_VALUES  = {'true', 'yes', '1', 'y', 'ya', 'benar'}
BOOLEAN_FALSE_VALUES = {'false', 'no', '0', 'n', 'tidak', 'salah'}
BOOLEAN_VALUES       = BOOLEAN_TRUE_VALUES | BOOLEAN_FALSE_VALUES

ORDINAL_KEYWORDS = [
    'rating', 'rank', 'level', 'grade', 'score', 'tier',
    'priority', 'stage', 'step', 'order', 'pendidikan',
    'education', 'satisfaction', 'severity',
]

DATETIME_FORMATS = [
    '%Y-%m-%d', '%Y-%m-%d %H:%M:%S', '%Y-%m-%dT%H:%M:%S',
    '%d/%m/%Y', '%m/%d/%Y', '%d-%m-%Y', '%Y/%m/%d',
    '%d %B %Y', '%B %d, %Y', '%Y%m%d',
]

# Kolom yang biasanya bukan Ratio meski numerik (tidak ada nol mutlak)
INTERVAL_KEYWORDS = ['year', 'tahun', 'suhu', 'temperature', 'temp', 'longitude', 'latitude']


# ============================================================
# DETECT DATETIME
# ============================================================

def is_datetime_col(series):
    """
    Mencoba parse kolom sebagai datetime dengan berbagai format.
    Mengembalikan True jika lebih dari 80% nilai berhasil diparse.
    """
    sample = series.dropna().astype(str).head(50)
    if len(sample) == 0:
        return False

    for fmt in DATETIME_FORMATS:
        try:
            parsed = pd.to_datetime(sample, format=fmt, errors='coerce')
            if parsed.notna().mean() > 0.8:
                return True
        except Exception:
            continue

    import warnings
    try:
        with warnings.catch_warnings():
            warnings.simplefilter('ignore')
            parsed = pd.to_datetime(sample, errors='coerce')
        if parsed.notna().mean() > 0.8:
            return True
    except Exception:
        pass

    return False


# ============================================================
# DETECT BOOLEAN
# ============================================================

def is_boolean_col(series):
    """
    Mendeteksi kolom boolean berdasarkan nilai unik.
    Kolom dianggap boolean jika hanya memiliki 2 nilai unik
    dan nilai tersebut masuk ke set boolean yang didefinisikan.
    """
    unique_vals = set(series.dropna().astype(str).str.lower().unique())
    if len(unique_vals) == 2 and unique_vals.issubset(BOOLEAN_VALUES):
        return True
    if len(unique_vals) <= 2 and series.dropna().dtype in [bool, 'bool']:
        return True
    return False


# ============================================================
# DETECT ORDINAL
# ============================================================

def is_ordinal_col(series, col_name):
    """
    Mendeteksi kolom ordinal berdasarkan nama kolom dan jumlah nilai unik.
    Lebih konservatif: numeric column hanya jadi ordinal jika:
      - Nama kolom mengandung keyword ordinal, ATAU
      - Unique values 2-5 dan nilai-nya berurutan
      - BUKAN kolom harga, jumlah, atau nilai moneter
    """
    col_lower = col_name.lower()

    CEXCLUDE = ['harga', 'price', 'amount', 'total', 'saldo', 'income',
                'expense', 'revenue', 'biaya', 'cost', 'profit', 'sales',
                'quantity', 'jumlah', 'nilai', 'value', 'count', 'tarif',
                'budget', 'pengeluaran']

    for kw in CEXCLUDE:
        if kw in col_lower:
            return False

    for kw in ORDINAL_KEYWORDS:
        if kw in col_lower:
            return True

    if pd.api.types.is_numeric_dtype(series):
        n_unique = series.nunique()
        if n_unique < 2:
            return False
        if 2 <= n_unique <= 5:
            s = series.dropna()
            if s.min() >= 0 and s.max() <= 10:
                return True
            unique_vals = sorted(s.unique())
            if len(unique_vals) >= 2 and all(unique_vals[i] + 1 == unique_vals[i+1] for i in range(len(unique_vals)-1)):
                return True
        return False

    return False


# ============================================================
# DETECT INTERVAL
# ============================================================

def is_interval_col(col_name):
    """
    Mendeteksi kolom interval berdasarkan nama kolom.
    Interval artinya angka tanpa nol mutlak (seperti suhu, tahun, koordinat).
    """
    col_lower = col_name.lower()
    for kw in INTERVAL_KEYWORDS:
        if kw in col_lower:
            return True
    return False


# ============================================================
# DETECT SCALE PER COLUMN
# ============================================================

def detect_scale(series, col_name):
    """
    Menentukan skala pengukuran statistik satu kolom.
    Urutan deteksi:
      1. Boolean
      2. Datetime
      3. Numerik -> Ordinal / Interval / Ratio
      4. String  -> Ordinal / Nominal
    Mengembalikan string skala: 'boolean', 'datetime', 'ordinal',
    'interval', 'ratio', atau 'nominal'.
    """
    # 1. Boolean
    if is_boolean_col(series):
        return 'boolean'

    # 2. Datetime (cek string terlebih dahulu)
    if series.dtype == 'object' or str(series.dtype) == 'str' or str(series.dtype).startswith('datetime') or hasattr(series, 'cat'):
        if is_datetime_col(series):
            return 'datetime'
    # Fallback: coba detect datetime untuk semua dtype non-numerik
    if not pd.api.types.is_numeric_dtype(series):
        if is_datetime_col(series):
            return 'datetime'

    # 3. Numerik
    if pd.api.types.is_numeric_dtype(series):
        if is_ordinal_col(series, col_name):
            return 'ordinal'
        if is_interval_col(col_name):
            return 'interval'
        return 'ratio'

    # 4. String / Kategorikal
    if is_ordinal_col(series, col_name):
        return 'ordinal'

    return 'nominal'


# ============================================================
# CONVERT STRINGS TO NUMERIC WHERE POSSIBLE
# ============================================================

def try_convert_numeric(df):
    """
    Mencoba mengkonversi kolom string yang sebenarnya berisi angka
    ke tipe numerik. Kolom yang berhasil dikonversi lebih dari 80%
    nilainya akan diubah ke float.

    Selain format angka standar (titik sebagai desimal), fungsi ini
    juga mencoba dua gaya penulisan angka lain yang umum ditemukan
    pada data ekspor Eropa/Indonesia maupun Amerika:
      - Gaya Eropa/Indonesia : "1.234,56"  atau "140,00"  (koma = desimal)
      - Gaya Amerika         : "1,234.56"                (koma = pemisah ribuan)
    Strategi dengan tingkat konversi paling tinggi yang dipakai.
    """
    skip_id_patterns = ['id', 'code', 'kode', 'nim', 'nip', 'nik', 'no_', 'sku']
    for col in df.select_dtypes(include='object').columns:
        col_lower = col.lower()
        if any(p in col_lower for p in skip_id_patterns):
            continue
        series = df[col].astype(str).str.strip()

        # Strategi 0: konversi langsung (format angka standar)
        best       = pd.to_numeric(series, errors='coerce')
        best_rate  = best.notna().mean()

        if best_rate < 0.8:
            # Bersihkan simbol mata uang / spasi sebelum dicoba lagi
            cleaned = series.str.replace(r'[^0-9,.\-]', '', regex=True)

            # Strategi A: gaya Eropa/Indonesia -> hapus '.', ubah ',' jadi '.'
            cand_a = cleaned.str.replace('.', '', regex=False).str.replace(',', '.', regex=False)
            conv_a = pd.to_numeric(cand_a, errors='coerce')
            rate_a = conv_a.notna().mean()

            # Strategi B: gaya Amerika -> hapus ',' (pemisah ribuan)
            cand_b = cleaned.str.replace(',', '', regex=False)
            conv_b = pd.to_numeric(cand_b, errors='coerce')
            rate_b = conv_b.notna().mean()

            for rate, conv in ((rate_a, conv_a), (rate_b, conv_b)):
                if rate > best_rate:
                    best_rate = rate
                    best      = conv

        if best_rate > 0.8:
            df[col] = best
    return df


# ============================================================
# MAIN PREPROCESS FUNCTION
# ============================================================

def preprocess(df):
    """
    Fungsi utama preprocessing.
    1. Konversi string-angka ke numerik
    2. Deteksi skala setiap kolom
    3. Parse kolom datetime yang terdeteksi
    Mengembalikan tuple (df, col_meta) dimana col_meta adalah
    dict {nama_kolom: skala}.
    """
    df = df.copy()

    # Konversi angka tersimpan sebagai string
    df = try_convert_numeric(df)

    col_meta = {}
    for col in df.columns:
        scale = detect_scale(df[col], col)
        col_meta[col] = scale

        # Parse datetime kolom
        if scale == 'datetime':
            try:
                import warnings as _w
                with _w.catch_warnings():
                    _w.simplefilter('ignore')
                    df[col] = pd.to_datetime(df[col], errors='coerce')
            except Exception:
                pass

    return df, col_meta
