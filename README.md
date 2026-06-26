# DataMind 📊
**Intelligent EDA Platform — Data Science Programming**

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.9+-3776AB?logo=python&logoColor=white" alt="Python Version">
  <img src="https://img.shields.io/badge/Framework-Flask-000000?logo=flask&logoColor=white" alt="Framework">
  <img src="https://img.shields.io/badge/AI-Google%20Gemini-4285F4?logo=google&logoColor=white" alt="Gemini AI">
  <img src="https://img.shields.io/badge/Deployment-Render-46E3B7?logo=render&logoColor=white" alt="Deployment">
  <img src="https://img.shields.io/badge/Status-Production-brightgreen.svg" alt="Status">
</p>

> Ujian Akhir Semester — Data Science Programming | ITSB
> Kelompok 4 — Kelas B

🔗 **Live Demo:** [datamind-final.onrender.com](https://datamind-final.onrender.com)

---

## 📖 Overview

**DataMind** adalah platform analisis data eksploratif (EDA) berbasis web yang mengubah dataset mentah menjadi insight siap pakai secara otomatis. Cukup unggah file data, dan DataMind akan menjalankan statistik deskriptif, lebih dari 20 jenis visualisasi interaktif, analisis time series, deteksi masalah kualitas data, hingga narasi interpretasi yang ditenagai **Google Gemini AI** — semuanya dalam satu dashboard terintegrasi.

---

## 🚀 Quick Start

### 1. Persyaratan / Requirements

- Python 3.9 atau lebih baru
- pip (Python package manager)
- API Key Google Gemini ([dapatkan di sini](https://aistudio.google.com/apikey)) — opsional, untuk fitur AI Insight

### 2. Instalasi / Installation

```bash
# Clone atau extract project ini ke folder pilihan Anda
# Buka terminal di VS Code: Terminal > New Terminal

# Masuk ke folder project
cd datamind_fixed

# Buat virtual environment
python -m venv venv

# Aktifkan virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install semua dependencies
pip install -r requirements.txt
```

Buat file `.env` di root folder untuk mengaktifkan AI Insight:

```env
GEMINI_API_KEY=your_api_key_here
```

> Jika `.env` tidak diisi, fitur AI Insight otomatis fallback ke insight berbasis rule Python.

### 3. Jalankan Aplikasi / Run the App

```bash
python app.py
```

Buka browser dan akses: **http://localhost:5000**

> ⚠️ **Catatan tampilan**: pada sebagian laptop dengan browser zoom 100%, sidebar bisa tampil tidak proporsional. Jika terjadi, atur **browser zoom ke 75–90%** untuk tampilan optimal. Bersifat *device-dependent* — tidak semua laptop mengalaminya.

---

## 📁 Struktur Project

```text
datamind_fixed/
├── app.py                          ← Main Flask server (routes & API)
├── requirements.txt                ← Python dependencies
├── README.md                       ← Panduan ini
├── .env                             ← API key Gemini (tidak disertakan di repo)
│
├── backend/
│   ├── data_loader.py              ← Load Excel / CSV / TXT, deteksi encoding & separator
│   ├── preprocessing.py            ← Deteksi tipe data kolom otomatis
│   ├── descriptive_stats.py        ← Statistik numerik, uji normalitas, deteksi outlier
│   ├── categorical_analysis.py     ← Statistik kategorikal, ordinal, boolean, datetime
│   ├── visualization.py            ← 20+ chart generator (Plotly)
│   ├── time_series.py              ← Deteksi & analisis time series otomatis
│   ├── insight_generator.py        ← Integrasi Google Gemini + fallback rule-based
│   └── export_report.py            ← Generator laporan PDF / Excel / HTML
│
├── frontend/
│   ├── templates/
│   │   └── dashboard.html          ← Landing, login/register, & dashboard (single-page)
│   └── static/
│       ├── css/style.css           ← Tampilan (dark/light mode, tema)
│       └── js/script.js            ← Logika frontend + i18n bilingual
│
├── data/
│   ├── raw/                        ← File dataset yang diunggah pengguna
│   ├── raw_user/                   ← Dataset per akun pengguna
│   ├── history/                    ← Riwayat analisis per pengguna
│   └── users.json                  ← Penyimpanan akun (hashed password)
│
└── outputs/
    ├── reports/                    ← Laporan PDF hasil ekspor
    └── exported_files/             ← Hasil ekspor HTML/Excel
```

---

## ✅ Fitur Lengkap

### 🔐 Autentikasi

| Fitur | Status |
|---|---|
| Registrasi akun baru (password hashing SHA-256 + salt) | ✅ |
| Login / Logout | ✅ |
| Mode Tamu (Guest Mode) | ✅ |
| Session management | ✅ |
| Profil pengguna (nama & foto avatar) | ✅ |

### 📂 Manajemen Dataset

| Fitur | Status |
|---|---|
| Upload Excel (.xlsx / .xls) | ✅ |
| Upload CSV (.csv) | ✅ |
| Upload Text (.txt) | ✅ |
| Deteksi otomatis encoding & separator | ✅ |
| Sample dataset bawaan (E-Commerce) | ✅ |
| Riwayat dataset per pengguna | ✅ |
| Reuse dataset dari riwayat sebelumnya | ✅ |
| Ekspor data ke CSV (cleaned) | ✅ |

### 📋 Pratinjau & Info Data

| Fitur | Status |
|---|---|
| Auto deteksi tipe data kolom (numerik, kategorikal, datetime, boolean) | ✅ |
| Data Preview (tabel interaktif) | ✅ |
| Dataset Information (baris, kolom, missing cells) | ✅ |
| Pencarian fitur/kolom dari navbar | ✅ |

### 📊 Statistik Deskriptif

| Fitur | Status |
|---|---|
| Statistik Numerik | ✅ |
| Statistik Kategorikal | ✅ |
| Data Quality Health Score | ✅ |

### 📈 Visualisasi (20+ Jenis)

| Fitur | Status |
|---|---|
| Numerical Viz (Histogram, Boxplot, Density, QQ-Plot, Violin Plot) | ✅ |
| Categorical Viz (Bar Chart, Pie Chart, Count Plot, Pareto Chart) | ✅ |
| Multivariate / Bivariate (Scatter, Correlation Heatmap, Regression Plot, Bubble Chart, Pair Plot) | ✅ |
| Categorical vs Numerical (Boxplot by Category, Grouped Bar, Strip Plot) | ✅ |
| Time Series (Line Chart, Moving Average, Rolling Mean, Trend) | ✅ |

### 🧹 Data Cleaning

| Fitur | Status |
|---|---|
| Analisis missing values (heatmap, pola, & detail per baris) | ✅ |
| Deteksi & penanganan duplikat | ✅ |
| Deteksi & penanganan outlier (IQR) | ✅ |
| Undo aksi cleaning | ✅ |
| State cleaned dataset tersimpan di sesi | ✅ |

### 💡 Insight & Ekspor

| Fitur | Status |
|---|---|
| AI Insight otomatis (Google Gemini API) | ✅ |
| Fallback rule-based insight | ✅ |
| Chat dengan AI Assistant interaktif | ✅ |
| Ekspor laporan PDF multi-halaman (custom page selection) | ✅ |
| Ekspor Excel multi-sheet | ✅ |
| Ekspor HTML dashboard interaktif | ✅ |
| Fitur download terkunci untuk Guest Mode | ✅ |

### 🌐 UI / UX

| Fitur | Status |
|---|---|
| Dark / Light Mode | ✅ |
| Bahasa Indonesia / English (i18n) | ✅ |
| Responsive UI | ✅ |
| Sidebar navigasi dengan section label | ✅ |

---

## 📸 Tampilan Aplikasi

### 🏠 Landing Page
Halaman utama dengan branding, ringkasan fitur unggulan, serta informasi dosen pengampu dan kelompok.

![Landing Page](docs/screenshots/01-landing.png)

### 🔐 Login & Guest Mode
Autentikasi pengguna terdaftar atau akses cepat sebagai tamu, dengan keterangan jelas mengenai fitur yang terkunci pada mode tamu.

![Login Page](docs/screenshots/02-login.png)

### 📊 Dashboard Analitik
Pusat kendali yang menyajikan ringkasan metrik, kualitas data, dan matriks visualisasi komparatif dalam satu layar.

![Dashboard](docs/screenshots/03-dashboard.png)

### 📤 Upload Dataset
Antarmuka unggah data yang sederhana, dengan opsi langsung memuat sample dataset E-Commerce untuk demo.

![Upload Data](docs/screenshots/04-upload.png)

### 💡 Interpretasi & AI Insight
Insight otomatis dari statistik dataset, dilengkapi narasi analisis berbahasa natural yang dihasilkan AI.

![AI Insight](docs/screenshots/05-insights.png)

### 📈 Visualisasi Mendalam
Grafik interaktif lengkap dengan interpretasi otomatis tepat di bawah setiap visualisasi.

![Visualisasi Numerik](docs/screenshots/06-visualization.png)

### 🖨️ Export Laporan
Pratinjau laporan multi-halaman sebelum diekspor ke PDF, Excel, atau HTML.

![Export Laporan](docs/screenshots/07-export.png)

---

## 📊 Statistik yang Dihitung

### Numerik
Mean, Median, Std Dev, Variance, Skewness, Kurtosis, Coefficient of Variation,
Missing Count & %, Uji Distribusi Normal (Shapiro-Wilk), Outlier Count (IQR)

### Kategorik
Unique Categories, Mode, Mode Frequency & %, Missing Count & %, Top 5 Categories,
dukungan tipe Nominal, Ordinal, Boolean, dan Datetime

---

## 🛠️ Technology Stack

| Layer | Teknologi |
|---|---|
| **Backend** | Python, Flask |
| **AI Engine** | Google Gemini API (`google-genai`) |
| **Data Processing** | Pandas, NumPy, SciPy |
| **Visualisasi** | Plotly |
| **Report Generation** | ReportLab (PDF), openpyxl (Excel) |
| **Encoding Detection** | chardet |
| **Frontend** | HTML5, CSS3 (Custom Responsive Layout), JavaScript |
| **Autentikasi** | hashlib (SHA-256) + salt, Flask session |
| **Deployment** | Render |

---

## 🔌 API Endpoints

| Method | Endpoint | Fungsi |
|---|---|---|
| POST | `/api/register` | Registrasi akun baru |
| POST | `/api/login` | Login pengguna |
| POST | `/api/logout` | Logout pengguna |
| POST | `/upload` | Upload dataset |
| POST | `/load_sample` | Muat sample dataset E-Commerce |
| GET | `/api/overview` | Ringkasan metrik dataset |
| GET | `/api/preview` | Pratinjau data |
| GET | `/api/column_info` | Info tipe data kolom |
| GET | `/api/stats/numerical` | Statistik numerik |
| GET | `/api/stats/categorical` | Statistik kategorikal |
| GET | `/api/charts` | Daftar chart tersedia |
| POST | `/api/chart_col` | Generate chart per kolom |
| GET | `/api/charts/all` | Generate seluruh chart |
| GET | `/api/timeseries` | Analisis time series |
| POST | `/api/insight` | Generate AI insight |
| POST | `/api/chat` | Chat dengan AI Assistant |
| POST | `/api/undo` | Undo aksi cleaning |
| GET | `/api/missing_overview`, `/api/missing_info`, `/api/missing_heatmap` | Analisis missing values |
| POST | `/api/handle_missing` | Tangani missing values |
| GET | `/api/duplicate_info` | Info data duplikat |
| POST | `/api/handle_duplicate` | Tangani duplikat |
| GET | `/api/outlier_info`, `/api/outlier_rows` | Deteksi outlier |
| POST | `/api/handle_outlier` | Tangani outlier |
| GET | `/api/dq_health_score` | Skor kesehatan data |
| GET | `/export/cleaned_csv` | Ekspor CSV bersih |
| GET | `/export/pdf` | Ekspor laporan PDF |
| POST | `/export/pdf_custom` | Ekspor PDF dengan halaman custom |
| GET | `/export/excel` | Ekspor Excel |
| GET/POST | `/export/html`, `/export/html_custom` | Ekspor HTML dashboard |
| GET/POST | `/api/user/profile` | Profil pengguna |
| GET | `/api/user/history` | Riwayat dataset |
| POST | `/api/user/history/<entry_id>/reload` | Gunakan ulang dataset dari riwayat |
| POST | `/api/user/avatar` | Upload foto profil |

---

## 🐍 Dependencies Utama

| Package | Fungsi |
|---|---|
| Flask | Web framework |
| Pandas | Manipulasi data |
| NumPy | Komputasi numerik |
| SciPy | Statistik (Shapiro-Wilk, dsb.) |
| Plotly | Visualisasi data interaktif |
| openpyxl | Baca/tulis Excel (.xlsx) |
| reportlab | Generator laporan PDF |
| google-genai | Integrasi AI Insight (Google Gemini) |
| python-dotenv | Manajemen environment variable |
| chardet | Deteksi encoding file otomatis |

---

## 🔧 Troubleshooting

**Port sudah dipakai?**
```bash
# Ganti port di baris terakhir app.py:
app.run(port=5001, debug=True)
```

**Error install dependencies?**
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

**File CSV tidak terbaca?**
Pastikan encoding UTF-8. Jika ada karakter khusus, simpan ulang di Excel sebagai *CSV UTF-8* — DataMind juga punya deteksi encoding otomatis sebagai fallback.

**Halaman tidak terupdate setelah perubahan JS/CSS?**
Lakukan hard refresh di browser: `Ctrl + Shift + R` (Windows/Linux) atau `Cmd + Shift + R` (Mac).

**Sidebar tampil tidak proporsional?**
Atur browser zoom ke 75–90%. Lihat catatan di bagian [Quick Start](#-quick-start).

**Fitur AI Insight tidak merespons?**
Periksa `GEMINI_API_KEY` di file `.env`. Jika kuota habis/key tidak valid, sistem otomatis fallback ke insight rule-based.

**Fitur Download terkunci?**
Export PDF/Excel/HTML dibatasi untuk pengguna **Guest**. Login atau buat akun gratis untuk membukanya.

---

## 👥 Kelompok 4 — Kelas B

| No | Nama | NIM |
|---|---|---|
| 1 | Den Yuan Frasseka | 52250050 |
| 2 | Boma Satrio Wicaksono D. | 52250061 |
| 3 | Frizzy Litmensyah | 52250062 |
| 4 | Angelica Florentina M. | 52250063 |
| 5 | Adam Richie Wijaya | 52250064 |
| 6 | Andre | 52250065 |

**Dosen Pengampu:** Bakti Siregar, M.Sc., CDS

---

*Institut Teknologi Sains Bandung (ITSB) — Data Science Programming*
