# 📊 DataMind — Intelligent EDA Platform

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.9+-3776AB?logo=python&logoColor=white" alt="Python Version">
  <img src="https://img.shields.io/badge/Framework-Flask-000000?logo=flask&logoColor=white" alt="Framework">
  <img src="https://img.shields.io/badge/AI-Google%20Gemini-4285F4?logo=google&logoColor=white" alt="Gemini AI">
  <img src="https://img.shields.io/badge/Deployment-Render-46E3B7?logo=render&logoColor=white" alt="Deployment">
  <img src="https://img.shields.io/badge/Status-Production-brightgreen.svg" alt="Status">
</p>

<p align="center">
  <b>Ubah data mentah jadi keputusan cerdas — dalam hitungan detik.</b><br>
  <a href="https://datamind-final.onrender.com"><b>🔗 Live Demo</b></a>
</p>

---

## 📖 Tentang Proyek

**DataMind** adalah platform analisis data eksploratif (*Exploratory Data Analysis*) berbasis web yang mengubah dataset mentah menjadi insight siap pakai secara otomatis. Cukup unggah file data, dan DataMind akan menjalankan statistik deskriptif, lebih dari 20 jenis visualisasi interaktif, analisis time series, deteksi masalah kualitas data, hingga narasi interpretasi yang ditenagai **Google Gemini AI** — semuanya dalam satu dashboard terintegrasi.

Proyek ini dikembangkan sebagai Ujian Akhir Semester mata kuliah **Data Science Programming**, Program Studi Sains Data, Institut Teknologi Sains Bandung (ITSB).

> 🇬🇧 **English summary**: DataMind is a web-based Exploratory Data Analysis (EDA) platform built with Flask. It automatically generates descriptive statistics, 20+ interactive visualizations, time series analysis, data-quality diagnostics, and AI-generated narrative insights (via Google Gemini) from any uploaded dataset, then exports the results as a professional multi-page PDF, Excel, or HTML report.

---

## ✨ Fitur Utama

### 🔐 Autentikasi & Manajemen Pengguna
| Fitur | Status |
|---|---|
| Registrasi & Login (password hashing SHA-256 + salt) | ✅ |
| Mode Tamu (Guest Mode) untuk eksplorasi cepat | ✅ |
| Profil pengguna & foto avatar | ✅ |
| Riwayat analisis tersimpan per akun | ✅ |
| Reuse dataset dari riwayat sebelumnya | ✅ |

### 📤 Input & Manajemen Dataset
| Fitur | Status |
|---|---|
| Upload `.csv`, `.xlsx`, `.xls`, `.txt` | ✅ |
| Deteksi otomatis encoding & separator CSV | ✅ |
| Sample dataset bawaan (E-Commerce) untuk demo instan | ✅ |
| Auto-deteksi tipe data per kolom (numerik, kategorikal, datetime, boolean) | ✅ |

### 📊 Statistik Deskriptif
| Fitur | Status |
|---|---|
| Statistik numerik (mean, median, std dev, varians, skewness, kurtosis, CV) | ✅ |
| Uji normalitas (Shapiro-Wilk) | ✅ |
| Deteksi outlier (metode IQR) | ✅ |
| Statistik kategorikal (nominal, ordinal, boolean, datetime) | ✅ |
| Top-5 kategori, mode, & frekuensi | ✅ |

### 📈 Visualisasi Interaktif (20+ Jenis)
| Kategori | Grafik | Status |
|---|---|---|
| Univariate Numerik | Histogram, Boxplot, Density Plot, QQ-Plot, Violin Plot | ✅ |
| Univariate Kategorikal | Bar Chart, Pie Chart, Count Plot, Pareto Chart | ✅ |
| Multivariate / Bivariate | Scatter Plot, Correlation Heatmap, Regression Plot, Bubble Chart, Pair Plot Matrix | ✅ |
| Kategorikal vs Numerik | Boxplot by Category, Violin by Category, Grouped Bar, Strip Plot | ✅ |
| Time Series | Line Chart, Moving Average, Rolling Mean, Trend Line | ✅ |

### 🧹 Data Quality & Cleaning
| Fitur | Status |
|---|---|
| Data Quality Health Score (skor tertimbang otomatis) | ✅ |
| Analisis missing values (heatmap, pola, & detail per baris) | ✅ |
| Deteksi & penanganan duplikat | ✅ |
| Deteksi & penanganan outlier (IQR) | ✅ |
| Undo aksi cleaning | ✅ |

