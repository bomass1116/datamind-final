"""
FILE    : app.py
KEGUNAAN: Entry point utama DataMind V2 — Intelligent Auto EDA Platform
"""

import os, json, logging
from dotenv import load_dotenv
load_dotenv()
import pandas as pd
from flask import Flask, request, jsonify, render_template, send_file, session, Response

try:
    from google import genai
    GENAI_SDK_AVAILABLE = True
except ImportError:
    GENAI_SDK_AVAILABLE = False

BASE_DIR   = os.path.dirname(os.path.abspath(__file__))

from backend.data_loader      import load_file, load_sample
from backend.preprocessing    import preprocess
from backend.descriptive_stats import get_numerical_stats
from backend.categorical_analysis import get_categorical_stats
from backend.insight_generator import generate_insight
from backend.export_report    import export_pdf, export_excel, export_html
from backend.visualization    import generate_all_charts
from backend.time_series      import detect_time_series, get_ts_summary

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__,
    template_folder='frontend/templates',
    static_folder='frontend/static')
app.secret_key = 'datamind-v2-secret-2024'

os.makedirs(os.path.join(BASE_DIR, "data", "raw"), exist_ok=True)
os.makedirs(os.path.join(BASE_DIR, "outputs", "reports"), exist_ok=True)
os.makedirs(os.path.join(BASE_DIR, "outputs", "exported_files"), exist_ok=True)
os.makedirs(os.path.join(BASE_DIR, "outputs", "exported_files"), exist_ok=True)

# ── IN-MEMORY DATA STORE ──────────────────────────────────────
# Fix KRITIS: sebelumnya pakai JSON file yang merusak tipe data.
# Sekarang simpan DataFrame langsung di memory.
_DATA = {
    'df': None,
    'meta': None,
    'filename': None,
    'df_snapshot': None,
}

def load_df():
    return _DATA['df']

def load_meta():
    return _DATA['meta'] or {}

def save_df(df):
    _DATA['df'] = df

def save_meta(meta):
    _DATA['meta'] = meta

def health_badge(pct):
    if pct < 5:   return ('clean',    'Excellent', '#D4AF37')
    if pct < 20:  return ('warning',  'Warning',   '#E65100')
    return              ('critical',  'Critical',  '#C62828')

# ── AUTH (file-based, sederhana) ──────────────────────────────
import hashlib, secrets

USERS_FILE = os.path.join(BASE_DIR, 'data', 'users.json')

