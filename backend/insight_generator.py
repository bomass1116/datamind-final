"""
FILE    : backend/insight_generator.py
BAHASA  : Python + Google Generative AI (Gemini)
KEGUNAAN: Mengirim ringkasan statistik dataset ke Gemini API (Google AI Studio)
          dan mendapatkan narasi insight profesional dalam Bahasa Indonesia.
          Hanya mengirim ringkasan statistik (bukan raw data) untuk efisiensi token.
          Output berupa paragraf narasi analis, bukan bullet point biasa.
          Jika Gemini gagal, fallback otomatis ke insight berbasis rules Python.
"""

import os
import json


# ============================================================
# BUILD SUMMARY PAYLOAD
# ============================================================

def build_summary(df, col_meta, num_stats, cat_stats):
    """
    Membangun ringkasan dataset yang ringkas untuk dikirim ke Gemini API.
    Hanya menyertakan informasi penting agar token input tetap efisien.
    """
    total_rows    = len(df)
    total_cols    = len(df.columns)
    missing_total = int(df.isnull().sum().sum())
    missing_pct   = round(missing_total / max(df.size, 1) * 100, 2)

    num_summary = []
    for row in num_stats:
        num_summary.append({
            'column':      row.get('column'),
            'scale':       row.get('scale'),
            'mean':        row.get('mean'),
            'median':      row.get('median'),
            'std':         row.get('std'),
            'skewness':    row.get('skewness'),
            'kurtosis':    row.get('kurtosis'),
            'outliers':    row.get('outliers'),
            'normality':   row.get('normality'),
            'missing_pct': row.get('missing_pct'),
            'cv':          row.get('cv'),
            'q1':          row.get('q1'),
            'q3':          row.get('q3'),
            'min':         row.get('min'),
            'max':         row.get('max'),
        })

    cat_summary = []
    for row in cat_stats:
        cat_summary.append({
            'column':      row.get('column'),
            'scale':       row.get('scale'),
            'unique':      row.get('unique'),
            'mode':        row.get('mode'),
            'mode_freq':   row.get('mode_freq'),
            'mode_pct':    row.get('mode_pct'),
            'missing_pct': row.get('missing_pct'),
        })

    return {
        'dataset_info': {
            'total_rows':    total_rows,
            'total_cols':    total_cols,
            'missing_total': missing_total,
            'missing_pct':   missing_pct,
        },
        'numerical_summary':   num_summary,
        'categorical_summary': cat_summary,
        'column_scales':       col_meta,
    }


# ============================================================
# PROMPT BUILDER
# ============================================================

def build_prompt(summary, lang='id'):
    """
    Membangun prompt yang dikirim ke Gemini API.
    Meminta narasi profesional dalam Bahasa Indonesia atau Inggris (sesuai lang)
    dengan format paragraf per seksi, bukan bullet point.
    """
    summary_json = json.dumps(summary, ensure_ascii=False, indent=2)

    if lang == 'en':
        prompt = f"""You are a professional Data Analyst.
Here is a statistical summary of a dataset:

{summary_json}

Write a professional, easy-to-understand data analysis report in English.
Use PARAGRAPH format, not bullet points. Divide it into the following 5 sections:

1. DATASET SUMMARY
Explain the dataset overview: number of rows, columns, data types present, and general condition.

2. DATA QUALITY
Analyze missing values and outliers. Provide recommendations for handling them.

3. DATA DISTRIBUTION
Interpret the skewness, kurtosis, and normality test results of the numerical variables.
Explain what this means in the context of analysis.

4. KEY FINDINGS
Mention 3-5 of the most interesting or important findings from this dataset.

5. RECOMMENDATIONS
Provide recommendations for the next analysis steps appropriate to the dataset's characteristics.

Use clear, professional, and not overly technical language.
Write in full paragraphs, not lists or bullet points."""
        return prompt

    prompt = f"""Kamu adalah seorang Data Analyst profesional.
Berikut adalah ringkasan statistik dari sebuah dataset:

{summary_json}

Tulis laporan analisis data dalam Bahasa Indonesia yang profesional dan mudah dipahami.
Gunakan format PARAGRAF, bukan bullet point. Bagi menjadi 5 seksi berikut:

1. RINGKASAN DATASET
Jelaskan gambaran umum dataset: jumlah baris, kolom, tipe data yang ada, dan kondisi umum.

2. KUALITAS DATA
Analisis missing values dan outlier. Berikan rekomendasi penanganannya.

3. DISTRIBUSI DATA
Interpretasikan skewness, kurtosis, dan hasil uji normalitas dari variabel numerik.
Jelaskan apa artinya dalam konteks analisis.

4. TEMUAN UTAMA
Sebutkan 3-5 temuan paling menarik atau penting dari dataset ini.

5. REKOMENDASI
Berikan rekomendasi langkah analisis selanjutnya yang sesuai dengan karakteristik data.

Gunakan bahasa yang jelas, profesional, dan tidak terlalu teknis.
Tulis dalam paragraf penuh, bukan daftar atau bullet point."""

    return prompt