### 💡 AI-Powered Insight
| Fitur | Status |
|---|---|
| Narasi insight otomatis berbasis **Google Gemini API** | ✅ |
| Fallback rule-based insight jika API tidak tersedia | ✅ |
| Asisten chat AI interaktif dalam dashboard | ✅ |
| Insight kualitas data, distribusi, korelasi, & rekomendasi tindakan | ✅ |

### 🖨️ Export & Reporting
| Fitur | Status |
|---|---|
| Laporan PDF profesional multi-halaman (custom page selection) | ✅ |
| Export Excel multi-sheet | ✅ |
| Export HTML dashboard interaktif | ✅ |
| Export Cleaned CSV | ✅ |
| Fitur download terkunci untuk Guest Mode (mendorong registrasi) | ✅ |

### 🌐 UI/UX
| Fitur | Status |
|---|---|
| Dark Mode / Light Mode | ✅ |
| Bilingual — Bahasa Indonesia & English (i18n) | ✅ |
| Sidebar navigasi dengan pengelompokan section | ✅ |
| Pencarian fitur/kolom langsung dari navbar | ✅ |
| Responsive layout | ✅ |

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

## 🚀 Live Demo

🔗 **[https://datamind-final.onrender.com](https://datamind-final.onrender.com)**

> ⚠️ Catatan: deployment menggunakan free tier Render, sehingga server dapat mengalami *cold start* (membutuhkan beberapa detik di akses pertama setelah idle).

---

## ⚠️ Catatan Tampilan (Known Issue)

Pada sebagian laptop dengan resolusi/skala layar tertentu (umumnya browser zoom **100%**), elemen sidebar berpotensi tampil tidak proporsional. Jika hal ini terjadi, disarankan mengatur **browser zoom ke kisaran 75–90%** untuk tampilan optimal.

Perilaku ini bersifat *device-dependent* — tidak semua perangkat mengalaminya, dan beberapa laptop tetap menampilkan layout dengan normal pada zoom 100%. Penyesuaian responsif lebih lanjut direncanakan pada update berikutnya.

---

## 🛠️ Tech Stack

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

## 📂 Struktur Proyek

```text
datamind_fixed/
├── app.py                          # Entry point Flask — routing & API utama
├── requirements.txt                # Daftar dependensi Python
├── .env                            # API key Gemini (tidak disertakan di repo)
│
├── backend/
│   ├── data_loader.py              # Load CSV/Excel/TXT, deteksi encoding & separator
│   ├── preprocessing.py            # Deteksi tipe data kolom otomatis
│   ├── descriptive_stats.py        # Statistik numerik, uji normalitas, deteksi outlier
│   ├── categorical_analysis.py     # Statistik kategorikal, ordinal, boolean, datetime
│   ├── visualization.py            # 20+ chart generator berbasis Plotly
│   ├── time_series.py              # Deteksi & analisis time series otomatis
│   ├── insight_generator.py        # Integrasi Google Gemini + fallback rule-based
│   └── export_report.py            # Generator laporan PDF / Excel / HTML
│
├── frontend/
│   ├── templates/
│   │   └── dashboard.html          # Single-page dashboard (landing, auth, & app)
│   └── static/
│       ├── css/style.css           # Tema dark/light & layout responsif
│       └── js/script.js            # Logika frontend, i18n, dan interaktivitas
│
├── data/
│   ├── raw/                        # Dataset mentah dari pengguna
│   ├── raw_user/                   # Dataset per akun pengguna
│   ├── history/                    # Riwayat analisis per pengguna
│   └── users.json                  # Penyimpanan akun (hashed password)
│
└── outputs/
    ├── reports/                    # Laporan PDF hasil ekspor
    └── exported_files/             # Hasil ekspor HTML/Excel
```

---

## ⚙️ Instalasi & Menjalankan Secara Lokal

### 1. Persyaratan

- Python 3.9 atau lebih baru
- pip (Python package manager)
- API Key Google Gemini ([dapatkan di sini](https://aistudio.google.com/apikey)) — opsional, untuk fitur AI Insight

### 2. Clone & Setup

```bash
# Masuk ke folder project
cd datamind_fixed

# Buat virtual environment
python -m venv venv

# Aktifkan virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install seluruh dependencies
pip install -r requirements.txt
```

### 3. Konfigurasi Environment

Buat file `.env` di root folder, isi dengan API key Gemini kamu:

```env
GEMINI_API_KEY=your_api_key_here
```

> Jika `.env` tidak diisi, fitur AI Insight akan otomatis fallback ke insight berbasis rule Python.

### 4. Jalankan Aplikasi

```bash
python app.py
```

Buka browser dan akses: **http://localhost:5000**

---

## 🔌 API Endpoints

| Method | Endpoint | Fungsi |
|---|---|---|
| POST | `/api/register` | Registrasi akun baru |
| POST | `/api/login` | Login pengguna |
| POST | `/api/logout` | Logout pengguna |
| GET | `/` | Halaman utama (landing/dashboard) |
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
| GET | `/api/missing_overview` \| `/api/missing_info` \| `/api/missing_heatmap` \| `/api/missing_rows` \| `/api/missing_pattern_rows` | Analisis missing values |
| POST | `/api/handle_missing` | Tangani missing values |
| GET | `/api/duplicate_info` | Info data duplikat |
| POST | `/api/handle_duplicate` | Tangani duplikat |
| GET | `/api/outlier_info` \| `/api/outlier_rows` | Deteksi outlier |
| POST | `/api/handle_outlier` | Tangani outlier |
| GET | `/api/dq_health_score` | Skor kesehatan data |
| GET | `/export/cleaned_csv` | Export CSV bersih |
| GET | `/export/pdf` | Export laporan PDF |
| POST | `/export/pdf_custom` | Export PDF dengan halaman custom |
| GET | `/export/excel` | Export Excel |
| GET | `/export/html` \| POST `/export/html_custom` | Export HTML dashboard |
| GET/POST | `/api/user/profile` | Profil pengguna |
| GET | `/api/user/history` | Riwayat analisis |
| POST | `/api/user/history/<entry_id>/reload` | Muat ulang dataset dari riwayat |
| POST | `/api/user/avatar` | Upload foto profil |

---

## 🐍 Dependencies Utama

| Package | Fungsi |
|---|---|
| `flask` | Web framework |
| `pandas` | Manipulasi & analisis data |
| `numpy` | Komputasi numerik |
| `scipy` | Statistik (uji normalitas Shapiro-Wilk, dsb.) |
| `plotly` | Visualisasi data interaktif |
| `openpyxl` | Baca/tulis file Excel |
| `reportlab` | Generator laporan PDF |
| `google-genai` | Integrasi AI Insight (Google Gemini) |
| `python-dotenv` | Manajemen environment variable |
| `chardet` | Deteksi encoding file otomatis |

---

## 🔧 Troubleshooting

**Port sudah dipakai?**
```bash
# Ganti port di baris terakhir app.py
app.run(port=5001, debug=True)
```

**Error saat install dependencies?**
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

**File CSV tidak terbaca dengan benar?**
Pastikan encoding UTF-8. Jika ada karakter khusus, simpan ulang sebagai *CSV UTF-8* dari Excel — DataMind tetap memiliki deteksi encoding otomatis sebagai fallback.

**Sidebar tampil tidak proporsional?**
Lihat bagian [Catatan Tampilan](#️-catatan-tampilan-known-issue) di atas — atur browser zoom ke 75–90%.

**Fitur AI Insight tidak merespons?**
Periksa apakah `GEMINI_API_KEY` sudah diisi dengan benar di file `.env`. Jika kuota API habis atau key tidak valid, sistem akan otomatis fallback ke insight berbasis rule.

**Fitur Download terkunci?**
Fitur export PDF/Excel/HTML memang dibatasi untuk pengguna **Guest**. Login atau buat akun gratis untuk membukanya.

---

## 👥 Tim Pengembang — Kelompok 4 · Kelas B

| No | Nama | NIM | Peran |
|---|---|---|---|
| 1 | Den Yuan Frasseka | 52250050 | Project Lead & Koordinator Analisis Data |
| 2 | Boma Satrio Wicaksono D. | 52250061 | Backend Development & Data Pipeline |
| 3 | Frizzy Litmensyah | 52250062 | EDA & Pembuatan Visualisasi Grafik |
| 4 | Angelica Florentina M. | 52250063 | UI/UX Design Dashboard & Frontend |
| 5 | Adam Richie Wijaya | 52250064 | Statistical Analysis & Insight Generator |
| 6 | Andre | 52250065 | Data Cleaning, Preprocessing & Validasi |

**Dosen Pengampu:** Bakti Siregar, M.Sc., CDS

---

<p align="center">
  <i>Institut Teknologi Sains Bandung (ITSB) — Program Studi Sains Data</i><br>
  <i>Mata Kuliah Data Science Programming · 2026</i>
</p>