def _load_users():
    if not os.path.exists(USERS_FILE):
        return {}
    try:
        with open(USERS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return {}

def _save_users(users):
    os.makedirs(os.path.dirname(USERS_FILE), exist_ok=True)
    with open(USERS_FILE, 'w', encoding='utf-8') as f:
        json.dump(users, f, indent=2)

def _hash_password(password, salt=None):
    salt = salt or secrets.token_hex(16)
    h = hashlib.sha256((salt + password).encode('utf-8')).hexdigest()
    return f"{salt}${h}"

def _verify_password(password, stored):
    try:
        salt, _ = stored.split('$', 1)
    except ValueError:
        return False
    return _hash_password(password, salt) == stored

def _login_required_response(lang='id'):
    """Pesan standar saat fitur download diakses oleh pengguna tamu (belum login)."""
    msg = ('This feature is locked for guests. Please log in or create a free account to download reports.'
           if lang == 'en' else
           'Fitur ini terkunci untuk tamu. Silakan login atau buat akun gratis untuk mengunduh laporan.')
    return jsonify({'error': 'login_required', 'message': msg}), 403

# ── ROUTES ───────────────────────────────────────────────────

@app.route('/api/register', methods=['POST'])
def api_register():
    try:
        data = request.get_json(force=True) or {}
        name = (data.get('name') or '').strip()
        email = (data.get('email') or '').strip().lower()
        password = (data.get('password') or '').strip()
        if not name or not email or not password:
            return jsonify({'success': False, 'error': 'Lengkapi semua kolom ya!'}), 400
        if len(password) < 4:
            return jsonify({'success': False, 'error': 'Password minimal 4 karakter'}), 400

        users = _load_users()
        if email in users:
            return jsonify({'success': False, 'error': 'Email sudah terdaftar, silakan login'}), 400

        users[email] = {
            'name': name,
            'email': email,
            'password': _hash_password(password),
        }
        _save_users(users)
        return jsonify({'success': True, 'message': 'Akun berhasil dibuat, silakan login'})
    except Exception as e:
        logger.error(f"Register error: {e}")
        return jsonify({'success': False, 'error': 'Terjadi kesalahan server'}), 500

@app.route('/api/login', methods=['POST'])
def api_login():
    try:
        data = request.get_json(force=True) or {}
        email = (data.get('email') or '').strip().lower()
        password = (data.get('password') or '').strip()
        if not email or not password:
            return jsonify({'success': False, 'error': 'Lengkapi semua kolom ya!'}), 400

        users = _load_users()
        user = users.get(email)
        if not user or not _verify_password(password, user['password']):
            return jsonify({'success': False, 'error': 'Email atau password salah'}), 401

        session['user_email'] = email
        session['user_name'] = user['name']
        return jsonify({'success': True, 'user': {'name': user['name'], 'email': email}})
    except Exception as e:
        logger.error(f"Login error: {e}")
        return jsonify({'success': False, 'error': 'Terjadi kesalahan server'}), 500

@app.route('/api/logout', methods=['POST'])
def api_logout():
    session.pop('user_email', None)
    session.pop('user_name', None)
    return jsonify({'success': True})

@app.route('/')
def index():
    if _DATA['df'] is None:
        try:
            df, col_meta = load_sample()
            save_df(df)
            save_meta(col_meta)
            _DATA['filename'] = 'sales_data_sample.csv'
        except Exception as e:
            logger.error(f"Gagal load sample dataset: {e}")
    return render_template('dashboard.html')

@app.route('/upload', methods=['POST'])
def upload():
    if 'file' not in request.files:
        return jsonify({'success': False, 'error': 'Tidak ada file.'})
    f = request.files['file']
    if f.filename == '':
        return jsonify({'success': False, 'error': 'Nama file kosong.'})
    
    ext = f.filename.rsplit('.', 1)[-1].lower()
    if ext not in ['csv', 'xlsx', 'xls', 'txt']:
        return jsonify({'success': False, 'error': 'Format tidak didukung. Gunakan CSV, XLSX, atau TXT.'})
    
    # Validasi ukuran file (maks 50MB)
    f.seek(0, 2)
    file_size = f.tell()
    f.seek(0)
    max_size = 50 * 1024 * 1024  # 50MB
    if file_size > max_size:
        return jsonify({'success': False, 'error': f'File terlalu besar ({file_size/1024/1024:.1f}MB). Maksimal 50MB.'})
    
    path = os.path.join(BASE_DIR, 'data', 'raw', f.filename)
    f.save(path)
    try:
        df = load_file(path)
        
        # Validasi data
        if df is None or df.empty:
            return jsonify({'success': False, 'error': 'File kosong atau tidak dapat dibaca.'})
        if len(df) < 2:
            return jsonify({'success': False, 'error': 'Minimal 2 baris data required.'})
        if len(df.columns) < 1:
            return jsonify({'success': False, 'error': 'Tidak ada kolom yang terdeteksi.'})
        
        # Cek duplikat nama kolom
        if len(df.columns) != len(set(df.columns)):
            dupes = [c for c in df.columns if list(df.columns).count(c) > 1]
            return jsonify({'success': False, 'error': f'Nama kolom duplikat: {list(set(dupes))}. Harap unik.'})
        
        df, col_meta = preprocess(df)
        save_df(df)
        save_meta(col_meta)
        _DATA['filename'] = f.filename
        
        logger.info(f"Upload berhasil: {f.filename} ({len(df)} baris, {len(df.columns)} kolom)")
        return jsonify({'success': True, 'filename': f.filename, 'rows': len(df), 'cols': len(df.columns)})
    except Exception as e:
        logger.error(f"Upload error: {e}")
        return jsonify({'success': False, 'error': f'Gagal memproses file: {str(e)}'})
    finally:
        # Hapus file dari disk setelah diproses (data sudah di memory)
        try:
            if os.path.exists(path):
                os.remove(path)
        except:
            pass

@app.route('/load_sample', methods=['POST'])
def load_sample_route():
    try:
        df, col_meta = load_sample()
        save_df(df)
        save_meta(col_meta)
        fname = 'sales_data_sample.csv'
        _DATA['filename'] = fname
        # Catat history untuk user yang login
        try:
            email = session.get('user_email')
            if email:
                safe_email = email.replace('@','_at_').replace('.','_')
                raw_path = os.path.join(RAW_DIR, f"{safe_email}_{fname}")
                if not os.path.exists(raw_path):
                    df.to_csv(raw_path, index=False)
                _record_history(email, fname, len(df), len(df.columns), raw_path)
        except Exception as he:
            logger.warning(f"History record for sample: {he}")
        logger.info("Sample dataset loaded")
        return jsonify({'success': True})
    except Exception as e:
        logger.error(f"Load sample error: {e}")
        return jsonify({'success': False, 'error': str(e)})

# ── API ENDPOINTS ─────────────────────────────────────────────

@app.route('/api/overview')
def api_overview():
    df = load_df()
    if df is None: return jsonify({'error': 'No data'})
    col_meta = load_meta()
    missing  = int(df.isnull().sum().sum())
    miss_pct = round(missing / max(df.size, 1) * 100, 2)
    hclass, hlabel, hcolor = health_badge(miss_pct)
    num_cols = sum(1 for v in col_meta.values() if v in ('interval','ratio'))
    cat_cols = sum(1 for v in col_meta.values() if v in ('nominal','ordinal'))
    dt_cols  = sum(1 for v in col_meta.values() if v == 'datetime')
    return jsonify({
        'rows': len(df), 'cols': len(df.columns),
        'num_cols': num_cols, 'cat_cols': cat_cols,
        'dt_cols': dt_cols, 'missing': missing,
        'missing_pct': miss_pct, 'health': hlabel,
        'health_color': hcolor,
        'filename': _DATA.get('filename', 'sales_data_sample.csv'),
    })

@app.route('/api/preview')
def api_preview():
    df = load_df()
    if df is None: return jsonify({'columns': [], 'data': [], 'total': 0})
    limit = request.args.get('limit', '10')
    try:
        d = df if limit == 'all' else df.head(int(limit))
    except:
        d = df.head(10)
    d = d.where(pd.notnull(d), None)
    return jsonify({
        'columns': d.columns.tolist(),
        'data': d.to_dict(orient='records'),
        'total': len(df)
    })

@app.route('/api/column_info')
def api_column_info():
    df = load_df()
    if df is None: return jsonify([])
    col_meta = load_meta()
    result = []
    for col in df.columns:
        s = df[col]
        result.append({
            'name': col,
            'dtype': str(s.dtype),
            'scale': col_meta.get(col, 'nominal'),
            'unique': int(s.nunique()),
            'missing': int(s.isnull().sum()),
            'missing_pct': round(s.isnull().sum() / max(len(s),1) * 100, 2),
            'sample': str(s.dropna().iloc[0]) if len(s.dropna()) > 0 else '-',
        })
    return jsonify(result)

@app.route('/api/stats/numerical')
def api_numerical():
    df = load_df()
    if df is None: return jsonify([])
    return jsonify(get_numerical_stats(df, load_meta()))

@app.route('/api/stats/categorical')
def api_categorical():
    df = load_df()
    if df is None: return jsonify([])
    return jsonify(get_categorical_stats(df, load_meta()))

@app.route('/api/charts')
def api_charts():
    df = load_df()
    if df is None: return jsonify({})
    try:
        charts = generate_all_charts(df, load_meta())
        return jsonify(charts)
    except Exception as e:
        logger.error(f"Charts error: {e}")
        return jsonify({'error': str(e)})
    
@app.route('/api/chart_col', methods=['POST'])
def api_chart_col():
    """Re-generate a single chart for a specific column selection."""
    df = load_df()
    if df is None: return jsonify({'error': 'No data'})
    col_meta = load_meta()
    body = request.get_json(silent=True) or {}
    chart_type = body.get('chart_type', '')
    x_col  = body.get('x_col', '')
    y_col  = body.get('y_col', '')
    z_col  = body.get('z_col', '')

    from backend.visualization import (
        histogram, boxplot, density_plot, qq_plot, violin_plot,
        bar_chart, pie_chart, count_plot, pareto_chart,
        scatter_plot, correlation_heatmap, regression_plot,
        bubble_chart, boxplot_by_category, violin_by_category,
        grouped_bar_chart, strip_plot
    )

    def valid_num(c): return c and c in df.columns and pd.api.types.is_numeric_dtype(df[c])
    def valid_col(c): return c and c in df.columns

    all_num_cols = [c for c in df.columns if pd.api.types.is_numeric_dtype(df[c])]
    all_cat_cols = [c for c in df.columns if col_meta.get(c) in ('nominal','ordinal','boolean') and df[c].nunique() < 50]

    if chart_type in ('scatter', 'regression', 'bubble'):
        if not x_col and y_col and all_num_cols:
            x_col = next((c for c in all_num_cols if c != y_col), all_num_cols[0])
        if not y_col and x_col and len(all_num_cols) > 1:
            y_col = next((c for c in all_num_cols if c != x_col), all_num_cols[0])
        if not z_col and chart_type == 'bubble' and len(all_num_cols) > 2:
            z_col = next((c for c in all_num_cols if c not in (x_col, y_col)), all_num_cols[0])

    if chart_type in ('boxplot_cat', 'violin_cat', 'grouped_bar', 'strip_plot'):
        if not x_col and all_cat_cols:
            x_col = all_cat_cols[0]
        if not y_col and all_num_cols:
            y_col = all_num_cols[0]

    try:
        fig = None
        if chart_type == 'histogram'    and valid_num(x_col): fig = histogram(df, x_col)
        elif chart_type == 'boxplot'    and valid_num(x_col): fig = boxplot(df, x_col)
        elif chart_type == 'density'    and valid_num(x_col): fig = density_plot(df, x_col)
        elif chart_type == 'qq_plot'    and valid_num(x_col): fig = qq_plot(df, x_col)
        elif chart_type == 'violin'     and valid_num(x_col): fig = violin_plot(df, x_col)
        elif chart_type == 'bar_chart'  and valid_col(x_col): fig = bar_chart(df, x_col)
        elif chart_type == 'pie_chart'  and valid_col(x_col): fig = pie_chart(df, x_col)
        elif chart_type == 'count_plot' and valid_col(x_col): fig = count_plot(df, x_col)
        elif chart_type == 'pareto_chart' and valid_col(x_col): fig = pareto_chart(df, x_col)
        elif chart_type == 'scatter'    and valid_num(x_col) and valid_num(y_col): fig = scatter_plot(df, x_col, y_col)
        elif chart_type == 'regression' and valid_num(x_col) and valid_num(y_col): fig = regression_plot(df, x_col, y_col)
        elif chart_type == 'bubble'     and valid_num(x_col) and valid_num(y_col) and valid_num(z_col): fig = bubble_chart(df, x_col, y_col, z_col)
        elif chart_type == 'boxplot_cat'  and valid_col(x_col) and valid_num(y_col): fig = boxplot_by_category(df, x_col, y_col)
        elif chart_type == 'violin_cat'   and valid_col(x_col) and valid_num(y_col): fig = violin_by_category(df, x_col, y_col)
        elif chart_type == 'grouped_bar'  and valid_col(x_col) and valid_num(y_col):
            extra = [c for c in all_num_cols if c != y_col][:3]
            fig = grouped_bar_chart(df, x_col, [y_col] + extra)
        elif chart_type == 'strip_plot'   and valid_col(x_col) and valid_num(y_col): fig = strip_plot(df, x_col, y_col)
        elif chart_type in ('ts_line','ts_ma','ts_rolling','ts_trend') and valid_num(y_col):
            from backend.visualization import timeseries_line, moving_average, rolling_mean, trend_line
            ts_meta = load_meta()
            date_col = None
            for c, sc in ts_meta.items():
                if sc == 'datetime':
                    date_col = c
                    break
            if date_col and date_col in df.columns:
                if   chart_type == 'ts_line':    fig = timeseries_line(df, date_col, y_col)
                elif chart_type == 'ts_ma':      fig = moving_average(df, date_col, y_col, 7)
                elif chart_type == 'ts_rolling': fig = rolling_mean(df, date_col, y_col, 30)
                elif chart_type == 'ts_trend':   fig = trend_line(df, date_col, y_col)

        if fig is None:
            return jsonify({'error': 'Kolom tidak valid atau kombinasi tidak didukung.'})
        return jsonify({'chart': fig})
    except Exception as e:
        logger.error(f"Chart_col error: {e}")
        return jsonify({'error': str(e)})

@app.route('/api/charts/all')
def api_charts_all():
    df = load_df()
    if df is None: return jsonify({})
    try:
        charts = generate_all_charts(df, load_meta())
        return jsonify(charts)
    except Exception as e:
        logger.error(f"Charts all error: {e}")
        return jsonify({'error': str(e)})

@app.route('/api/timeseries')
def api_timeseries():
    df = load_df()
    if df is None: return jsonify({})
    col_meta = load_meta()
    dt_cols  = detect_time_series(df, col_meta)
    if not dt_cols: return jsonify({'detected': False})
    num_cols = [c for c,v in col_meta.items() if v in ('interval','ratio') and c in df.columns]
    if not num_cols: return jsonify({'detected': False})
    summary = get_ts_summary(df, dt_cols[0], num_cols[0])
    summary['detected'] = True
    return jsonify(summary)

@app.route('/api/insight', methods=['POST'])
def api_insight():
    df = load_df()
    lang = request.args.get('lang') or (request.get_json(silent=True) or {}).get('lang', 'id')
    if df is None:
        return jsonify({'insight': 'Belum ada data.' if lang != 'en' else 'No data yet.'})
    col_meta  = load_meta()
    num_stats = get_numerical_stats(df, col_meta)
    cat_stats = get_categorical_stats(df, col_meta)
    insight   = generate_insight(df, col_meta, num_stats, cat_stats, lang=lang)
    return jsonify({'insight': insight})

# ── EXPORT ────────────────────────────────────────────────────

@app.route('/api/undo', methods=['POST'])
def api_undo():
    snap = _DATA.get('df_snapshot')
    if snap is None:
        return jsonify({'success': False, 'error': 'Tidak ada snapshot untuk di-undo'})
    _DATA['df'] = snap
    _DATA['df_snapshot'] = None
    return jsonify({'success': True, 'message': 'Data berhasil dikembalikan ke sebelum aksi terakhir'})

@app.route('/export/cleaned_csv')
def exp_cleaned_csv():
    if 'user_email' not in session:
        return _login_required_response(request.args.get('lang', 'id'))
    df = load_df()
    if df is None or df.empty:
        return jsonify({'error': 'Tidak ada dataset yang dimuat'}), 400
    csv = df.to_csv(index=False)
    filename = _DATA.get('filename', 'dataset_clean.csv').rsplit('.',1)[0] + '_clean.csv'
    return Response(
        csv,
        mimetype='text/csv',
        headers={'Content-Disposition': f'attachment; filename="{filename}"'}
    )

@app.route('/export/pdf')
def exp_pdf():
    lang = request.args.get('lang', 'id')
    if 'user_email' not in session:
        return _login_required_response(lang)
    df = load_df()
    if df is None: return "No data", 400
    path = export_pdf(df, load_meta(), lang=lang)
    return send_file(path, as_attachment=True, download_name='DataMind_Report.pdf')

@app.route('/export/pdf_custom', methods=['POST'])
def exp_pdf_custom():
    lang = request.args.get('lang', 'id')
    if 'user_email' not in session:
        return _login_required_response(lang)
    df = load_df()
    if df is None: return "No data", 400
    body = request.get_json(silent=True) or {}
    pages   = body.get('pages', ['cover','bab1','bab2','bab3','bab4'])
    charts  = body.get('charts', [])
    from backend.visualization import generate_all_charts
    chart_data = {}
    if charts:
        try:
            all_charts = generate_all_charts(df, load_meta())
            chart_data = {k: v for k, v in all_charts.items() if k in charts}
        except Exception as e:
            logger.error(f"Export chart error: {e}")
    path = export_pdf(df, load_meta(), pages=pages, chart_data=chart_data, lang=lang)
    return send_file(path, as_attachment=True, download_name='DataMind_Report.pdf')

@app.route('/export/excel')
def exp_excel():
    lang = request.args.get('lang', 'id')
    if 'user_email' not in session:
        return _login_required_response(lang)
    df = load_df()
    if df is None: return "No data", 400
    path = export_excel(df, load_meta(), lang=lang)
    return send_file(path, as_attachment=True, download_name='DataMind_Export.xlsx')

@app.route('/export/html')
def exp_html_route():
    lang = request.args.get('lang', 'id')
    if 'user_email' not in session:
        return _login_required_response(lang)
    df = load_df()
    if df is None: 
        return jsonify({'error': 'No data loaded'}), 400
    col_meta = load_meta()
    try:
        path = export_html(df, col_meta, lang=lang)
        return send_file(path, as_attachment=True, download_name='DataMind_Dashboard.html')
    except Exception as e:
        logger.error(f'Export HTML error: {e}')
        return jsonify({'error': str(e)}), 500

@app.route('/export/html_custom', methods=['POST'])
def exp_html_custom():
    lang   = request.args.get('lang', 'id')
    if 'user_email' not in session:
        return _login_required_response(lang)
    df = load_df()
    if df is None:
        return jsonify({'error': 'No data loaded'}), 400
    body = request.get_json(silent=True) or {}
    pages  = body.get('pages', ['cover','tim','daftar_isi','bab1','bab2','bab3','bab4','vis'])
    charts = body.get('charts', {})
    col_meta = load_meta()
    try:
        path = export_html(df, col_meta, pages=pages, chart_data=charts, lang=lang)
        return send_file(path, as_attachment=True, download_name='DataMind_Dashboard.html')
    except Exception as e:
        logger.error(f'Export HTML custom error: {e}')
        return jsonify({'error': str(e)}), 500

# ── AI CHAT ───────────────────────────────────────────────────
from backend.insight_generator import build_summary

@app.route('/api/chat', methods=['POST'])
def api_chat():
    import urllib.request, urllib.error
    body = request.get_json(silent=True) or {}
    user_msg = (body.get('message') or '').strip()
    if not user_msg:
        return jsonify({'reply': 'Pesan kosong.'})

    df = load_df()
    if df is None:
        col_meta, num_stats, cat_stats = {}, [], []
        summary_str = "Belum ada dataset yang diupload pengguna saat ini."
    else:
        col_meta  = load_meta()
        num_stats = get_numerical_stats(df, col_meta)
        cat_stats = get_categorical_stats(df, col_meta)
        summary   = build_summary(df, col_meta, num_stats, cat_stats)
        summary_str = json.dumps(summary, ensure_ascii=False)

    system_prompt = f"""Kamu adalah asisten AI di aplikasi DataMind. Kamu bisa menjawab pertanyaan apa saja secara umum, dan juga punya akses ke ringkasan statistik dataset yang sedang dianalisis oleh pengguna berikut ini:

{summary_str}

Tugas kamu:
- Jawab pertanyaan pengguna secara akurat dan jelas dalam Bahasa Indonesia (atau bahasa yang dipakai pengguna)
- Kalau pertanyaan terkait dataset di atas, gunakan angka/insight spesifik dari data tersebut
- Kalau pertanyaan tidak terkait dataset, jawab saja seperti asisten AI pada umumnya, tidak perlu dialihkan ke topik data
- Format jawaban pakai markdown sederhana (bold untuk angka/poin penting) bila relevan
- Jawaban ringkas dan to the point kecuali pengguna minta penjelasan lebih panjang"""

    gemini_key = os.environ.get('GEMINI_API_KEY', '')
    if gemini_key and GENAI_SDK_AVAILABLE:
        try:
            client = genai.Client(api_key=gemini_key)
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=user_msg,
                config={
                    "system_instruction": system_prompt,
                    "max_output_tokens": 1000,
                    "temperature": 0.3,
                },
            )
            reply = response.text
            return jsonify({'reply': reply})
        except Exception as e:
            logger.warning(f"Gemini API error, using fallback: {e}")
    elif gemini_key and not GENAI_SDK_AVAILABLE:
        logger.warning("Paket 'google-genai' belum terinstall, using fallback. Jalankan: pip install google-genai")
    else:
        logger.warning("GEMINI_API_KEY not set, using fallback")

    if df is None:
        return jsonify({'reply': 'Maaf, sedang ada kendala koneksi ke AI dan belum ada dataset yang diupload untuk fallback analisis. Coba lagi sebentar, atau upload data dulu untuk insight otomatis.'})

    msg_lower = user_msg.lower()
    rows  = len(df)
    cols  = len(df.columns)
    missing = int(df.isnull().sum().sum())
    missing_pct = round(missing / max(df.size, 1) * 100, 1)
    col_names = ', '.join(df.columns.tolist()[:10])

    if any(w in msg_lower for w in ['berapa baris', 'jumlah baris', 'how many rows', 'banyak baris']):
        reply = f"Dataset memiliki **{rows:,} baris** data."
    elif any(w in msg_lower for w in ['berapa kolom', 'jumlah kolom', 'banyak kolom']):
        reply = f"Dataset memiliki **{cols} kolom**: {col_names}{'...' if len(df.columns) > 10 else ''}."
    elif any(w in msg_lower for w in ['missing', 'kosong', 'null', 'na']):
        reply = f"Total missing values: **{missing:,}** ({missing_pct}% dari total data). {'Data cukup bersih.' if missing_pct < 5 else 'Perlu penanganan missing values sebelum analisis lanjut.'}"
    elif any(w in msg_lower for w in ['kolom', 'column', 'variabel', 'fitur']):
        reply = f"Dataset memiliki {cols} kolom: **{col_names}**{'...' if len(df.columns) > 10 else ''}."
    elif any(w in msg_lower for w in ['ringkasan', 'summary', 'overview', 'gambaran']):
        reply = f"Dataset ini memiliki **{rows:,} baris** dan **{cols} kolom**. Missing values: {missing_pct}%. Kolom: {col_names}."
    elif any(w in msg_lower for w in ['outlier', 'anomali']):
        total_out = sum(s.get('outliers', 0) for s in num_stats)
        reply = f"Total outlier terdeteksi di seluruh kolom numerik: **{total_out}** titik data."
    elif any(w in msg_lower for w in ['distribusi', 'distribution', 'normal', 'skew']):
        not_normal = [s['column'] for s in num_stats if s.get('normality') == 'Not Normal']
        normal = [s['column'] for s in num_stats if s.get('normality') == 'Normal']
        reply = f"Kolom berdistribusi normal: {', '.join(normal) or 'tidak ada'}. Tidak normal: {', '.join(not_normal) or 'tidak ada'}."
    else:
        reply = f"Berdasarkan dataset ({rows:,} baris, {cols} kolom), saya siap membantu analisis. Coba tanyakan tentang: jumlah baris/kolom, missing values, distribusi data, atau outlier."

    return jsonify({'reply': reply})