# ============================================================
# FALLBACK : INSIGHT BERBASIS RULES (tanpa API)
# ============================================================

def generate_fallback_insight(df, col_meta, num_stats, cat_stats, lang='id'):
    """
    Menghasilkan insight otomatis berbasis logika Python tanpa API.
    Digunakan sebagai fallback jika Gemini API gagal dipanggil.
    Tetap menghasilkan narasi yang informatif dan profesional.
    Mendukung Bahasa Indonesia (id) dan Inggris (en).
    """
    _en = lang == 'en'
    total_rows    = len(df)
    total_cols    = len(df.columns)
    missing_total = int(df.isnull().sum().sum())
    missing_pct   = round(missing_total / max(df.size, 1) * 100, 2)

    numeric_cols = [r for r in num_stats]
    cat_cols     = [r for r in cat_stats]

    # Ringkasan Dataset
    if _en:
        section1 = (
            f"This dataset consists of {total_rows} rows of data and {total_cols} variable columns. "
            f"There are {len(numeric_cols)} numerical variables and {len(cat_cols)} categorical variables. "
            f"Overall, the dataset has {missing_total} missing values "
            f"({missing_pct}% of total data)."
        )
    else:
        section1 = (
            f"Dataset ini terdiri dari {total_rows} baris data dan {total_cols} kolom variabel. "
            f"Terdapat {len(numeric_cols)} variabel numerik dan {len(cat_cols)} variabel kategorikal. "
            f"Secara keseluruhan, dataset memiliki {missing_total} nilai kosong "
            f"({missing_pct}% dari total data)."
        )

    # Kualitas Data
    high_missing = [r for r in num_stats + cat_stats if (r.get('missing_pct') or 0) > 10]
    outlier_cols = [r for r in num_stats if (r.get('outliers') or 0) > 0]

    if _en:
        if high_missing:
            cols_str = ', '.join([r['column'] for r in high_missing])
            section2 = (
                f"Several columns have fairly high missing values, namely {cols_str}. "
                f"It is recommended to handle missing values with median imputation for numerical columns "
                f"and mode imputation for categorical columns before proceeding with further analysis."
            )
        else:
            section2 = (
                f"Overall data quality is good with low missing values ({missing_pct}%). "
                f"This dataset is ready for further analysis without intensive missing value handling."
            )
        if outlier_cols:
            out_str = ', '.join([f"{r['column']} ({r['outliers']} outliers)" for r in outlier_cols[:3]])
            section2 += f" Outliers were found in the column(s) {out_str}. Further investigation is needed to determine whether these outliers are anomalies or valid values."
    else:
        if high_missing:
            cols_str = ', '.join([r['column'] for r in high_missing])
            section2 = (
                f"Terdapat beberapa kolom dengan missing value cukup tinggi yaitu {cols_str}. "
                f"Disarankan untuk menangani missing value dengan imputasi median untuk kolom numerik "
                f"dan imputasi modus untuk kolom kategorikal sebelum melakukan analisis lebih lanjut."
            )
        else:
            section2 = (
                f"Kualitas data secara keseluruhan tergolong baik dengan missing value yang rendah ({missing_pct}%). "
                f"Dataset ini siap untuk dianalisis lebih lanjut tanpa perlu penanganan missing value yang intensif."
            )
        if outlier_cols:
            out_str = ', '.join([f"{r['column']} ({r['outliers']} outlier)" for r in outlier_cols[:3]])
            section2 += f" Ditemukan outlier pada kolom {out_str}. Investigasi lebih lanjut diperlukan untuk menentukan apakah outlier ini merupakan anomali atau nilai yang valid."

    # Distribusi Data
    not_normal = [r for r in num_stats if r.get('normality') == 'Not Normal']
    skewed     = [r for r in num_stats if abs(r.get('skewness') or 0) > 1]

    if _en:
        if skewed:
            sk_str   = ', '.join([r['column'] for r in skewed[:3]])
            section3 = (
                f"Several numerical variables show an asymmetric distribution, "
                f"namely {sk_str}. A high skewness value indicates the data leans to one side, "
                f"which is common in financial or transactional data. "
            )
        else:
            section3 = "The numerical variables in this dataset show a relatively symmetric distribution. "
        if not_normal:
            nn_str    = ', '.join([r['column'] for r in not_normal[:3]])
            section3 += (
                f"Normality test results show that the column(s) {nn_str} are not normally distributed. "
                f"For inferential statistical analysis, non-parametric methods are recommended."
            )
    else:
        if skewed:
            sk_str   = ', '.join([r['column'] for r in skewed[:3]])
            section3 = (
                f"Beberapa variabel numerik menunjukkan distribusi yang tidak simetris, "
                f"yaitu {sk_str}. Nilai skewness yang tinggi mengindikasikan data condong ke satu arah, "
                f"yang umum terjadi pada data keuangan atau transaksi. "
            )
        else:
            section3 = "Variabel numerik dalam dataset ini menunjukkan distribusi yang relatif simetris. "
        if not_normal:
            nn_str    = ', '.join([r['column'] for r in not_normal[:3]])
            section3 += (
                f"Hasil uji normalitas menunjukkan bahwa kolom {nn_str} tidak berdistribusi normal. "
                f"Untuk analisis statistik inferensial, disarankan menggunakan metode non-parametrik."
            )

    # Temuan Utama
    findings = []
    if _en:
        if num_stats:
            highest_mean = max(num_stats, key=lambda r: r.get('mean') or 0)
            findings.append(
                f"Variable {highest_mean['column']} has the highest average value of {highest_mean['mean']}."
            )
        if outlier_cols:
            most_outliers = max(outlier_cols, key=lambda r: r.get('outliers') or 0)
            findings.append(
                f"Column {most_outliers['column']} has the most outliers ({most_outliers['outliers']} data points)."
            )
        if high_missing:
            most_missing = max(high_missing, key=lambda r: r.get('missing_pct') or 0)
            findings.append(
                f"Column {most_missing['column']} has the highest missing value percentage ({most_missing['missing_pct']}%)."
            )
        if cat_cols:
            findings.append(
                f"The dataset has {len(cat_cols)} categorical variables that can be used for segmentation analysis."
            )
        section4 = " ".join(findings) if findings else "This dataset has diverse characteristics and is worth analyzing further."
    else:
        if num_stats:
            highest_mean = max(num_stats, key=lambda r: r.get('mean') or 0)
            findings.append(
                f"Variabel {highest_mean['column']} memiliki rata-rata tertinggi sebesar {highest_mean['mean']}."
            )
        if outlier_cols:
            most_outliers = max(outlier_cols, key=lambda r: r.get('outliers') or 0)
            findings.append(
                f"Kolom {most_outliers['column']} memiliki outlier terbanyak ({most_outliers['outliers']} data point)."
            )
        if high_missing:
            most_missing = max(high_missing, key=lambda r: r.get('missing_pct') or 0)
            findings.append(
                f"Kolom {most_missing['column']} memiliki persentase missing value tertinggi ({most_missing['missing_pct']}%)."
            )
        if cat_cols:
            findings.append(
                f"Dataset memiliki {len(cat_cols)} variabel kategorikal yang dapat digunakan untuk analisis segmentasi."
            )
        section4 = " ".join(findings) if findings else "Dataset ini memiliki karakteristik yang beragam dan layak untuk dianalisis lebih mendalam."

    # Rekomendasi
    if _en:
        section5 = (
            f"Based on the dataset's characteristics, the recommended next analysis steps include: "
            f"(1) handling missing values and outliers before modeling, "
            f"(2) correlation analysis between numerical variables to find significant relationships, "
            f"(3) visualizing the distribution of each variable for deeper understanding, "
            f"and (4) segmenting the data based on categorical variables for comparative analysis."
        )
        result = (
            f"1. DATASET SUMMARY\n{section1}\n\n"
            f"2. DATA QUALITY\n{section2}\n\n"
            f"3. DATA DISTRIBUTION\n{section3}\n\n"
            f"4. KEY FINDINGS\n{section4}\n\n"
            f"5. RECOMMENDATIONS\n{section5}"
        )
    else:
        section5 = (
            f"Berdasarkan karakteristik dataset, langkah analisis selanjutnya yang disarankan meliputi: "
            f"(1) penanganan missing value dan outlier sebelum pemodelan, "
            f"(2) analisis korelasi antar variabel numerik untuk menemukan hubungan yang signifikan, "
            f"(3) visualisasi distribusi setiap variabel untuk pemahaman yang lebih mendalam, "
            f"dan (4) segmentasi data berdasarkan variabel kategorikal untuk analisis komparatif."
        )
        result = (
            f"1. RINGKASAN DATASET\n{section1}\n\n"
            f"2. KUALITAS DATA\n{section2}\n\n"
            f"3. DISTRIBUSI DATA\n{section3}\n\n"
            f"4. TEMUAN UTAMA\n{section4}\n\n"
            f"5. REKOMENDASI\n{section5}"
        )

    return result


