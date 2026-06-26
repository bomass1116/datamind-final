
# DataMind: Intelligent Data Analysis Platform

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.9+-blue.svg" alt="Python Version">
  <img src="https://img.shields.io/badge/Framework-Flask-green.svg" alt="Framework">
  <img src="https://img.shields.io/badge/Deployment-Render-orange.svg" alt="Deployment">
  <img src="https://img.shields.io/badge/Status-Production-brightgreen.svg" alt="Status">
  <img src="https://img.shields.io/badge/Optimized%20for-75%25%20Zoom-yellow.svg" alt="Optimized Zoom">
</p>

---

## 📖 Overview

**DataMind** adalah platform analisis data eksploratif (EDA) berbasis web yang dirancang untuk membantu pengguna mengubah data mentah menjadi keputusan cerdas secara instan. Platform ini mengintegrasikan pemrosesan statistik deskriptif, visualisasi interaktif multi-dimensi, pemodelan berbasis waktu (*time series*), hingga inferensi interpretasi otomatis yang ditenagai oleh kecerdasan buatan (AI Assistant).

Platform ini dibangun sebagai proyek final akademis untuk mendemonstrasikan kapabilitas rekayasa data (*data engineering*) dan interaksi antarmuka pengguna yang modern bagi para analis data, mahasiswa, maupun pengambil keputusan bisnis.

---

## ✨ Features

*   **Multi-Format Data Ingestion**: Mendukung unggah berkas berbasis `.csv`, `.xlsx`, dan `.txt`, dilengkapi opsi *Sample Dataset* komersial untuk uji coba instan.
*   **Comprehensive EDA Dashboard**: Menyediakan metrik KPI utama (Total Baris, Kolom, *Missing Cells*) serta tabel ringkasan statistik deskriptif untuk data numerik maupun kategorikal.
*   **Advanced Numerical & Categorical Visualization**: Menyajikan grafik interaktif otomatis mulai dari Univariate (Histogram, Boxplot, Density, QQ-Plot, Violin Plot), Bivariate, hingga Multivariate (Scatter Plot & Correlation Heatmap).
*   **Time Series Analytics**: Modul khusus untuk mendeteksi tren dan pergerakan rata-rata (*Rolling Mean* / *Moving Average*) berbasis urutan waktu secara otomatis.
*   **AI-Powered Insights Generator**: Memberikan narasi interpretasi otomatis, ringkasan kualitas data, deteksi *outlier*, hingga rekomendasi tindakan berbasis AI.
*   **Professional Report Exporting**: Fitur pratinjau laporan komprehensif hingga 7 halaman yang dapat diunduh ke dalam format PDF, Excel, HTML, maupun pembersihan data (Cleaned CSV).
*   **Dual Authentication Mode**: Dukungan penuh untuk *Registered Account Mode* untuk menyimpan riwayat analisis serta *Guest Mode* (Akses Tamu) untuk eksplorasi cepat.

---

## 📸 Screenshots

Berikut adalah alur antarmuka komponen utama dari platform **DataMind**:

### 🏠 1. Landing Page
Halaman utama yang menyajikan branding profesional, ringkasan fitur utama, informasi tim pengembang, serta akses langsung ke aplikasi.
*(Rujukan berkas: Cuplikan layar 2026-06-26 144403.jpg)*

### 🔐 2. Login & Guest Mode Authentication
Sistem autentikasi aman untuk masuk ke akun pengguna atau menggunakan akses cepat sebagai Tamu (*Guest*).
*(Rujukan berkas: Cuplikan layar 2026-06-26 144435.jpg)*

### 📤 3. Upload Dataset Interface
Antarmuka drag-and-drop yang bersih untuk mengunggah dataset atau memuat contoh data e-commerce yang telah disediakan.
*(Rujukan berkas: Cuplikan layar 2026-06-26 144558.png)*

### 📊 4. Core Analytical Dashboard
Pusat kendali visualisasi data yang menampilkan ringkasan metrik statistik, kualitas data, serta matriks grafik komparatif dalam satu layar terintegrasi.
*(Rujukan berkas: Cuplikan layar 2026-06-26 144507.jpg)*

### 💡 5. AI-Driven Interpretations & Insights
Modul cerdas yang menerjemahkan angka-angka statistik menjadi narasi poin-poin analisis dan rekomendasi yang mudah dipahami manusia.
*(Rujukan berkas: Cuplikan layar 2026-06-26 144646.jpg)*

### 📈 6. Deep Numerical Visualization
Visualisasi interaktif terperinci (seperti histogram) yang dilengkapi dengan interpretasi normalitas data otomatis tepat di bawah grafik.
*(Rujukan berkas: Cuplikan layar 2026-06-26 144726.png)*

### 🖨️ 7. Export & Automated Reporting System
Antarmuka penataan laporan otomatis multi-halaman lengkap dengan pratinjau dokumen sebelum melakukan ekspor ke PDF/Excel.
*(Rujukan berkas: Cuplikan layar 2026-06-26 144813.png)*

---

## 🛠️ Technology Stack

*   **Backend Framework**: Python, Flask
*   **Data Processing & Analytics**: Pandas, NumPy, SciPy
*   **Data Visualization**: Plotly, Matplotlib, Seaborn
*   **Frontend UI/UX**: HTML5, Modern CSS3 (Custom Responsive Layout), JavaScript

---

## 📂 Project Structure

```text
datamind-final/
├── app.py                  # Entry point utama aplikasi Flask
├── config.py               # Konfigurasi aplikasi dan environment
├── models/                 # Logika pemrosesan data dan AI
├── static/                 # Aset statis (CSS, JS, Gambar/Logo)
│   ├── css/
│   └── js/
├── templates/              # Berkas HTML (Landing, Login, Dashboard, dll.)
├── datasets/               # Sampel data bawaan (E-Commerce)
├── requirements.txt        # Daftar dependensi library Python
└── README.md               # Dokumentasi proyek