# ── MISSING PATTERN / HEATMAP ─────────────────────────────────

@app.route('/api/missing_heatmap')
def api_missing_heatmap():
    df = load_df()
    if df is None: return jsonify({'error': 'No data'})
    max_rows = 50
    step = max(1, len(df) // max_rows)
    sample = df.iloc[::step].head(max_rows)
    cols = df.columns.tolist()
    if len(cols) > 30:
        step_c = max(1, len(cols) // 30)
        cols = cols[::step_c][:30]
    matrix = []
    for i, (idx, row) in enumerate(sample.iterrows()):
        row_data = {}
        for c in cols:
            row_data[c] = 1 if pd.isna(row[c]) else 0
        matrix.append({'row': int(idx) + 1, 'values': row_data})
    return jsonify({
        'columns': cols,
        'rows': matrix,
        'total_rows': len(df),
        'total_cols': len(df.columns),
        'sampled_rows': len(matrix),
        'max_display_cols': len(cols),
    })


@app.route('/api/missing_overview')
def api_missing_overview():
    df = load_df()
    if df is None: return jsonify({'error': 'No data'})
    result = []
    for col in df.columns:
        miss = int(df[col].isnull().sum())
        if miss > 0:
            pct = round(miss / max(len(df), 1) * 100, 2)
            severity = 'high' if pct > 20 else ('medium' if pct > 5 else 'low')
            result.append({
                'column': col,
                'missing': miss,
                'missing_pct': pct,
                'severity': severity,
            })
    return jsonify({
        'columns_with_missing': result,
        'total_missing_cols': len(result),
        'total_missing_cells': int(df.isnull().sum().sum()),
    })


@app.route('/api/missing_pattern_rows')
def api_missing_pattern_rows():
    df = load_df()
    if df is None: return jsonify({'error': 'No data'})
    miss_count = df.isnull().sum(axis=1)
    top_rows = miss_count.nlargest(20)
    result = []
    all_cols = df.columns.tolist()
    for idx, cnt in top_rows.items():
        miss_cols = [c for c in all_cols if pd.isna(df.loc[idx, c])]
        result.append({
            'row_num': int(idx) + 1,
            'missing_count': int(cnt),
            'total_cols': len(all_cols),
            'missing_pct': round(cnt / max(len(all_cols), 1) * 100, 2),
            'missing_columns': miss_cols[:10],
            'missing_cols_exceeded': len(miss_cols) > 10,
        })
    return jsonify({
        'rows': result,
        'total_rows_checked': len(df),
        'rows_with_any_missing': int((miss_count > 0).sum()),
    })


# ── HANDLE MISSING VALUES ────────────────────────────────────

@app.route('/api/missing_info')
def api_missing_info():
    df = load_df()
    if df is None: return jsonify([])
    col_meta = load_meta()
    result = []
    for col in df.columns:
        miss = int(df[col].isnull().sum())
        if miss == 0: continue
        scale = col_meta.get(col, 'nominal')
        is_num = scale in ('ratio', 'interval')
        stats = {}
        if is_num:
            s = df[col].dropna()
            stats['mean']   = round(float(s.mean()), 4) if len(s) else None
            stats['median'] = round(float(s.median()), 4) if len(s) else None
            try:
                stats['mode'] = round(float(s.mode().iloc[0]), 4) if len(s.mode()) else None
            except:
                stats['mode'] = None
        else:
            try:
                stats['mode'] = str(df[col].dropna().mode().iloc[0]) if len(df[col].dropna().mode()) else None
            except:
                stats['mode'] = None
        result.append({
            'column':      col,
            'scale':       scale,
            'is_num':      is_num,
            'missing':     miss,
            'missing_pct': round(miss / max(len(df), 1) * 100, 2),
            'total':       len(df),
            'stats':       stats,
        })
    return jsonify(result)


@app.route('/api/missing_rows')
def api_missing_rows():
    df = load_df()
    if df is None: return jsonify({'rows': [], 'context_cols': [], 'total_missing': 0})
    col = request.args.get('col', '')
    if col not in df.columns:
        return jsonify({'rows': [], 'context_cols': [], 'total_missing': 0})
    missing_idx = df[df[col].isnull()].index.tolist()
    sample_idx  = missing_idx[:20]
    all_cols     = df.columns.tolist()
    context_cols = all_cols[:4] if len(all_cols) >= 4 else all_cols
    if col not in context_cols:
        context_cols = context_cols[:3] + [col]
    rows = []
    for i in sample_idx:
        row_data = {}
        for c in context_cols:
            val = df.loc[i, c]
            try:
                if hasattr(val, 'item'): val = val.item()
                row_data[c] = str(val) if val is not None and str(val) != 'nan' else None
            except:
                row_data[c] = None
        rows.append({'row_num': int(i) + 1, 'data': row_data})
    return jsonify({
        'col': col,
        'total_missing': len(missing_idx),
        'showing': len(rows),
        'context_cols': context_cols,
        'rows': rows,
    })


@app.route('/api/handle_missing', methods=['POST'])
def api_handle_missing():
    df = load_df()
    if df is None: return jsonify({'success': False, 'error': 'No data'})
    _DATA['df_snapshot'] = df.copy()
    col_meta = load_meta()
    body = request.get_json(silent=True) or {}
    actions = body.get('actions', {})
    custom_vals = body.get('custom_vals', {})
    df = df.copy()
    log = []
    for col, action in actions.items():
        if col not in df.columns: continue
        miss_before = int(df[col].isnull().sum())
        if miss_before == 0: continue
        try:
            if action == 'drop':
                df = df.dropna(subset=[col])
                log.append(f"{col}: drop {miss_before} baris")
            elif action == 'mean':
                val = df[col].mean()
                df[col] = df[col].fillna(val)
                log.append(f"{col}: fill mean ({round(float(val),4)})")
            elif action == 'median':
                val = df[col].median()
                df[col] = df[col].fillna(val)
                log.append(f"{col}: fill median ({round(float(val),4)})")
            elif action == 'mode':
                val = df[col].mode().iloc[0] if len(df[col].mode()) else None
                if val is not None:
                    df[col] = df[col].fillna(val)
                    log.append(f"{col}: fill mode ({val})")
            elif action == 'zero':
                df[col] = df[col].fillna(0)
                log.append(f"{col}: fill 0")
            elif action == 'custom':
                raw = custom_vals.get(col, '')
                scale = col_meta.get(col, 'nominal')
                if scale in ('ratio', 'interval'):
                    try: val = float(raw)
                    except: val = 0
                else:
                    val = str(raw)
                df[col] = df[col].fillna(val)
                log.append(f"{col}: fill custom ({val})")
        except Exception as e:
            log.append(f"{col}: ERROR — {e}")
    save_df(df)
    missing_after = int(df.isnull().sum().sum())
    return jsonify({
        'success': True,
        'log': log,
        'missing_after': missing_after,
        'rows': len(df),
    })


@app.route('/api/duplicate_info')
def api_duplicate_info():
    df = load_df()
    if df is None: return jsonify({'total_dupes': 0, 'columns': []})
    total_dupes = int(df.duplicated().sum())
    cols_info = []
    for col in df.columns:
        dupes_by_col = int(df.duplicated(subset=[col], keep=False).sum())
        if dupes_by_col > 0:
            cols_info.append({'column': col, 'duplicates': dupes_by_col})
    return jsonify({
        'total_dupes': total_dupes,
        'total_rows': len(df),
        'columns': cols_info,
    })


@app.route('/api/handle_duplicate', methods=['POST'])
def api_handle_duplicate():
    df = load_df()
    if df is None: return jsonify({'success': False, 'error': 'No data'})
    _DATA['df_snapshot'] = df.copy()
    body = request.get_json(silent=True) or {}
    subset  = body.get('subset', None)
    keep    = body.get('keep', 'first')
    before  = len(df)
    if subset == []: subset = None
    if keep == 'none': keep = False
    df = df.drop_duplicates(subset=subset, keep=keep)
    removed = before - len(df)
    save_df(df)
    return jsonify({'success': True, 'removed': removed, 'rows_after': len(df)})


@app.route('/api/outlier_info')
def api_outlier_info():
    df = load_df()
    if df is None: return jsonify([])
    col_meta = load_meta()
    result = []
    for col in df.columns:
        scale = col_meta.get(col, 'nominal')
        if scale not in ('ratio', 'interval'): continue
        s = df[col].dropna()
        if len(s) < 4: continue
        Q1, Q3 = float(s.quantile(0.25)), float(s.quantile(0.75))
        IQR = Q3 - Q1
        lower, upper = Q1 - 1.5 * IQR, Q3 + 1.5 * IQR
        outlier_mask = (df[col] < lower) | (df[col] > upper)
        count = int(outlier_mask.sum())
        if count == 0: continue
        result.append({
            'column':  col,
            'count':   count,
            'pct':     round(count / max(len(df), 1) * 100, 2),
            'lower':   round(lower, 4),
            'upper':   round(upper, 4),
            'min':     round(float(s.min()), 4),
            'max':     round(float(s.max()), 4),
            'median':  round(float(s.median()), 4),
        })
    return jsonify(result)


@app.route('/api/outlier_rows')
def api_outlier_rows():
    df = load_df()
    if df is None: return jsonify({'rows': [], 'context_cols': [], 'total_outliers': 0})
    col_meta = load_meta()
    col = request.args.get('col', '')
    if col not in df.columns:
        return jsonify({'rows': [], 'context_cols': [], 'total_outliers': 0})
    scale = col_meta.get(col, 'nominal')
    if scale not in ('ratio', 'interval'):
        return jsonify({'rows': [], 'context_cols': [], 'total_outliers': 0})
    s = df[col].dropna()
    if len(s) < 4:
        return jsonify({'rows': [], 'context_cols': [], 'total_outliers': 0})
    Q1, Q3 = float(s.quantile(0.25)), float(s.quantile(0.75))
    IQR = Q3 - Q1
    lower, upper = Q1 - 1.5 * IQR, Q3 + 1.5 * IQR
    mask = (df[col] < lower) | (df[col] > upper)
    outlier_idx = df[mask].index.tolist()
    # Urutkan berdasarkan jarak ekstrem terjauh dari batas dulu
    def extremity(i):
        v = df.loc[i, col]
        try:
            v = float(v)
        except Exception:
            return 0
        return max(lower - v, v - upper, 0)
    outlier_idx.sort(key=extremity, reverse=True)
    sample_idx = outlier_idx[:20]
    all_cols = df.columns.tolist()
    context_cols = all_cols[:4] if len(all_cols) >= 4 else all_cols
    if col not in context_cols:
        context_cols = context_cols[:3] + [col]
    rows = []
    for i in sample_idx:
        row_data = {}
        for c in context_cols:
            val = df.loc[i, c]
            try:
                if hasattr(val, 'item'): val = val.item()
                row_data[c] = str(val) if val is not None and str(val) != 'nan' else None
            except Exception:
                row_data[c] = None
        try:
            raw_val = float(df.loc[i, col])
            severity = round(max(lower - raw_val, raw_val - upper, 0) / (IQR if IQR else 1), 2)
        except Exception:
            raw_val, severity = None, 0
        rows.append({'row_num': int(i) + 1, 'data': row_data, 'value': raw_val, 'severity': severity})
    return jsonify({
        'col': col,
        'total_outliers': len(outlier_idx),
        'showing': len(rows),
        'context_cols': context_cols,
        'lower': round(lower, 4),
        'upper': round(upper, 4),
        'q1': round(Q1, 4),
        'q3': round(Q3, 4),
        'rows': rows,
    })


@app.route('/api/dq_health_score')
def api_dq_health_score():
    df = load_df()
    if df is None: return jsonify({'error': 'No data'})
    col_meta = load_meta()
    total_rows = len(df)
    total_cells = max(df.size, 1)

    # Missing
    missing_cells = int(df.isnull().sum().sum())
    missing_pct = round(missing_cells / total_cells * 100, 2)

    # Duplicate
    dup_rows = int(df.duplicated().sum())
    dup_pct = round(dup_rows / max(total_rows, 1) * 100, 2)

    # Outlier (rata-rata pct outlier per kolom numerik yang punya outlier)
    outlier_pcts = []
    outlier_total = 0
    for col in df.columns:
        scale = col_meta.get(col, 'nominal')
        if scale not in ('ratio', 'interval'): continue
        s = df[col].dropna()
        if len(s) < 4: continue
        Q1, Q3 = float(s.quantile(0.25)), float(s.quantile(0.75))
        IQR = Q3 - Q1
        lower, upper = Q1 - 1.5 * IQR, Q3 + 1.5 * IQR
        cnt = int(((df[col] < lower) | (df[col] > upper)).sum())
        if cnt > 0:
            outlier_total += cnt
            outlier_pcts.append(cnt / max(total_rows, 1) * 100)
    outlier_pct = round(sum(outlier_pcts) / len(outlier_pcts), 2) if outlier_pcts else 0.0

    # Skor kesehatan keseluruhan: bobot tertimbang, 100 = sempurna
    penalty = (missing_pct * 0.5) + (dup_pct * 0.3) + (outlier_pct * 0.2)
    score = max(0, round(100 - penalty, 1))

    if score >= 90:
        label, color = 'Sangat Baik', '#059669'
    elif score >= 75:
        label, color = 'Baik', '#10B981'
    elif score >= 55:
        label, color = 'Perlu Perhatian', '#D97706'
    else:
        label, color = 'Kritis', '#DC2626'

    return jsonify({
        'score': score,
        'label': label,
        'color': color,
        'total_rows': total_rows,
        'total_cols': len(df.columns),
        'breakdown': {
            'missing':  {'pct': missing_pct, 'count': missing_cells, 'label': 'Missing Values'},
            'duplicate':{'pct': dup_pct, 'count': dup_rows, 'label': 'Duplicate Rows'},
            'outlier':  {'pct': outlier_pct, 'count': outlier_total, 'label': 'Outlier Points'},
        },
    })


@app.route('/api/handle_outlier', methods=['POST'])
def api_handle_outlier():
    df = load_df()
    if df is None: return jsonify({'success': False, 'error': 'No data'})
    _DATA['df_snapshot'] = df.copy()
    col_meta = load_meta()
    body    = request.get_json(silent=True) or {}
    actions = body.get('actions', {})
    log = []
    df  = df.copy()
    for col, action in actions.items():
        if col not in df.columns: continue
        scale = col_meta.get(col, 'nominal')
        if scale not in ('ratio', 'interval'): continue
        s  = df[col].dropna()
        Q1, Q3 = float(s.quantile(0.25)), float(s.quantile(0.75))
        IQR = Q3 - Q1
        lower, upper = Q1 - 1.5 * IQR, Q3 + 1.5 * IQR
        mask = (df[col] < lower) | (df[col] > upper)
        count = int(mask.sum())
        if count == 0: continue
        try:
            if action == 'drop':
                df = df[~mask]
                log.append(f"{col}: hapus {count} baris outlier")
            elif action == 'cap':
                df[col] = df[col].clip(lower=lower, upper=upper)
                log.append(f"{col}: cap ke [{round(lower,2)}, {round(upper,2)}]")
            elif action == 'median':
                med = df[col].median()
                df.loc[mask, col] = med
                log.append(f"{col}: replace outlier dengan median ({round(float(med),4)})")
        except Exception as e:
            log.append(f"{col}: ERROR — {e}")
    save_df(df)
    return jsonify({'success': True, 'log': log, 'rows_after': len(df)})


# ── USER PROFILE & HISTORY ───────────────────────────────────

HISTORY_DIR = os.path.join(BASE_DIR, 'data', 'history')
RAW_DIR     = os.path.join(BASE_DIR, 'data', 'raw_user')
AVATAR_DIR  = os.path.join(BASE_DIR, 'frontend', 'static', 'avatars')

os.makedirs(HISTORY_DIR, exist_ok=True)
os.makedirs(RAW_DIR,     exist_ok=True)
os.makedirs(AVATAR_DIR,  exist_ok=True)

def _history_path(email):
    safe = email.replace('@', '_at_').replace('.', '_')
    return os.path.join(HISTORY_DIR, f"{safe}.json")

def _load_history(email):
    p = _history_path(email)
    if not os.path.exists(p): return []
    try:
        with open(p, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return []

def _save_history(email, history):
    with open(_history_path(email), 'w', encoding='utf-8') as f:
        json.dump(history, f, indent=2, ensure_ascii=False)

def _record_history(email, filename, rows, cols, raw_path=None):
    if not email: return
    history = _load_history(email)
    import datetime
    entry = {
        'id': secrets.token_hex(6),
        'filename': filename,
        'rows': rows,
        'cols': cols,
        'raw_path': raw_path,
        'date': datetime.datetime.now().strftime('%Y-%m-%d %H:%M'),
    }
    # Hindari duplikat nama file beruntun
    history = [h for h in history if h.get('filename') != filename]
    history.insert(0, entry)
    history = history[:20]  # simpan max 20 history
    _save_history(email, history)


@app.route('/api/user/profile')
def api_user_profile():
    email = session.get('user_email')
    if not email:
        return jsonify({'logged_in': False})
    users = _load_users()
    user  = users.get(email, {})
    history = _load_history(email)
    return jsonify({
        'logged_in':    True,
        'name':         user.get('name', ''),
        'email':        email,
        'avatar_url':   user.get('avatar_url', ''),
        'created_at':   user.get('created_at', ''),
        'report_count': user.get('report_count', 0),
        'dataset_count': len(history),
    })


@app.route('/api/user/history')
def api_user_history():
    email = session.get('user_email')
    if not email:
        return jsonify({'history': []})
    return jsonify({'history': _load_history(email)})


@app.route('/api/user/history/<entry_id>/reload', methods=['POST'])
def api_user_history_reload(entry_id):
    email = session.get('user_email')
    if not email:
        return jsonify({'success': False, 'error': 'Belum login'})
    history = _load_history(email)
    entry = next((h for h in history if h.get('id') == entry_id), None)
    if not entry:
        return jsonify({'success': False, 'error': 'Entry tidak ditemukan'})
    raw_path = entry.get('raw_path')
    if not raw_path or not os.path.exists(raw_path):
        return jsonify({'success': False, 'error': 'File asli sudah tidak ada di server'})
    try:
        from backend.data_loader import load_file
        from backend.preprocessing import preprocess
        df = load_file(raw_path)
        df, col_meta = preprocess(df)
        save_df(df)
        save_meta(col_meta)
        _DATA['filename'] = entry['filename']
        return jsonify({'success': True, 'filename': entry['filename'], 'rows': len(df), 'cols': len(df.columns)})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})


@app.route('/api/user/avatar', methods=['POST'])
def api_user_avatar():
    email = session.get('user_email')
    if not email:
        return jsonify({'success': False, 'error': 'Belum login'})
    if 'avatar' not in request.files:
        return jsonify({'success': False, 'error': 'Tidak ada file'})
    f = request.files['avatar']
    ext = f.filename.rsplit('.', 1)[-1].lower() if '.' in f.filename else 'jpg'
    if ext not in ('jpg','jpeg','png','gif','webp'):
        return jsonify({'success': False, 'error': 'Format tidak didukung'})
    safe_email = email.replace('@','_at_').replace('.','_')
    filename = f"avatar_{safe_email}.{ext}"
    path = os.path.join(AVATAR_DIR, filename)
    f.save(path)
    avatar_url = f"/static/avatars/{filename}"
    users = _load_users()
    if email in users:
        users[email]['avatar_url'] = avatar_url
        _save_users(users)
    return jsonify({'success': True, 'avatar_url': avatar_url})


# Patch upload & load_sample untuk mencatat history
_orig_upload = upload.__wrapped__ if hasattr(upload, '__wrapped__') else None

@app.after_request
def _after_request_hook(response):
    return response

# Tambahkan pencatatan history di upload route (patch inline)
# Kita simpan reference ke fungsi upload asli dan bungkus
import functools

_upload_orig = app.view_functions['upload']

@functools.wraps(_upload_orig)
def _upload_with_history():
    from flask import g
    result = _upload_orig()
    try:
        email = session.get('user_email')
        if email and _DATA.get('filename') and _DATA.get('df') is not None:
            df = _DATA['df']
            fname = _DATA['filename']
            # Simpan file permanen untuk reload
            safe_email = email.replace('@','_at_').replace('.','_')
            raw_path = os.path.join(RAW_DIR, f"{safe_email}_{fname}")
            if not os.path.exists(raw_path):
                df.to_csv(raw_path, index=False)
            _record_history(email, fname, len(df), len(df.columns), raw_path)
    except Exception as e:
        logger.warning(f"History record error: {e}")
    return result

app.view_functions['upload'] = _upload_with_history


if __name__ == '__main__':
    app.run(debug=True, port=5000)