# ============================================================
# MAIN : GENERATE INSIGHT (Gemini + Fallback)
# ============================================================

def generate_insight(df, col_meta, num_stats, cat_stats, lang='id'):
    """
    Fungsi utama untuk menghasilkan insight profesional dari dataset.
    Menggunakan Claude AI (Anthropic) via HTTP langsung.
    Fallback ke rules-based jika API tidak tersedia.
    Mendukung Bahasa Indonesia (id) dan Inggris (en) lewat parameter lang.
    """
    import urllib.request, urllib.error

    summary = build_summary(df, col_meta, num_stats, cat_stats)
    prompt  = build_prompt(summary, lang=lang)

    try:
        payload = json.dumps({
            "model": "claude-sonnet-4-6",
            "max_tokens": 2000,
            "messages": [{"role": "user", "content": prompt}]
        }).encode('utf-8')

        req = urllib.request.Request(
            'https://api.anthropic.com/v1/messages',
            data=payload,
            headers={
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01',
                'x-api-key': os.environ.get('ANTHROPIC_API_KEY', '')
            },
            method='POST'
        )
        with urllib.request.urlopen(req, timeout=45) as resp:
            result = json.loads(resp.read().decode('utf-8'))
            return result['content'][0]['text']

    except Exception:
        # Fallback ke rules-based jika API tidak tersedia
        return generate_fallback_insight(df, col_meta, num_stats, cat_stats, lang=lang)