/* ════════════════════════════════════════════
   DataMind V2 — Main JavaScript
   ════════════════════════════════════════════ */

/* ── TOAST NOTIFICATION SYSTEM ── */
(function() {
  var c = document.createElement('div');
  c.id = 'toastContainer';
  c.style.cssText = 'position:fixed;top:20px;right:20px;z-index:999999;display:flex;flex-direction:column;gap:8px;pointer-events:none';
  document.body.appendChild(c);
  var s = document.createElement('style');
  s.textContent = '.toast{padding:12px 20px;border-radius:10px;font-size:14px;font-weight:600;box-shadow:0 8px 32px rgba(0,0,0,0.15);pointer-events:auto;display:flex;align-items:center;gap:10px;animation:ti .25s ease;max-width:400px;line-height:1.4}.toast-s{background:#065F46;color:#fff}.toast-e{background:#991B1B;color:#fff}.toast-i{background:#1E40AF;color:#fff}.toast-w{background:#92400E;color:#fff}@keyframes ti{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:translateX(0)}}';
  document.head.appendChild(s);
  var icons = {s:'✅',e:'❌',i:'ℹ️',w:'⚠️'};
  window.showToast = function(m,t) {
    t = t||'i'; var el = document.createElement('div');
    el.className = 'toast toast-'+t;
    el.innerHTML = '<span>'+(icons[t]||'ℹ️')+'</span><span>'+m+'</span>';
    el.onclick = function(){el.remove()};
    c.appendChild(el);
    setTimeout(function(){if(el.parentNode)el.remove()},3500);
  };
})();

let CHARTS = {};
let chartsLoaded = false;
let insightLoaded = false;
const activity = [];

// ── SINGLE SOURCE OF TRUTH: Chart CID → backend key ──
const VIZ_KEY_MAP = {
  'fv-hist':'histogram','fv-box':'boxplot','fv-density':'density','fv-qq':'qq_plot','fv-violin':'violin',
  'fv-bar':'bar_chart','fv-pie':'pie_chart','fv-count':'count_plot','fv-pareto':'pareto_chart',
  'fv-scatter':'scatter','fv-corr':'corr_heatmap','fv-regression':'regression','fv-bubble':'bubble',
  'fv-boxcat':'boxplot_cat','fv-violincat':'violin_cat','fv-grouped':'grouped_bar','fv-strip':'strip_plot',
  'fv-ts-line':'ts_line','fv-ts-ma':'ts_ma','fv-ts-roll':'ts_rolling','fv-ts-trend':'ts_trend',
  'vc-hist':'histogram','vc-box':'boxplot','vc-density':'density','vc-qq':'qq_plot',
  'vc-bar':'bar_chart','vc-pie':'pie_chart','vc-count':'count_plot','vc-pareto':'pareto_chart',
  'vc-scatter':'scatter','vc-corr':'corr_heatmap','vc-regression':'regression','vc-bubble':'bubble',
  'vc-boxcat':'boxplot_cat','vc-violincat':'violin_cat','vc-grouped':'grouped_bar','vc-strip':'strip_plot',
  'vc-ts-line':'ts_line','vc-ts-ma':'ts_ma','vc-ts-roll':'ts_rolling','vc-ts-trend':'ts_trend',
};

function addActivity(msg) {
  const now = new Date().toLocaleTimeString('id-ID', {hour:'2-digit',minute:'2-digit'});
  activity.unshift({msg, time: now});
  renderActivity();
}

function renderActivity() {
  const el = document.getElementById('activityLog');
  if (!el) return;
  el.innerHTML = activity.slice(0,6).map(a =>
    `<div class="act-item"><div class="act-dot"></div><div class="act-txt">${a.msg}</div><div class="act-time">${a.time}</div></div>`
  ).join('');
}

// ── SIDEBAR TOGGLE ──────────────────────────────────────────
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('collapsed');
}

// ── TAB SWITCHING ───────────────────────────────────────────
function tabTitles(){
  var id=(window.DM_LANG||'id')==='id';
  return {
    dashboard:   'Dashboard',
    upload:      id?'Upload Data':'Upload Data',
    preview:     id?'Data Preview':'Data Preview',
    missing:     id?'Data Quality — Missing, Duplikat, Outlier':'Data Quality — Missing, Duplicate, Outlier',
    numerical:   id?'Statistik Deskriptif — Numerik':'Descriptive Statistics — Numerical',
    categorical: id?'Statistik Deskriptif — Kategorikal':'Descriptive Statistics — Categorical',
    viz_num:     id?'Visualisasi — Numerik':'Visualization — Numerical',
    viz_cat:     id?'Visualisasi — Kategorikal':'Visualization — Categorical',
    viz_biv:     id?'Visualisasi — Bivariat & Multivariat':'Visualization — Bivariate & Multivariate',
    viz_catnum:  id?'Visualisasi — Kategorikal vs Numerik':'Visualization — Categorical vs Numerical',
    timeseries:  id?'Analisis Time Series':'Time Series Analytics',
    insight:     id?'Interpretasi & Insight':'Interpretation & Insights',
    download:    id?'Download Laporan':'Download Report',
    aichat:      id?'Chat dengan AI':'Chat with AI',
  };
}

let _chatInited = false;
function switchTab(name, el) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.sb-item').forEach(i => i.classList.remove('active'));
  const tab = document.getElementById('tab-' + name);
  if (tab) tab.classList.add('active');
  if (el) el.classList.add('active');
  document.getElementById('tbTitle').textContent = (tabTitles())[name] || 'DataMind';

  // Init AI chat once on first visit
  if (name === 'aichat' && !_chatInited) { _chatInited = true; initAIChat(); }
  if (name === 'aichat') { setTimeout(() => document.getElementById('aiChatInput')?.focus(), 80); }

  // Lazy loads
  if (name === 'preview') {
    const sel = document.querySelector('#tab-preview select.limit-sel');
    loadPreview(sel ? sel.value : '10');
  }
  if (name === 'missing') { injectDQPageCSS(); setTimeout(() => switchDQPageTab('missing'), 80); }
  if (name === 'numerical')   loadNumericalFull();
  if (name === 'categorical') loadCategoricalFull();
  const _firstChart = {
    viz_num:'fv-hist', viz_cat:'fv-bar', viz_biv:'fv-scatter',
    viz_catnum:'fv-boxcat', timeseries:'fv-ts-line'
  };
  if (_firstChart[name]) setTimeout(() => vizNavSwitch(name, _firstChart[name]), 80);
  if (name === 'timeseries') setTimeout(() => loadTSSummary(), 100);
  if (name === 'insight')     loadInsight();

  // Resize semua chart Plotly yang sudah pernah dirender di tab ini,
  // karena tab baru saja berubah dari display:none -> aktif sehingga
  // ukuran container sebelumnya (saat chart pertama dirender) bisa
  // sudah tidak valid lagi.
  if (tab) {
    setTimeout(() => {
      tab.querySelectorAll('.plotly-chart-lg, .plotly-chart').forEach(el => {
        if (el._plotlyInitialized) {
          try { Plotly.Plots.resize(el); } catch (e) {}
        }
      });
    }, 120);
  }

  // Column selector untuk viz tabs
  if (name === 'viz_num') setTimeout(() => _buildColumnSelector('num'), 200);
  if (name === 'viz_cat') setTimeout(() => _buildColumnSelector('cat'), 200);
}

// ── OVERVIEW ────────────────────────────────────────────────
async function loadOverview() {
  const r = await fetch('/api/overview');
  const d = await r.json();
  if (d.error) return;
  setText('c-rows',  fmtNum(d.rows));
  setText('c-cols',  d.cols);
  setText('c-num',   d.num_cols);
  setText('c-cat',   d.cat_cols);
  setText('c-dt',    d.dt_cols);
  setText('c-miss',  `${d.missing} (${d.missing_pct}%)`);
  setText('sbFileName', truncate(d.filename, 14));
  setText('sbRows',  fmtNum(d.rows));
  setText('sbCols',  d.cols);
  setText('sbHealth', d.health);
  setText('healthLabel', `✓ ${d.health}`);
  document.getElementById('healthDot').style.background = d.health_color || '#2E7D32';
  addActivity(`Dataset "${d.filename}" dimuat — ${fmtNum(d.rows)} baris`);

}

// ── PREVIEW ─────────────────────────────────────────────────
var _previewData = {cols:[], rows:[]};

function buildPreviewTable(id, cols, rows) {
  const t = document.getElementById(id);
  if (!t) return;
  hideTableSkel(id);
  t.querySelector('thead').innerHTML = `<tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr>`;
  t.querySelector('tbody').innerHTML = rows.map(row => {
    const cells = cols.map(c => {
      const val = row[c];
      const isNull = val === null || val === undefined || val === '' || val === 'None' || String(val).toLowerCase() === 'nan';
      if (isNull) {
        return `<td style="background:#FEE2E2;color:#DC2626;font-weight:700;position:relative"><span style="opacity:.5">NULL</span><span style="position:absolute;top:0;right:2px;font-size:8px;opacity:.4">⚠</span></td>`;
      }
      return `<td>${val ?? '—'}</td>`;
    }).join('');
    return `<tr>${cells}</tr>`;
  }).join('');
}

function filterPreviewTable(q) {
  q = q.toLowerCase().trim();
  var tbody = document.querySelector('#fullPreviewTable tbody');
  var pc = document.getElementById('previewRowCount');
  if (!_previewData.rows.length) { if(pc) pc.textContent = '0 baris'; return; }
  var filtered = q ? _previewData.rows.filter(function(r) {
    return Object.values(r).some(function(v) { return String(v).toLowerCase().includes(q); });
  }) : _previewData.rows;
  buildPreviewTable('fullPreviewTable', _previewData.cols, filtered);
  if (pc) pc.textContent = filtered.length + ' baris' + (q ? ' (difilter)' : '');
}

async function loadPreview(limit) {
  const r = await fetch(`/api/preview?limit=${encodeURIComponent(limit)}`);
  const d = await r.json();
  _previewData = {cols: d.columns, rows: d.data};
  buildPreviewTable('fullPreviewTable', d.columns, d.data);
  var pc = document.getElementById('previewRowCount');
  if (pc) pc.textContent = d.data.length + ' baris';
  const el = document.getElementById('previewCount');
  if (el) el.textContent = `Menampilkan ${d.data.length} dari ${fmtNum(d.total)} baris`;
  loadColInfo();
}

async function loadColInfo() {
  const r = await fetch('/api/column_info');
  const d = await r.json();
  const cols = ['#','Nama Kolom','Tipe Data Python','Skala Pengukuran','Missing','Missing %','Contoh Nilai'];
  const rows = d.map((c,i) => ({
    '#': i+1,
    'Nama Kolom': c.name,
    'Tipe Data Python': c.dtype,
    'Skala Pengukuran': scaleBadge(c.scale),
    'Missing': c.missing,
    'Missing %': c.missing_pct + '%',
    'Contoh Nilai': c.sample,
  }));
  buildTableRaw('colInfoTable', cols, rows);
}

function scaleBadge(s) {
  const map = {ratio:'b-ok',interval:'b-ok',nominal:'b-nom',ordinal:'b-ord',datetime:'b-dt',boolean:'b-warn'};
  return `<span class="badge ${map[s]||'b-warn'}">${s}</span>`;
}

// ── NUMERICAL STATS ─────────────────────────────────────────
async function loadNumericalDash() {
  const r = await fetch('/api/stats/numerical');
  const d = await r.json();
  if (!d.length) return;
  // Tampilkan 6 kolom paling penting untuk dashboard (proyektor-friendly)
  const cols = ['Column','Scale','Mean','Std Dev','Missing %','Normality'];
  const rows = d.map(s => ({
    'Column': s.column,
    'Scale': s.scale,
    'Mean': fmtVal(s.mean),
    'Std Dev': fmtVal(s.std),
    'Missing %': s.missing_pct + '%',
    'Normality': normalBadge(s.normality),
  }));
  buildTableRaw('numSummaryTable', cols, rows);
}

async function loadNumericalFull() {
  const r = await fetch('/api/stats/numerical');
  const d = await r.json();
  if (!d.length) return;
  const cols = ['Column','Scale','Count','Mean','Median','Min','Max','Std Dev','Variance','Mode','Skewness','Kurtosis','Missing Count','Missing %','Normality','Outliers'];
  const rows = d.map(s => ({
    'Column': s.column, 'Scale': s.scale,
    'Count': fmtNum(s.count), 'Mean': fmtVal(s.mean), 'Median': fmtVal(s.median),
    'Mode': fmtVal(s.mode), 'Std Dev': fmtVal(s.std), 'Variance': fmtVal(s.variance),
    'Min': fmtVal(s.min), 'Max': fmtVal(s.max),
    'Skewness': s.skewness, 'Kurtosis': s.kurtosis,
    'Missing Count': s.missing_count, 'Missing %': s.missing_pct + '%',
    'Outliers': s.outliers,
    'Normality': normalBadge(s.normality),
  }));
  buildTableRaw('numFullTable', cols, rows);
  addActivity('Statistik numerik digenerate');
}

function normalBadge(v) {
  if (v === 'Normal') return '<span class="badge b-ok">✓ Normal</span>';
  if (v === 'Not Normal') return '<span class="badge b-bad">✗ Not Normal</span>';
  return v || '—';
}

// ── CATEGORICAL STATS ────────────────────────────────────────
async function loadCategoricalDash() {
  const r = await fetch('/api/stats/categorical');
  const d = await r.json();
  if (!d.length) return;
  // Tampilkan 5 kolom paling penting untuk dashboard (proyektor-friendly)
  const cols = ['Variable','Scale','Count','Mode','Missing %'];
  const rows = d.map(s => ({
    'Variable': s.column,
    'Scale': s.scale,
    'Count': fmtNum(s.count),
    'Mode': s.mode || '—',
    'Missing %': s.missing_pct + '%',
  }));
  buildTableRaw('catSummaryTable', cols, rows);
  buildMissingBars(d);
}

async function loadCategoricalFull() {
  const r = await fetch('/api/stats/categorical');
  const d = await r.json();
  if (!d.length) return;
  const cols = ['Variable','Scale','Count','Unique','Mode','Mode Freq','Mode %','Missing Count','Missing %'];
  const rows = d.map(s => ({
    'Variable': s.column, 'Scale': scaleBadge(s.scale),
    'Count': fmtNum(s.count), 'Unique': s.unique,
    'Mode': s.mode || '—', 'Mode Freq': fmtNum(s.mode_freq),
    'Mode %': s.mode_pct + '%',
    'Missing Count': s.missing_count, 'Missing %': s.missing_pct + '%',
  }));
  buildTableRaw('catFullTable', cols, rows);
  addActivity('Statistik kategorikal digenerate');
}

function buildMissingBars(data) {
  const el = document.getElementById('missingBars');
  if (!el || !data.length) return;
  el.innerHTML = `<div class="mb-title">Missing Values by Column (%)</div>` +
    data.map(d => {
      const pct = d.missing_pct || 0;
      const color = pct > 20 ? '#C62828' : pct > 5 ? '#E65100' : '#2E7D32';
      return `<div class="mb-row">
        <div class="mb-lbl">${d.column}</div>
        <div class="mb-bar-bg"><div class="mb-bar" style="width:${Math.min(pct*4,100)}%;background:${color}"></div></div>
        <div class="mb-val">${pct}%</div>
      </div>`;
    }).join('');
}

// ── CHARTS ──────────────────────────────────────────────────
async function loadCharts() {
  if (chartsLoaded) return;
  try {
    const r = await fetch('/api/charts');
    CHARTS = await r.json();
    if (CHARTS.error) { console.error('Charts API error:', CHARTS.error); return; }
    const hasAnyChart = Object.keys(CHARTS).some(k => !k.endsWith('_col') && !k.endsWith('_cols'));
    if (!hasAnyChart) {
      console.warn('Charts: Tidak ada kolom numerik/kategorikal yang memadai untuk visualisasi.');
      chartsLoaded = true;
      addActivity('Visualisasi: data tidak memiliki kolom untuk chart');
      return;
    }
    await new Promise(resolve => requestAnimationFrame(() => {
      renderDashViz();
      renderTSDash();
      resolve();
    }));
    chartsLoaded = true;
    addActivity('Visualisasi otomatis dibuat');
  } catch(e) { console.error('Charts error:', e); }
}

const PLOTLY_CFG = {responsive:true, displayModeBar:false};

function renderPlotly(id, fig) {
  if (!fig || fig.error) return;
  const el = document.getElementById(id);
  if (!el) return;
  try {
    // Pakai newPlot untuk pertama kali, react untuk update
    if (el._plotlyInitialized) {
      Plotly.react(el, fig.data, fig.layout, PLOTLY_CFG);
    } else {
      Plotly.newPlot(el, fig.data, fig.layout, PLOTLY_CFG);
      el._plotlyInitialized = true;
    }
  } catch(e) {
    // Fallback: coba newPlot kalau react gagal
    try { Plotly.newPlot(el, fig.data, fig.layout, PLOTLY_CFG); el._plotlyInitialized = true; }
    catch(e2) { console.warn('Plotly err', id, e2); }
  }
}

function renderDashViz() {
  // Pakai ID yang ada di dashboard HTML (prev-)
  const dashCharts = [
    ['prev-hist',     CHARTS.histogram],
    ['prev-box',      CHARTS.boxplot],
    ['prev-density',  CHARTS.density],
    ['prev-qq',       CHARTS.qq_plot],
    ['prev-bar',      CHARTS.bar_chart],
    ['prev-pie',      CHARTS.pie_chart],
    ['prev-count',    CHARTS.count_plot],
    ['prev-pareto',   CHARTS.pareto_chart],
    ['prev-scatter',  CHARTS.scatter],
    ['prev-corr',     CHARTS.corr_heatmap],
    ['prev-boxcat',   CHARTS.boxplot_cat],
    ['prev-grouped',  CHARTS.grouped_bar],
    ['prev-ts-line',  CHARTS.ts_line],
    ['prev-ts-ma',    CHARTS.ts_ma],
    ['prev-ts-roll',  CHARTS.ts_rolling],
  ];
  dashCharts.forEach(([id, fig]) => renderPlotly(id, fig));
  setTimeout(() => window.dispatchEvent(new Event('resize')), 120);
}

function renderTSDash() {
  if (!CHARTS.ts_line) {
    document.getElementById('tsPanel') && (document.getElementById('tsPanel').style.display = 'none');
    return;
  }
  renderPlotly('vc-ts-line',  CHARTS.ts_line);
  renderPlotly('vc-ts-ma',    CHARTS.ts_ma);
  renderPlotly('vc-ts-roll',  CHARTS.ts_rolling);
  renderPlotly('vc-ts-trend', CHARTS.ts_trend);
  loadTSSummary();
}

async function loadTSSummary() {
  const r = await fetch('/api/timeseries');
  const d = await r.json();
  if (!d.detected) return;
  const el = document.getElementById('tsStatsBadges');
  if (el) el.innerHTML = `<span style="font-size:13px;color:var(--gold);font-weight:700">${d.trend} · ${d.periods} Periode · +${d.growth_pct}%</span>`;
  const tsBar = document.getElementById('tsSummaryBar');
  if (tsBar) {
    tsBar.innerHTML = [
      ['Trend', d.trend],
      ['Periode', `${d.min_date} — ${d.max_date}`],
      ['Pertumbuhan', `+${d.growth_pct}%`],
      ['Total', fmtVal(d.total)],
      ['Avg/Periode', fmtVal(d.avg_per_period)],
    ].map(([l,v]) => `<div class="ts-stat-card"><div class="ts-stat-val">${v}</div><div class="ts-stat-lbl">${l}</div></div>`).join('');
  }
  addActivity('Time Series terdeteksi otomatis (' + d.date_col + ')');
}

// ── VIZ GROUP TABS ──────────────────────────────────────────
function setVizGroup(name, el) {
  document.querySelectorAll('.viz-group').forEach(g => g.classList.remove('active'));
  document.querySelectorAll('.vt').forEach(b => b.classList.remove('active'));
  const g = document.getElementById('vg-' + name);
  if (g) g.classList.add('active');
  if (el) el.classList.add('active');
  // Re-render charts di group yang baru aktif supaya muncul
  setTimeout(() => {
    window.dispatchEvent(new Event('resize'));
    renderDashViz();
  }, 80);
}

// ── FULL PAGE VIZ ────────────────────────────────────────────
function renderFullViz(group) {
  if (!chartsLoaded) {
    loadCharts().then(() => setTimeout(() => renderFullViz(group), 300));
    return;
  }

  const map = {
    num:    [['fv-hist','histogram'],['fv-box','boxplot'],['fv-density','density'],['fv-qq','qq_plot'],['fv-violin','violin']],
    cat:    [['fv-bar','bar_chart'],['fv-pie','pie_chart'],['fv-count','count_plot'],['fv-pareto','pareto_chart']],
    biv:    [['fv-scatter','scatter'],['fv-corr','corr_heatmap'],['fv-regression','regression'],['fv-bubble','bubble']],
    catnum: [['fv-boxcat','boxplot_cat'],['fv-violincat','violin_cat'],['fv-grouped','grouped_bar'],['fv-strip','strip_plot']],
    ts:     [['fv-ts-line','ts_line'],['fv-ts-ma','ts_ma'],['fv-ts-roll','ts_rolling'],['fv-ts-trend','ts_trend']],
  };

  const items = map[group] || [];

  items.forEach(([id, key]) => {
    const fig = CHARTS[key];
    const el  = document.getElementById(id);

    // Tampilkan info jika chart tidak ada datanya
    if (!fig || fig.error) {
      if (el) {
        el.innerHTML = `
          <div style="display:flex;flex-direction:column;align-items:center;
                      justify-content:center;height:100%;min-height:200px;
                      color:var(--textm);font-size:10px;gap:6px;">
            <span style="font-size:24px">📊</span>
            <span>Data tidak tersedia untuk chart ini.</span>
            <span style="font-size:9px;opacity:.7">Key: ${key}</span>
          </div>`;
      }
      return;
    }

    if (!el) return;

    // Paksa Plotly render ulang
    try {
      Plotly.purge(el);
    } catch(e) {}
    el._plotlyInitialized = false;

    // Tambah responsive layout
    const layout = Object.assign({}, fig.layout, {
      autosize:     true,
      margin:       Object.assign({ t: 36, r: 12, b: 40, l: 50 }, fig.layout?.margin),
      paper_bgcolor:'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
    });

    try {
      Plotly.newPlot(el, fig.data, layout, { responsive: true, displayModeBar: false });
      el._plotlyInitialized = true;
    } catch(e) {
      console.warn('Plotly error:', id, e);
    }
  });

  if (group === 'ts') loadTSSummary();

  // Column selector untuk numerical & categorical viz
  _buildColumnSelector(group);

  // Triple resize untuk chart yang butuh waktu
  [150, 500, 1000].forEach(ms =>
    setTimeout(() => window.dispatchEvent(new Event('resize')), ms)
  );
}

// ── COLUMN SELECTOR ────────────────────────────────────────────
// Tambahkan column selector bar di atas chart panels
// agar pengguna bisa memilih kolom mana yang akan divisualisasikan

let _currentVizColumn = {};

function _buildColumnSelector(group) {
  if (group !== 'num' && group !== 'cat') return;
  
  const tabId = group === 'num' ? 'viz_num' : 'viz_cat';
  const tabEl = document.getElementById('tab-' + tabId);
  if (!tabEl) return;

  // Cari kolom dari CHARTS
  let cols = [];
  if (group === 'num' && CHARTS.num_cols) {
    cols = CHARTS.num_cols;
  } else if (group === 'cat' && CHARTS.cat_cols) {
    cols = CHARTS.cat_cols;
  }

  if (cols.length < 2) return; // tidak perlu selector kalau cuma 1 kolom

  // Hapus selector lama kalau ada
  const existingBar = tabEl.querySelector('.col-selector-bar');
  if (existingBar) existingBar.remove();

  const bar = document.createElement('div');
  bar.className = 'col-selector-bar';
  bar.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;padding:12px 16px;margin-bottom:12px;background:var(--oak-white);border-radius:10px;align-items:center';

  const label = document.createElement('span');
  label.textContent = group === 'num' ? 'Pilih Kolom Numerik:' : 'Pilih Kolom Kategorikal:';
  label.style.cssText = 'font-size:14px;font-weight:600;color:var(--textm);margin-right:6px';
  bar.appendChild(label);

  const currentCol = _currentVizColumn[group] || cols[0];

  cols.forEach(col => {
    const btn = document.createElement('button');
    btn.textContent = col;
    btn.dataset.col = col;
    btn.style.cssText = `padding:8px 16px;border-radius:8px;border:1px solid var(--border);background:${col === currentCol ? 'var(--gold)' : 'var(--oak-white)'};color:${col === currentCol ? '#fff' : 'var(--text1)'};font-size:14px;cursor:pointer;font-weight:${col === currentCol ? '700' : '400'};transition:all 0.2s`;
    btn.onmouseover = () => { if (col !== currentCol) btn.style.background = 'var(--gold-lt)'; };
    btn.onmouseout = () => { if (col !== currentCol) btn.style.background = 'var(--oak-white)'; };
    btn.onclick = () => _selectColumn(group, col);
    bar.appendChild(btn);
  });

  // Sisipkan di awal tab, sebelum viz-nav
  const navWrap = tabEl.querySelector('.viz-nav-wrap') || tabEl.querySelector('.viz-panels-wrap');
  if (navWrap) {
    tabEl.insertBefore(bar, navWrap);
  } else {
    tabEl.prepend(bar);
  }
}

function _selectColumn(group, col) {
  _currentVizColumn[group] = col;
  
  const tabId = group === 'num' ? 'viz_num' : 'viz_cat';
  const tabEl = document.getElementById('tab-' + tabId);
  if (!tabEl) return;

  // Update tampilan button
  const buttons = tabEl.querySelectorAll('.col-selector-bar button');
  buttons.forEach(btn => {
    const isActive = btn.dataset.col === col;
    btn.style.background = isActive ? 'var(--gold)' : 'var(--oak-white)';
    btn.style.color = isActive ? '#fff' : 'var(--text1)';
    btn.style.fontWeight = isActive ? '700' : '400';
  });

  // Update axis selectors & trigger chart regeneration
  const cidMap = group === 'num'
    ? ['fv-hist', 'fv-box', 'fv-density', 'fv-qq', 'fv-violin']
    : ['fv-bar', 'fv-pie', 'fv-count', 'fv-pareto'];

  cidMap.forEach(cid => {
    const xSel = document.getElementById('xl-' + cid);
    if (xSel) {
      // Set value and trigger change
      xSel.value = col;
      if (!_vizAxisCols[cid]) _vizAxisCols[cid] = {};
      _vizAxisCols[cid].x = col;
      _regenChart(cid);
    }
  });
}

// ── INSIGHT ─────────────────────────────────────────────────
async function loadInsight() {
  const el  = document.getElementById('insightFull');
  const el2 = document.getElementById('insightList');
  var _lang=window.DM_LANG||'id';
  if (el) el.textContent = _lang==='id'?'⏳ Menghasilkan insight AI...':'⏳ Generating AI insight...';
  if (el2) el2.innerHTML = '<div class="ins-item"><div class="ins-text">'+( _lang==='id'?'⏳ Memuat insight...':'⏳ Loading insight...')+'</div></div>';

  const r = await fetch('/api/insight?lang=' + _lang, {method:'POST'});
  const d = await r.json();
  if (el)  el.textContent = d.insight || '—';

  // Extract bullet-style for dashboard widget
  const lines = (d.insight || '').split('\n').filter(l => l.trim());
  const bullets = lines.slice(0, 5);
  const colors  = ['#6366F1','#DC2626','#059669','#D97706','#7C3AED'];
  if (el2) el2.innerHTML = bullets.map((b,i) =>
    `<div class="ins-item" style="border-left-color:${colors[i]}">
       <div class="ins-text">${b.replace(/^[0-9]+\.\s*/,'').substring(0,120)}</div>
     </div>`).join('');

  // Quality report
  buildQualityReport();
  addActivity((window.DM_LANG||'id')==='id'?'AI Insight digenerate':'AI Insight generated');
  insightLoaded = true;
}

function buildQualityReport() {
  const el = document.getElementById('qualityReport');
  if (!el) return;
  var _lang=window.DM_LANG||'id',_id=_lang==='id';
  fetch('/api/overview').then(r=>r.json()).then(d => {
    const score = Math.max(0, 100 - (d.missing_pct || 0) * 2).toFixed(0);
    const color = score >= 90 ? '#2E7D32' : score >= 70 ? '#E65100' : '#C62828';
    const label = score >= 90 ? (_id?'Sangat Baik':'Excellent') : score >= 70 ? (_id?'Baik':'Good') : (_id?'Cukup':'Fair');
    const metrics = [
      [_id?'Kelengkapan':'Completeness', Math.max(0,100-(d.missing_pct||0)*2).toFixed(1)],
      [_id?'Kolom Numerik':'Numeric Cols',  d.num_cols],
      [_id?'Kolom Kategorikal':'Categorical Cols', d.cat_cols],
      [_id?'Kolom Datetime':'Datetime Cols', d.dt_cols],
    ];
    el.innerHTML = `
      <div style="text-align:center;padding:12px 0 10px">
        <div style="font-size:32px;font-weight:700;color:${color}">${score}%</div>
        <div style="font-size:13px;color:var(--textm)">`+(_id?'Skor Kualitas Data':'Data Quality Score')+`</div>
        <div style="margin-top:8px;padding:6px 16px;background:#EFF6FF;border-radius:6px;font-size:13px;font-weight:700;color:#6366F1;display:inline-block">✓ ${label}</div>
      </div>` +
      metrics.map(([n,v]) => `
        <div style="display:flex;justify-content:space-between;font-size:13px;color:var(--textm);margin-bottom:4px">
          <span>${n}</span><span style="font-weight:700;color:var(--text1)">${v}</span>
        </div>`).join('');
  });
}

// ── UPLOAD ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const fi = document.getElementById('fileInput');
  const uz = document.getElementById('uploadZone');
  if (fi) fi.addEventListener('change', () => { if (fi.files[0]) uploadFile(fi.files[0]); });
  if (uz) {
    uz.addEventListener('dragover', e => { e.preventDefault(); uz.style.borderColor='var(--gold)'; });
    uz.addEventListener('dragleave', () => { uz.style.borderColor=''; });
    uz.addEventListener('drop', e => {
      e.preventDefault(); uz.style.borderColor='';
      if (e.dataTransfer.files[0]) uploadFile(e.dataTransfer.files[0]);
    });
  }
});

async function uploadFile(file) {
  const st = document.getElementById('uploadStatus');
  if (st) st.textContent = '⏳ Mengupload dan memproses...';
  const fd = new FormData();
  fd.append('file', file);
  const r = await fetch('/upload', {method:'POST', body:fd});
  const d = await r.json();
  if (d.success) {
    if (st) st.textContent = `✅ Berhasil! ${fmtNum(d.rows)} baris · ${d.cols} kolom`;
    chartsLoaded = false; insightLoaded = false;
    await init();
    addActivity(`File "${d.filename}" diupload`);
  } else {
    if (st) st.textContent = `❌ Error: ${d.error}`;
  }
}

async function loadSample() {
  const st = document.getElementById('uploadStatus');
  if (st) st.textContent = '⏳ Memuat sample dataset...';
  const r = await fetch('/load_sample', {method:'POST'});
  const d = await r.json();
  if (d.success) {
    if (st) st.textContent = '✅ Sample dataset berhasil dimuat!';
    chartsLoaded = false; insightLoaded = false;
    await init();
  }
}

// ── TABLE BUILDER ────────────────────────────────────────────
function hideTableSkel(tableId) {
  const wrapMap = {
    'previewTable': 'previewSkel',
    'numSummaryTable': 'numSkel',
  };
  const skelId = wrapMap[tableId];
  if (skelId) {
    const sk = document.getElementById(skelId);
    if (sk) sk.classList.add('sk-hide');
  }
  const wrap = document.getElementById(tableId + 'Wrap');
  if (wrap) wrap.classList.remove('sk-hide');
}

function buildTable(id, cols, rows) {
  const t = document.getElementById(id);
  if (!t) return;
  hideTableSkel(id);
  t.querySelector('thead').innerHTML = `<tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr>`;
  t.querySelector('tbody').innerHTML = rows.map(row =>
    `<tr>${cols.map(c => `<td>${row[c] ?? '—'}</td>`).join('')}</tr>`).join('');
}

function buildTableRaw(id, cols, rows) {
  const t = document.getElementById(id);
  if (!t) return;
  hideTableSkel(id);
  t.querySelector('thead').innerHTML = `<tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr>`;
  t.querySelector('tbody').innerHTML = rows.map(row =>
    `<tr>${cols.map(c => `<td>${row[c] ?? '—'}</td>`).join('')}</tr>`).join('');
}

// ── UTILS ────────────────────────────────────────────────────
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = val;
    const sk = document.getElementById('sk-' + id);
    if (sk) sk.classList.add('sk-hide');
  }
}
function truncate(s, n) { return s && s.length > n ? s.slice(0, n) + '…' : s; }
function fmtNum(n) { return n != null ? Number(n).toLocaleString('id-ID') : '—'; }
function fmtVal(v) {
  if (v == null) return '—';
  const n = parseFloat(v);
  if (isNaN(n)) return v;
  if (Math.abs(n) >= 1e9) return (n/1e9).toFixed(2) + 'B';
  if (Math.abs(n) >= 1e6) return (n/1e6).toFixed(2) + 'M';
  if (Math.abs(n) >= 1e3) return (n/1e3).toFixed(1) + 'K';
  return n.toFixed(2);
}

// ── INIT ─────────────────────────────────────────────────────
async function init() {
  await loadOverview();
  await loadDashboardPreview();
  loadNumericalDash();
  loadCategoricalDash();
  await loadCharts();
}

async function loadDashboardPreview() {
  const r = await fetch('/api/preview?limit=5');
  const d = await r.json();
  buildTable('previewTable', d.columns.slice(0,6), d.data.slice(0,5));
  loadColInfo();
}

window.addEventListener('load', init);

// ── DARK / LIGHT MODE ────────────────────────────────────────
function toggleTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  if (isDark) {
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('datamind-theme', 'light');
    document.getElementById('themeToggleBtn').textContent = '🌙';
  } else {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('datamind-theme', 'dark');
    document.getElementById('themeToggleBtn').textContent = '☀️';
  }
}

// Restore theme saat halaman load
(function() {
  const saved = localStorage.getItem('datamind-theme');
  if (saved === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    const btn = document.getElementById('themeToggleBtn');
    if (btn) btn.textContent = '☀️';
  }
})();

// ── PROFILE DROPDOWN ─────────────────────────────────────────
function toggleProfile() {
  const card    = document.getElementById('profileCard');
  const trigger = document.getElementById('profileTrigger');
  const isOpen  = card.classList.contains('open');
  card.classList.toggle('open', !isOpen);
  trigger.classList.toggle('open', !isOpen);
}

document.addEventListener('click', function(e) {
  const wrap = document.getElementById('profileWrap');
  if (wrap && !wrap.contains(e.target)) {
    document.getElementById('profileCard')?.classList.remove('open');
    document.getElementById('profileTrigger')?.classList.remove('open');
  }
  const sw = document.getElementById('settingsWrap');
  if (sw && !sw.contains(e.target)) {
    document.getElementById('settingsDropdown')?.classList.remove('open');
  }
});

function toggleSettings() {
  const dd = document.getElementById('settingsDropdown');
  dd.classList.toggle('open');
}

// Init auto-collapse checkbox
document.addEventListener('DOMContentLoaded', function() {
  const cb = document.getElementById('autoCollapseCheck');
  if (cb) {
    const saved = localStorage.getItem('datamind-auto-collapse');
    if (saved === 'false') cb.checked = false;
    cb.addEventListener('change', function() {
      window.setAutoCollapse(cb.checked);
    });
  }
});

// ── SEARCH BAR REAL-TIME ─────────────────────────────────────

// Daftar menu yang bisa dicari
const SEARCH_MENUS = [
  { label: 'Dashboard',                 desc: 'Ringkasan dataset & overview', icon: '⊞', tab: 'dashboard' },
  { label: 'Upload Data',               desc: 'Upload file CSV/Excel/TXT',    icon: '↑', tab: 'upload' },
  { label: 'Data Preview',              desc: 'Lihat isi dataset',            icon: '⊟', tab: 'preview' },
  { label: 'Descriptive — Numerical',   desc: 'Statistik kolom numerik',      icon: '#', tab: 'numerical' },
  { label: 'Descriptive — Categorical', desc: 'Statistik kolom kategorikal',  icon: '≡', tab: 'categorical' },
  { label: 'Viz — Numerical',           desc: 'Histogram, Boxplot, dll',      icon: '◈', tab: 'viz_num' },
  { label: 'Viz — Categorical',         desc: 'Bar Chart, Pie Chart, dll',    icon: '◉', tab: 'viz_cat' },
  { label: 'Viz — Bivariate',           desc: 'Scatter, Heatmap, Regression', icon: '⋈', tab: 'viz_biv' },
  { label: 'Viz — Cat vs Num',          desc: 'Boxplot, Violin per Kategori', icon: '⊕', tab: 'viz_catnum' },
  { label: 'Time Series',               desc: 'Analisis data waktu otomatis', icon: '~', tab: 'timeseries' },
  { label: 'Interpretation',            desc: 'AI Insight & analisis',        icon: '✦', tab: 'insight' },
  { label: 'Download',                  desc: 'Export PDF/Excel/HTML',        icon: '↓', tab: 'download' },
];

// Data kolom dataset — diisi saat overview load
let SEARCH_COLS = [];

function initSearch() {
  const input    = document.getElementById('searchInput');
  const dropdown = document.getElementById('searchDropdown');
  const clearBtn = document.getElementById('searchClear');
  if (!input) return;

  input.addEventListener('input', function() {
    const q = input.value.trim().toLowerCase();
    clearBtn.style.display = q.length ? 'inline' : 'none';
    if (!q) { dropdown.style.display = 'none'; return; }

    // Filter menu
    const menuRes = SEARCH_MENUS.filter(m =>
      m.label.toLowerCase().includes(q) || m.desc.toLowerCase().includes(q)
    );

    // Filter kolom dataset
    const colRes = SEARCH_COLS.filter(c =>
      c.toLowerCase().includes(q)
    ).slice(0, 5);

    let html = '';
    if (menuRes.length) {
      html += '<div class="search-group-lbl">Fitur & Halaman</div>';
      menuRes.forEach(m => {
        html += `<div class="search-result-item" onclick="searchGoTo('${m.tab}')">
          <span class="sri-icon">${m.icon}</span>
          <div><div class="sri-label">${m.label}</div><div class="sri-desc">${m.desc}</div></div>
        </div>`;
      });
    }
    if (colRes.length) {
      html += '<div class="search-group-lbl">Kolom Dataset</div>';
      colRes.forEach(c => {
        html += `<div class="search-result-item" onclick="searchGoToCol('${c}')">
          <span class="sri-icon">📊</span>
          <div><div class="sri-label">${c}</div><div class="sri-desc">Kolom dataset</div></div>
        </div>`;
      });
    }
    if (!html) {
      html = `<div class="search-empty">Tidak ada hasil untuk "<b>${input.value}</b>"</div>`;
    }

    dropdown.innerHTML = html;
    dropdown.style.display = 'block';
  });

  // Tutup dropdown kalau klik di luar
  document.addEventListener('click', function(e) {
    const wrapper = document.getElementById('searchWrapper');
    if (wrapper && !wrapper.contains(e.target)) {
      dropdown.style.display = 'none';
    }
  });

  // Escape key
  input.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') { dropdown.style.display = 'none'; input.blur(); }
  });
}

function searchGoTo(tabId) {
  const navEl = document.querySelector(`[data-tab="${tabId}"]`);
  switchTab(tabId, navEl);
  clearSearch();
}

function searchGoToCol(colName) {
  // Cari di tabel preview atau stats
  searchGoTo('preview');
  clearSearch();
  setTimeout(() => {
    const cells = document.querySelectorAll('#fullPreviewTable th');
    cells.forEach(th => {
      if (th.textContent.trim() === colName) {
        th.scrollIntoView({ behavior: 'smooth', block: 'center' });
        th.style.background = 'var(--gold-lt)';
        th.style.transition = 'background 0.3s';
        setTimeout(() => { th.style.background = ''; }, 2000);
      }
    });
  }, 300);
}

function clearSearch() {
  const input    = document.getElementById('searchInput');
  const dropdown = document.getElementById('searchDropdown');
  const clearBtn = document.getElementById('searchClear');
  if (input)    input.value = '';
  if (dropdown) dropdown.style.display = 'none';
  if (clearBtn) clearBtn.style.display = 'none';
}

// Inisialisasi search saat DOM siap
document.addEventListener('DOMContentLoaded', function() {
  initSearch();

  // Restore dark mode
  const saved = localStorage.getItem('datamind-theme');
  if (saved === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    const btn = document.getElementById('themeToggleBtn');
    if (btn) btn.textContent = '☀️';
  }
});

// Tambah kolom ke search setelah data load
const _origLoadOverview = loadOverview;
loadOverview = async function() {
  await _origLoadOverview();
  // Ambil kolom dari API column_info untuk search & type filter
  try {
    const r = await fetch('/api/column_info');
    const d = await r.json();
    SEARCH_COLS = d.map(c => c.name);
    window._colMetaForPie = {};
    d.forEach(c => { window._colMetaForPie[c.name] = c.scale; });
  } catch(e) {}
};

// ── TABLEAU CHART STYLING ────────────────────────────────────
const _cSt = {};
function _gs(id) {
  if (!_cSt[id]) _cSt[id] = {cc:'#6366F1', ac:'#64748B', bc:'transparent', gc:'#E2E8F0'};
  return _cSt[id];
}
const _keyMap = VIZ_KEY_MAP;
function toggleStylePanel(id) {
  const p = document.getElementById('sp-'+id);
  if (!p) return;
  const body = p.closest('.viz-panel-body');
  const isOpen = body ? body.classList.contains('style-open') : (p.style.display !== 'none' && p.style.display !== '');

  // Close all open panels
  document.querySelectorAll('.viz-panel-body.style-open').forEach(el => {
    el.classList.remove('style-open');
    const b = el.closest('.viz-panel')?.querySelector('.vc-style-btn');
    if (b) b.classList.remove('style-active');
  });
  // Resize after closing so chart expands back to full width
  setTimeout(() => { window.dispatchEvent(new Event('resize')); }, 310);

  // Open if was closed
  if (!isOpen) {
    if (body) {
      body.classList.add('style-open');
      const btn = body.closest('.viz-panel')?.querySelector('.vc-style-btn');
      if (btn) btn.classList.add('style-active');
      setTimeout(() => {
        // Force Plotly to recalculate width after transition
        const el = document.getElementById(id);
        if (el && el._plotlyInitialized) {
          Plotly.Plots.resize(el);
          // Double-fire after full transition completes
          setTimeout(() => Plotly.Plots.resize(el), 150);
        }
        window.dispatchEvent(new Event('resize'));
      }, 310);
    } else {
      p.style.display = '';
    }
  }
}
function _ma(gid, color) {
  const g = document.getElementById(gid);
  if (!g) return;
  g.querySelectorAll('.tsp-sw').forEach(s => s.classList.toggle('tsp-sw-act', s.title===color));
}
function setCC(id,c){ _gs(id).cc=c; _ma('sw-c-'+id,c); applyChartStyle(id); }
function setAC(id,c){ _gs(id).ac=c; _ma('sw-a-'+id,c); applyChartStyle(id); }
function setBC(id,c){ _gs(id).bc=c; _ma('sw-b-'+id,c); const b=document.getElementById('body-'+id); if(b) b.style.background=c==='transparent'?'':c; applyChartStyle(id); }
function setGC(id,c){ _gs(id).gc=c; _ma('sw-g-'+id,c); applyChartStyle(id); }

function applyChartStyle(id) {
  const fig = CHARTS[_keyMap[id]];
  if (!fig || fig.error) return;
  const s = _gs(id);
  const titleEl = document.getElementById('title-'+id);
  const chartTitle = titleEl ? titleEl.value : '';
  const bgVal = s.bc==='transparent' ? 'rgba(0,0,0,0)' : s.bc;
  const gridVal = s.gc==='transparent' ? 'rgba(0,0,0,0)' : s.gc;
  const axSt = { color:s.ac, linecolor:s.ac, gridcolor:gridVal, tickcolor:s.ac, zerolinecolor:s.ac };
  const newData = fig.data.map(t => {
    const tr = Object.assign({}, t);
    if (tr.type==='bar'||tr.type==='histogram') tr.marker = Object.assign({},tr.marker,{color:s.cc});
    else if (tr.type==='scatter'||tr.type==='scattergl') {
      if (tr.mode&&tr.mode.includes('lines')) tr.line=Object.assign({},tr.line,{color:s.cc});
      if (!tr.mode||tr.mode.includes('markers')) tr.marker=Object.assign({},tr.marker,{color:s.cc});
    } else if (tr.type==='violin'||tr.type==='box') {
      tr.fillcolor=s.cc+'88'; tr.line=Object.assign({},tr.line,{color:s.cc});
    }
    return tr;
  });
  const layout = Object.assign({}, fig.layout, {
    paper_bgcolor:bgVal, plot_bgcolor:bgVal,
    font:{family:'inherit',size:13,color:s.ac},
    title:{text:chartTitle, font:{size:15,color:s.ac}, x:0.04},
    xaxis:Object.assign({},fig.layout?.xaxis,axSt),
    yaxis:Object.assign({},fig.layout?.yaxis,axSt),
    margin:Object.assign({t:40,r:14,b:40,l:50},fig.layout?.margin),
  });
  const el = document.getElementById(id);
  if (el) Plotly.react(el, newData, layout, {responsive:true, displayModeBar:false});
}

// ── SIDEBAR AUTO HIDE / SHOW ON HOVER ───────────────────────
(function initSidebarHover() {
  const sidebar  = document.getElementById('sidebar');
  const mainArea = document.querySelector('.main-area');
  if (!sidebar || !mainArea) return;

  let hideTimer = null;
  let isLocked  = false;
  let isDisabled = localStorage.getItem('datamind-auto-collapse') === 'false';

  function isEnabled() { return !isLocked && !isDisabled; }

  const _origToggle = window.toggleSidebar;
  window.toggleSidebar = function() {
    isLocked = !sidebar.classList.contains('collapsed');
    _origToggle && _origToggle();
  };

  mainArea.addEventListener('mouseenter', function() {
    if (!isEnabled()) return;
    hideTimer = setTimeout(function() {
      sidebar.classList.add('auto-collapsed');
    }, 400);
  });

  mainArea.addEventListener('mouseleave', function() {
    clearTimeout(hideTimer);
  });

  sidebar.addEventListener('mouseenter', function() {
    clearTimeout(hideTimer);
    if (isEnabled()) sidebar.classList.remove('auto-collapsed');
  });

  sidebar.addEventListener('mouseleave', function(e) {
    if (!isEnabled()) return;
    const to = e.relatedTarget;
    if (to && (mainArea === to || mainArea.contains(to))) {
      hideTimer = setTimeout(function() {
        sidebar.classList.add('auto-collapsed');
      }, 400);
    }
  });

  // Hover trigger strip - munculin sidebar saat hover di tepi kiri
  const hoverTrigger = document.getElementById('sidebarHoverTrigger');
  if (hoverTrigger) {
    hoverTrigger.addEventListener('mouseenter', function() {
      clearTimeout(hideTimer);
      if (isEnabled()) sidebar.classList.remove('auto-collapsed');
    });
  }

  // Expose for settings toggle
  window.setAutoCollapse = function(enabled) {
    isDisabled = !enabled;
    localStorage.setItem('datamind-auto-collapse', enabled);
    if (!enabled) sidebar.classList.remove('auto-collapsed');
  };
})();
/* ══════════════════════════════════════════════════════
   VIZ NAV SWITCH + AXIS LABELS
══════════════════════════════════════════════════════ */
const _vizRendered = {}; // track which charts have been rendered
const _vizAxisLabels = {}; // cid -> {xl, yl}

function vizNavSwitch(tabId, cid) {
  // Hide all panels in this tab
  document.querySelectorAll('#tab-' + tabId + ' .viz-panel').forEach(p => p.style.display = 'none');
  // Deactivate all nav btns
  document.querySelectorAll('#vnb-' + tabId + ' .viz-nav-btn').forEach(b => b.classList.remove('viz-nav-active'));
  // Show selected
  const panel = document.getElementById('vp-' + cid);
  if (panel) panel.style.display = '';
  // Activate btn
  const btn = document.querySelector('#vnb-' + tabId + ' .viz-nav-btn[onclick*="' + cid + '"]');
  if (btn) btn.classList.add('viz-nav-active');
  // Populate axis dropdowns
  populateAxisSelects(cid);
  // Render chart if not yet rendered
  if (!_vizRendered[cid]) {
    _vizRendered[cid] = true;
    renderSingleViz(cid);
  }
  // Pastikan chart langsung penuh sesuai lebar panel, tanpa harus klik Style dulu.
  // Render pertama dan kunjungan ulang sama-sama butuh ini karena panel baru
  // saja jadi 'display:' (bukan none) sehingga ukurannya belum final saat
  // Plotly pertama kali menghitung lebar container.
  _forceVizResize(cid);
}

function _forceVizResize(cid) {
  const el = document.getElementById(cid);
  if (!el) return;
  const doResize = () => {
    if (el._plotlyInitialized) {
      try { Plotly.Plots.resize(el); } catch (e) {}
    }
  };
  // Beberapa kali dengan delay berbeda untuk menutup race-condition:
  // requestAnimationFrame menunggu 1 paint, lalu fallback timeout
  // setelah layout/transition CSS benar-benar selesai.
  requestAnimationFrame(doResize);
  setTimeout(doResize, 120);
  setTimeout(doResize, 350);
}

const _VIZ_KEY_MAP = VIZ_KEY_MAP;

function renderSingleViz(cid) {
  if (!chartsLoaded) { loadCharts().then(() => renderSingleViz(cid)); return; }
  const key = _VIZ_KEY_MAP[cid];
  const fig = CHARTS[key];
  const el  = document.getElementById(cid);
  if (!el) return;
  if (!fig || fig.error) {
    el.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:400px;color:#94a3b8;font-size:15px;gap:10px"><span style="font-size:48px">📊</span><span>Data tidak tersedia</span></div>';
    return;
  }
  try { Plotly.purge(el); } catch(e) {}

  const s = _cSt[cid] || {};
  const ax = _vizAxisLabels[cid] || {};
  const bgVal = (s.bc && s.bc !== 'transparent') ? s.bc : 'rgba(0,0,0,0)';
  const axColor = s.ac || '#64748B';
  const gridColor = (s.gc && s.gc !== 'transparent') ? s.gc : '#E2E8F0';

  const axSt = {
    color: axColor, linecolor: axColor,
    gridcolor: gridColor, tickcolor: axColor, zerolinecolor: axColor,
    title: ax.xl ? {text: ax.xl, font:{color:axColor, size:12}} : undefined,
  };
  const yAxSt = Object.assign({}, axSt, ax.yl ? {title:{text:ax.yl, font:{color:axColor, size:12}}} : {});

  const newData = (fig.data||[]).map(t => {
    const tr = Object.assign({}, t);
    if (s.cc) {
      if (tr.type==='bar'||tr.type==='histogram') tr.marker = Object.assign({},tr.marker,{color:s.cc});
      else if (tr.type==='scatter'||tr.type==='scattergl') {
        if (tr.mode&&tr.mode.includes('lines')) tr.line=Object.assign({},tr.line,{color:s.cc});
        if (!tr.mode||tr.mode.includes('markers')) tr.marker=Object.assign({},tr.marker,{color:s.cc});
      } else if (tr.type==='violin'||tr.type==='box') {
        tr.fillcolor=s.cc+'88'; tr.line=Object.assign({},tr.line,{color:s.cc});
      }
    }
    return tr;
  });

  const titleEl = document.getElementById('title-' + cid);
  const chartTitle = titleEl ? titleEl.value : '';

  const layout = Object.assign({}, fig.layout, {
    autosize: true,
    height: 600,
    paper_bgcolor: bgVal,
    plot_bgcolor: bgVal,
    font: {family:'Inter,Plus Jakarta Sans,sans-serif', size:14, color: axColor},
    title: {text: chartTitle, font:{size:18, color: axColor}, x:0.04, pad:{t:10}},
    xaxis: Object.assign({}, fig.layout?.xaxis, axSt),
    yaxis: Object.assign({}, fig.layout?.yaxis, yAxSt),
    margin: {t:56, r:28, b:56, l:64},
  });

  try {
    Plotly.newPlot(el, newData, layout, {responsive:true, displayModeBar:false});
    el._plotlyInitialized = true;
  } catch(e) { console.warn('renderSingleViz error:', cid, e); }
}

/* ── chart_type map: cid → backend chart_type key ── */
const _VIZ_CHART_TYPE = VIZ_KEY_MAP;

// Axis state per cid: {x_col, y_col, z_col}
const _vizAxisCols = {};

function _getScale(col) {
  return window._colMetaForPie && window._colMetaForPie[col]
    ? window._colMetaForPie[col] : null;
}
function _isNumCol(col) {
  if (!col) return false;
  const sc = _getScale(col);
  if (sc) return ['ratio','interval'].includes(sc);
  if (CHARTS.num_cols && CHARTS.num_cols.includes(col)) return true;
  if (CHARTS.cat_cols && CHARTS.cat_cols.includes(col)) return false;
  return false;
}
function _isCatCol(col) {
  if (!col) return false;
  const sc = _getScale(col);
  if (sc) return ['nominal','ordinal','boolean'].includes(sc);
  if (CHARTS.cat_cols && CHARTS.cat_cols.includes(col)) return true;
  if (CHARTS.num_cols && CHARTS.num_cols.includes(col)) return false;
  return false;
}
function _chartNeedsNumX(cid) {
  return ['fv-hist','fv-box','fv-density','fv-qq','fv-violin',
    'fv-scatter','fv-regression','fv-bubble'].includes(cid);
}
function _chartNeedsCatX(cid) {
  return ['fv-bar','fv-count','fv-pareto',
    'fv-boxcat','fv-violincat','fv-grouped','fv-strip','fv-pie'].includes(cid);
}

async function _regenChart(cid) {
  const chart_type = _VIZ_CHART_TYPE[cid];
  if (!chart_type) return;
  const ax = _vizAxisCols[cid] || {};
  const x_col = ax.x || '';
  const y_col = ax.y || '';
  const z_col = ax.z || '';

  const bivariate = ['scatter','regression','bubble','boxplot_cat','violin_cat','grouped_bar','strip_plot'];
  if (bivariate.includes(chart_type)) {
    if (!x_col && !y_col) return;
  } else {
    if (!x_col) return;
  }

  const el = document.getElementById(cid);
  if (el) el.style.opacity = '0.4';
  try {
    const r = await fetch('/api/chart_col', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({chart_type, x_col, y_col, z_col})
    });
    const d = await r.json();
    if (d.error) {
      console.warn('_regenChart backend error:', d.error);
      if (el) {
        el.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:300px;color:#EF4444;font-size:12px;gap:6px">
          <span style="font-size:28px">⚠️</span>
          <span>${d.error}</span>
          <span style="font-size:10px;opacity:0.6">Pilih kolom yang sesuai dengan tipe chart</span>
        </div>`;
        el._plotlyInitialized = false;
      }
      if (el) el.style.opacity = '';
      return;
    }
    if (d.chart) {
      const key = _VIZ_KEY_MAP[cid];
      if (key) CHARTS[key] = d.chart;
      _vizRendered[cid] = false;
      renderSingleViz(cid);
      await updateVizInsight(cid);
    }
  } catch(e) { console.warn('_regenChart error:', e); }
  if (el) el.style.opacity = '';
}

function setXLabel(cid, val) {
  if (!_vizAxisLabels[cid]) _vizAxisLabels[cid] = {};
  _vizAxisLabels[cid].xl = val;
  // Track chosen column and re-fetch chart from backend
  if (!_vizAxisCols[cid]) _vizAxisCols[cid] = {};
  _vizAxisCols[cid].x = val;
  if (val) { _regenChart(cid); } else if (_vizRendered[cid]) { renderSingleViz(cid); }
}
function setYLabel(cid, val) {
  if (!_vizAxisLabels[cid]) _vizAxisLabels[cid] = {};
  _vizAxisLabels[cid].yl = val;
  if (!_vizAxisCols[cid]) _vizAxisCols[cid] = {};
  _vizAxisCols[cid].y = val;
  if (val) { _regenChart(cid); } else if (_vizRendered[cid]) { renderSingleViz(cid); }
}

function populateAxisSelects(cid) {
  // Get columns from preview table
  const cols = [];
  document.querySelectorAll('#previewTable th, #tblPreview th').forEach(th => {
    const t = th.textContent.trim();
    if (t && !cols.includes(t)) cols.push(t);
  });
  if (cols.length === 0) return;
  const opts = '<option value="">— Pilih Kolom —</option>' + cols.map(c => `<option value="${c}">${c}</option>`).join('');
  ['xl-'+cid, 'yl-'+cid].forEach(id => {
    const sel = document.getElementById(id);
    if (sel) { const cur = sel.value; sel.innerHTML = opts; if (cur) sel.value = cur; }
  });
}

// Override applyChartStyle to also re-render via renderSingleViz
const _origApplyChartStyle = applyChartStyle;
function applyChartStyle(id) {
  if (_vizRendered[id]) {
    renderSingleViz(id);
  } else {
    _origApplyChartStyle(id);
  }
}

populateAxisSelects = function(cid) {
  const NO_AXIS = ['fv-corr'];
  const NUM_X   = ['fv-hist','fv-box','fv-density','fv-qq','fv-violin'];
  const CAT_X   = ['fv-bar','fv-count','fv-pareto'];
  const NUM_XY  = ['fv-scatter','fv-regression','fv-bubble'];
  const CATNUM  = ['fv-boxcat','fv-violincat','fv-grouped','fv-strip'];
  const PIE     = ['fv-pie'];

  if (NO_AXIS.includes(cid)) {
    document.querySelectorAll(`#xl-${cid}, #yl-${cid}`).forEach(el => {
      const row = el.closest('.nsp-axis-row');
      if (row) row.style.display = 'none';
    });
    return;
  }

  let allCols = SEARCH_COLS.slice();
  if (!allCols.length) {
    document.querySelectorAll('#fullPreviewTable th').forEach(th => {
      const t = th.textContent.trim();
      if (t && !allCols.includes(t)) allCols.push(t);
    });
  }
  if (!allCols.length) return;

  let xCols, yCols;
  if (NUM_X.includes(cid))      { xCols = allCols.filter(c => _isNumCol(c)); yCols = allCols.filter(c => _isNumCol(c)); }
  else if (CAT_X.includes(cid)) { xCols = allCols.filter(c => _isCatCol(c)); yCols = allCols.filter(c => _isNumCol(c)); }
  else if (NUM_XY.includes(cid)){ xCols = allCols.filter(c => _isNumCol(c)); yCols = allCols.filter(c => _isNumCol(c)); }
  else if (CATNUM.includes(cid)){ xCols = allCols.filter(c => _isCatCol(c)); yCols = allCols.filter(c => _isNumCol(c)); }
  else if (PIE.includes(cid))   { xCols = allCols.filter(c => _isCatCol(c)); yCols = allCols.filter(c => _isNumCol(c)); }
  else                          { xCols = allCols; yCols = allCols; }

  function opts(cols) {
    return '<option value="">— Pilih Kolom —</option>' + cols.map(c => `<option value="${c}">${c}</option>`).join('');
  }

  const xSel = document.getElementById('xl-' + cid);
  const ySel = document.getElementById('yl-' + cid);
  if (xSel) { const v = xSel.value; xSel.innerHTML = opts(xCols); if (v && xCols.includes(v)) xSel.value = v; }
  if (ySel) { const v = ySel.value; ySel.innerHTML = opts(yCols); if (v && yCols.includes(v)) ySel.value = v; }

  if (PIE.includes(cid)) {
    const xRow = xSel ? xSel.closest('.nsp-axis-row') : null;
    const yRow = ySel ? ySel.closest('.nsp-axis-row') : null;
    if (xRow) { const lbl = xRow.querySelector('label'); if (lbl) lbl.textContent = 'Label'; }
    if (yRow) { const lbl = yRow.querySelector('label'); if (lbl) lbl.textContent = 'Values'; }
  }

  const bivCids = [...NUM_XY, ...CATNUM];
  if (bivCids.includes(cid) && !(_vizAxisCols[cid] && (_vizAxisCols[cid].x || _vizAxisCols[cid].y))) {
    if (xSel && xSel.options.length > 1) xSel.value = xSel.options[1].value;
    if (ySel && ySel.options.length > 2) ySel.value = ySel.options[2].value;
    else if (ySel && ySel.options.length > 1) ySel.value = ySel.options[1].value;
    if (!_vizAxisCols[cid]) _vizAxisCols[cid] = {};
    if (xSel && xSel.value) _vizAxisCols[cid].x = xSel.value;
    if (ySel && ySel.value) _vizAxisCols[cid].y = ySel.value;
  }
};

/* ══════════════════════════════════════════════════════
   PATCH 2 — Dynamic per-chart insights (enhanced)
   Each cid maps to a contextual insight text with 3+ sentences.
   Uses actual column data + axis context when available.
══════════════════════════════════════════════════════ */
function _insightFallback(id, lang) {
  const map = {
    'fv-hist': ['Histogram menampilkan distribusi frekuensi data numerik dalam bentuk bin. Pilih kolom di panel kontrol untuk melihat distribusinya secara langsung.', 'Histogram shows the frequency distribution of numeric data in bins. Select a column from the control panel to view its distribution.'],
    'fv-box': ['Boxplot meringkas distribusi melalui 5 statistik utama: minimum, Q1, median, Q3, dan maksimum. Pilih kolom numerik untuk melihat ringkasan statistiknya.', 'Boxplot summarises distribution via 5 key statistics: min, Q1, median, Q3, and max. Select a numeric column to view its summary.'],
    'fv-density': ['Density plot menampilkan estimasi distribusi probabilitas secara kontinu menggunakan KDE. Pilih kolom numerik untuk melihat kurva kepadatan distribusinya.', 'Density plot shows a continuous probability distribution estimate via KDE. Select a numeric column to view its density curve.'],
    'fv-qq': ['QQ Plot membandingkan kuantil data observasi dengan distribusi normal teoritis. Pilih kolom numerik untuk menguji asumsi normalitas secara visual.', 'QQ Plot compares observed data quantiles against a theoretical normal distribution. Select a numeric column to visually test normality.'],
    'fv-violin': ['Violin plot menggabungkan keunggulan boxplot dan density plot dalam satu tampilan. Pilih kolom numerik untuk melihat distribusi lengkapnya.', 'Violin plot combines the strengths of boxplot and density plot in one view. Select a numeric column to see its full distribution.'],
    'fv-bar': ['Bar chart menampilkan frekuensi setiap kategori secara vertikal. Pilih kolom kategorikal untuk melihat distribusi frekuensinya.', 'Bar chart displays the frequency of each category vertically. Select a categorical column to explore its frequency distribution.'],
    'fv-pie': ['Pie chart menampilkan proporsi setiap kategori sebagai irisan lingkaran. Pilih kolom kategorikal untuk melihat komposisi proporsinya.', 'Pie chart shows each category\'s proportion as a circular slice. Select a categorical column to view its composition.'],
    'fv-count': ['Count plot menampilkan jumlah observasi per kategori dalam orientasi horizontal. Pilih kolom kategorikal untuk melihat perbandingan frekuensi.', 'Count plot shows observation counts per category in horizontal orientation. Select a categorical column to compare frequencies.'],
    'fv-pareto': ['Pareto chart menggabungkan bar chart dengan garis kumulatif persentase (aturan 80/20). Pilih kolom kategorikal untuk analisis prioritas.', 'Pareto chart combines a bar chart with a cumulative percentage line (80/20 rule). Select a categorical column for priority analysis.'],
  };
  const pair = map[id] || ['Pilih kolom untuk melihat insight dari chart ini.', 'Select a column to view insight for this chart.'];
  return pair[lang === 'id' ? 0 : 1];
}

const _VIZ_INSIGHTS = {
  'fv-hist': (c, ctx) => {
    const lang = window.DM_LANG || 'id', id = lang === 'id';
    if (!c) return _insightFallback('fv-hist', lang);
    const s = c.skewness || 0;
    const dir = id ? (s > 0.5 ? 'condong kanan (right-skewed)' : s < -0.5 ? 'condong kiri (left-skewed)' : 'mendekati simetris') : (s > 0.5 ? 'right-skewed' : s < -0.5 ? 'left-skewed' : 'approximately symmetric');
    if (id) return `<b>Histogram — ${c.column}</b><br>Distribusi kolom <b>${c.column}</b> <b>${dir}</b> dengan rata-rata <b>${fmtVal(c.mean)}</b> dan standar deviasi <b>${fmtVal(c.std)}</b>. Terdeteksi <b>${c.outliers}</b> outlier, dan hasil uji normalitas menunjukkan data <b>${c.normality}</b>. ${s > 0.5 ? 'Transformasi log atau Box-Cox disarankan untuk menstabilkan varians sebelum analisis parametrik.' : s < -0.5 ? 'Distribusi condong kiri — periksa apakah terdapat batas atas buatan yang membatasi nilai maksimum.' : 'Distribusi cukup simetris, cocok untuk metode parametrik tanpa transformasi.'} Koefisien variasi <b>${c.cv}%</b> menunjukkan tingkat dispersi data relatif terhadap rata-rata.`;
    return `<b>Histogram — ${c.column}</b><br>The distribution of <b>${c.column}</b> is <b>${dir}</b> with mean <b>${fmtVal(c.mean)}</b> and std dev <b>${fmtVal(c.std)}</b>. <b>${c.outliers}</b> outlier(s) detected; normality test: <b>${c.normality}</b>. ${s > 0.5 ? 'A log or Box-Cox transformation is recommended to stabilise variance before parametric modelling.' : s < -0.5 ? 'Left-skewed — check for an artificial ceiling capping the maximum values.' : 'Sufficiently symmetric — suitable for parametric methods without transformation.'} CV of <b>${c.cv}%</b> indicates the relative dispersion level.`;
  },
  'fv-box': (c, ctx) => {
    const lang = window.DM_LANG || 'id', id = lang === 'id';
    if (!c) return _insightFallback('fv-box', lang);
    const iqr = fmtVal((c.q3 || 0) - (c.q1 || 0));
    if (id) return `<b>Boxplot — ${c.column}</b><br>Median <b>${fmtVal(c.median)}</b> dengan IQR <b>${iqr}</b> menggambarkan sebaran 50% data tengah — dari Q1 <b>${fmtVal(c.q1)}</b> hingga Q3 <b>${fmtVal(c.q3)}</b>. Teridentifikasi <b>${c.outliers}</b> titik outlier di luar ambang 1.5×IQR yang perlu diinvestigasi lebih lanjut. ${c.outliers > 0 ? 'Periksa apakah outlier merupakan kesalahan entri data atau mencerminkan variasi bisnis yang valid untuk dipertahankan dalam model.' : 'Tidak ada outlier signifikan — data tergolong bersih dan siap untuk tahap analisis berikutnya.'} Rentang total data dari <b>${fmtVal(c.min)}</b> hingga <b>${fmtVal(c.max)}</b>.`;
    return `<b>Boxplot — ${c.column}</b><br>Median <b>${fmtVal(c.median)}</b> with IQR <b>${iqr}</b> captures the middle 50% spread — from Q1 <b>${fmtVal(c.q1)}</b> to Q3 <b>${fmtVal(c.q3)}</b>. <b>${c.outliers}</b> outlier(s) detected beyond the 1.5×IQR threshold requiring further investigation. ${c.outliers > 0 ? 'Check whether outliers are data-entry errors or valid business variations worth retaining in the model.' : 'No significant outliers — data is clean and ready for the next analysis stage.'} Full range spans from <b>${fmtVal(c.min)}</b> to <b>${fmtVal(c.max)}</b>.`;
  },
  'fv-density': (c, ctx) => {
    const lang = window.DM_LANG || 'id', id = lang === 'id';
    if (!c) return _insightFallback('fv-density', lang);
    if (id) return `<b>Density Plot — ${c.column}</b><br>Distribusi <b>${c.column}</b> memiliki puncak kepadatan di sekitar mean <b>${fmtVal(c.mean)}</b> dengan tingkat skewness <b>${c.skewness}</b> dan hasil normalitas <b>${c.normality}</b>. ${c.normality === 'Normal' ? 'Bentuk kurva mendekati distribusi normal — metode statistik parametrik dapat diterapkan dengan aman.' : 'Kurva menunjukkan penyimpangan dari normal — transformasi data atau pendekatan non-parametrik lebih disarankan.'} Lebar kurva KDE mencerminkan variabilitas data: std dev <b>${fmtVal(c.std)}</b> dengan koefisien variasi <b>${c.cv}%</b>.`;
    return `<b>Density Plot — ${c.column}</b><br>The distribution of <b>${c.column}</b> peaks near mean <b>${fmtVal(c.mean)}</b> with skewness <b>${c.skewness}</b> and normality result <b>${c.normality}</b>. ${c.normality === 'Normal' ? 'The curve approximates a normal distribution — parametric methods are safe to apply.' : 'The curve deviates from normality — data transformation or non-parametric approaches are recommended.'} KDE width reflects data variability: std dev <b>${fmtVal(c.std)}</b> with CV <b>${c.cv}%</b>.`;
  },
  'fv-qq': (c, ctx) => {
    const lang = window.DM_LANG || 'id', id = lang === 'id';
    if (!c) return _insightFallback('fv-qq', lang);
    if (id) return `<b>QQ Plot — ${c.column}</b><br>Diagnosis normalitas untuk <b>${c.column}</b> menunjukkan hasil <b>${c.normality}</b>. ${c.normality === 'Normal' ? 'Titik-titik data mengikuti garis diagonal referensi — asumsi normalitas terpenuhi, model parametrik seperti regresi linear dapat digunakan.' : 'Titik-titik menyimpang dari garis diagonal — distribusi tidak normal. Transformasi Box-Cox atau Yeo-Johnson direkomendasikan sebelum analisis regresi.'} Nilai skewness <b>${c.skewness}</b> dan kurtosis <b>${c.kurtosis}</b> memberikan informasi tambahan tentang bentuk ekor distribusi — apakah lebih berat (leptokurtic) atau lebih ringan (platykurtic) dari distribusi normal.`;
    return `<b>QQ Plot — ${c.column}</b><br>Normality diagnosis for <b>${c.column}</b> indicates <b>${c.normality}</b>. ${c.normality === 'Normal' ? 'Data points follow the diagonal reference line — normality assumption is met; parametric models such as linear regression are safe.' : 'Data points deviate from the diagonal — distribution is non-normal. Box-Cox or Yeo-Johnson transformation is recommended before regression analysis.'} Skewness <b>${c.skewness}</b> and kurtosis <b>${c.kurtosis}</b> provide additional insight into tail behaviour — whether heavier (leptokurtic) or lighter (platykurtic) than normal.`;
  },
  'fv-violin': (c, ctx) => {
    const lang = window.DM_LANG || 'id', id = lang === 'id';
    if (!c) return _insightFallback('fv-violin', lang);
    const asym = Math.abs(c.skewness || 0) > 1;
    if (id) return `<b>Violin Plot — ${c.column}</b><br>Distribusi <b>${c.column}</b> divisualisasikan dengan mean <b>${fmtVal(c.mean)}</b>, std dev <b>${fmtVal(c.std)}</b>, dan skewness <b>${c.skewness}</b>. ${asym ? 'Bentuk violin terlihat asimetris, menandakan distribusi condong secara signifikan — pendekatan non-parametrik mungkin lebih tepat untuk analisis ini.' : 'Bentuk violin relatif simetris — distribusi data cukup seimbang di sekitar median tanpa kemencengan berarti.'} Bandingkan lebar violin di atas dan di bawah median untuk mendeteksi potensi multimodalitas yang tidak terlihat pada boxplot biasa.`;
    return `<b>Violin Plot — ${c.column}</b><br>Distribution of <b>${c.column}</b> shown with mean <b>${fmtVal(c.mean)}</b>, std dev <b>${fmtVal(c.std)}</b>, and skewness <b>${c.skewness}</b>. ${asym ? 'The violin shape is clearly asymmetric, indicating significant skew — non-parametric methods may be more appropriate.' : 'The violin is relatively symmetric — data is reasonably balanced around the median without substantial skew.'} Compare violin width above and below the median to detect potential multimodality invisible in a standard boxplot.`;
  },
  'fv-bar': (c, ctx) => {
    const lang = window.DM_LANG || 'id', id = lang === 'id';
    if (!c) return _insightFallback('fv-bar', lang);
    const many = c.unique > 20;
    if (id) return `<b>Bar Chart — ${c.column}</b><br>Distribusi frekuensi <b>${c.column}</b> didominasi oleh kategori <b>${c.mode || '\u2014'}</b> dengan porsi <b>${c.mode_pct || 0}%</b> dari total <b>${c.unique}</b> nilai unik. ${many ? 'Jumlah kategori cukup banyak — pertimbangkan mengelompokkan kategori minoritas (< 5%) ke dalam grup "Lainnya" untuk menyederhanakan visualisasi.' : 'Jumlah kategori masih terkelola dengan baik untuk dianalisis secara langsung.'} Investigasi lebih lanjut diperlukan untuk memastikan apakah dominasi <b>${c.mode || '\u2014'}</b> mencerminkan pola populasi nyata atau hanya bias sampling pada dataset ini.`;
    return `<b>Bar Chart — ${c.column}</b><br>Frequency distribution of <b>${c.column}</b> is dominated by category <b>${c.mode || '\u2014'}</b> at <b>${c.mode_pct || 0}%</b> across <b>${c.unique}</b> unique values. ${many ? 'Many categories — consider grouping minor categories (< 5%) into an "Other" bucket to simplify the visualisation.' : 'Category count is manageable for direct analysis.'} Further investigation is needed to confirm whether <b>${c.mode || '\u2014'}</b> dominance reflects a true population pattern or sampling bias.`;
  },
  'fv-pie': (c, ctx) => {
    const lang = window.DM_LANG || 'id', id = lang === 'id';
    if (!c) return _insightFallback('fv-pie', lang);
    const tooMany = c.unique > 7;
    if (id) return `<b>Pie Chart — ${c.column}</b><br>Komposisi <b>${c.column}</b> terdiri dari <b>${c.unique}</b> segmen dengan kategori <b>${c.mode || '\u2014'}</b> sebagai yang terbesar (<b>${c.mode_pct || 0}%</b>). ${tooMany ? 'Jumlah segmen melebihi 7 — pie chart mulai sulit dibaca; pertimbangkan beralih ke bar chart atau tampilkan hanya 5 kategori teratas untuk kejelasan proporsi.' : 'Jumlah segmen ideal untuk pie chart — perbedaan proporsi antar kategori langsung terlihat dengan jelas.'} Bandingkan proporsi ini dengan data historis atau benchmark industri untuk mengidentifikasi anomali komposisi yang memerlukan perhatian manajemen.`;
    return `<b>Pie Chart — ${c.column}</b><br>The composition of <b>${c.column}</b> has <b>${c.unique}</b> segments with <b>${c.mode || '\u2014'}</b> as the largest (<b>${c.mode_pct || 0}%</b>). ${tooMany ? 'More than 7 segments — pie charts become hard to read; consider switching to a bar chart or showing only the top 5 for clarity.' : 'Ideal segment count for a pie chart — proportional differences between categories are immediately visible.'} Compare these proportions against historical data or industry benchmarks to identify compositional anomalies requiring management attention.`;
  },
  'fv-count': (c, ctx) => {
    const lang = window.DM_LANG || 'id', id = lang === 'id';
    if (!c) return _insightFallback('fv-count', lang);
    const missHigh = (c.missing_pct || 0) > 5;
    if (id) return `<b>Count Plot — ${c.column}</b><br>Kategori <b>${c.mode || '\u2014'}</b> menjadi yang paling sering muncul dengan <b>${c.mode_freq || 0}</b> observasi atau <b>${c.mode_pct || 0}%</b> dari total data. ${missHigh ? 'Tingkat missing value <b>' + c.missing_pct + '%</b> cukup signifikan — lakukan imputasi modus atau investigasi penyebab ketidaklengkapan data sebelum analisis lanjutan.' : 'Tingkat missing value hanya <b>' + (c.missing_pct || '0') + '%</b> — kelengkapan data tergolong baik dan analisis dapat dilanjutkan.'} Perbandingan distribusi ini dengan variabel target dapat mengungkap pola prediktif yang berguna untuk pemodelan klasifikasi.`;
    return `<b>Count Plot — ${c.column}</b><br>Category <b>${c.mode || '\u2014'}</b> appears most frequently with <b>${c.mode_freq || 0}</b> observations or <b>${c.mode_pct || 0}%</b> of total data. ${missHigh ? 'Missing rate of <b>' + c.missing_pct + '%</b> is significant — perform mode imputation or investigate the cause of incompleteness before further analysis.' : 'Missing rate is only <b>' + (c.missing_pct || '0') + '%</b> — data completeness is satisfactory and analysis can proceed.'} Cross-referencing this distribution with the target variable may reveal useful predictive patterns for classification modelling.`;
  },
  'fv-pareto': (c, ctx) => {
    const lang = window.DM_LANG || 'id', id = lang === 'id';
    if (!c) return _insightFallback('fv-pareto', lang);
    if (id) return `<b>Pareto Chart — ${c.column}</b><br>Prinsip 80/20 diterapkan pada <b>${c.column}</b>: kategori teratas adalah <b>${c.mode || '\u2014'}</b> dengan <b>${c.mode_pct || 0}%</b> kontribusi. ${c.unique <= 5 ? 'Dengan hanya ' + c.unique + ' kategori, efek Pareto sangat jelas terlihat dan memudahkan identifikasi prioritas intervensi.' : 'Dari ' + c.unique + ' kategori yang ada, fokus pada kelompok yang berada di sebelah kiri garis kumulatif 80% untuk dampak bisnis maksimal.'} Gunakan analisis ini untuk alokasi sumber daya yang lebih efisien — sedikit kategori dengan kontribusi terbesar memerlukan perhatian prioritas dalam pengambilan keputusan strategis.`;
    return `<b>Pareto Chart — ${c.column}</b><br>The 80/20 principle applied to <b>${c.column}</b>: the top category is <b>${c.mode || '\u2014'}</b> at <b>${c.mode_pct || 0}%</b> contribution. ${c.unique <= 5 ? 'With only ' + c.unique + ' categories, the Pareto effect is clearly visible, simplifying intervention prioritisation.' : 'Among ' + c.unique + ' categories, focus on groups to the left of the 80% cumulative line for maximum business impact.'} Use this analysis for efficient resource allocation — the few categories with the largest contribution deserve priority attention in strategic decision-making.`;
  },
  'fv-scatter': (d, ctx) => {
    const lang = window.DM_LANG || 'id', id = lang === 'id';
    const x = (ctx && ctx.activeX) || 'X', y = (ctx && ctx.activeY) || 'Y';
    if (id) return `<b>Scatter Plot — ${x} vs ${y}</b><br>Hubungan antara <b>${x}</b> (sumbu X) dan <b>${y}</b> (sumbu Y) divisualisasikan melalui sebaran titik dalam bidang kartesian. Pola yang terbentuk mengindikasikan arah korelasi: jika titik naik ke kanan maka korelasi positif, turun ke kanan berarti negatif, dan tersebar acak menandakan tidak ada hubungan linear yang signifikan. Identifikasi pula keberadaan cluster atau outlier bivariat yang mungkin mengindikasikan segmen tersembunyi dalam data atau anomali yang perlu investigasi lebih lanjut.`;
    return `<b>Scatter Plot — ${x} vs ${y}</b><br>The relationship between <b>${x}</b> (X-axis) and <b>${y}</b> (Y-axis) is visualised through point distribution in Cartesian space. Rising rightward indicates positive correlation, falling rightward indicates negative correlation, and random scatter suggests no significant linear relationship. Also identify clusters or bivariate outliers that may reveal hidden segments in the data or anomalies requiring further investigation.`;
  },
  'fv-corr': (d, ctx) => {
    const lang = window.DM_LANG || 'id', id = lang === 'id';
    if (id) return `<b>Heatmap Korelasi — Matriks Pearson</b><br>Heatmap ini menampilkan matriks korelasi Pearson antar seluruh variabel numerik dalam dataset menggunakan gradasi warna intuitif. Warna hangat (mendekati merah) menandakan korelasi positif kuat mendekati +1, sementara warna dingin (mendekati biru) mengindikasikan korelasi negatif kuat mendekati -1. Waspadai pasangan variabel dengan korelasi di atas 0.9 — ini menandakan multikolinearitas yang dapat mendistorsi model regresi dan memerlukan penanganan seperti eliminasi variabel atau regularisasi.`;
    return `<b>Correlation Heatmap — Pearson Matrix</b><br>This heatmap displays the Pearson correlation matrix across all numeric variables using an intuitive colour gradient. Warm colours (toward red) indicate strong positive correlation approaching +1, while cool colours (toward blue) indicate strong negative correlation approaching -1. Watch for variable pairs with correlation above 0.9 — this signals multicollinearity that can distort regression models, requiring treatment such as variable elimination or regularisation.`;
  },
  'fv-regression': (d, ctx) => {
    const lang = window.DM_LANG || 'id', id = lang === 'id';
    const x = (ctx && ctx.activeX) || 'X', y = (ctx && ctx.activeY) || 'Y';
    if (id) return `<b>Regression Plot — ${x} vs ${y}</b><br>Garis regresi linear (biru) menunjukkan hubungan fungsional antara <b>${x}</b> dan <b>${y}</b>, dengan kemiringan garis mencerminkan besarnya pengaruh variabel independen terhadap variabel dependen. Area transparan di sekitar garis adalah confidence band — semakin lebar area ini, semakin tinggi ketidakpastian estimasi prediksi pada rentang nilai tertentu. Evaluasi penyebaran titik di sekitar garis untuk menilai kelayakan model regresi: titik yang tersebar acak menandakan model cocok, sedangkan pola melengkung mengindikasikan perlunya transformasi atau model non-linear.`;
    return `<b>Regression Plot — ${x} vs ${y}</b><br>The linear regression line (blue) shows the functional relationship between <b>${x}</b> and <b>${y}</b>, with the slope reflecting the magnitude of the independent variable's effect on the dependent variable. The transparent band around the line is the confidence band — wider bands mean higher prediction uncertainty at given value ranges. Evaluate point scatter around the line to assess model fit: random scatter suggests a good fit, while curved patterns indicate the need for transformation or non-linear modelling.`;
  },
  'fv-bubble': (d, ctx) => {
    const lang = window.DM_LANG || 'id', id = lang === 'id';
    const x = (ctx && ctx.activeX) || 'X', y = (ctx && ctx.activeY) || 'Y';
    if (id) return `<b>Bubble Chart — ${x} vs ${y}</b><br>Bubble chart memperluas scatter plot dengan menambahkan dimensi ketiga melalui ukuran gelembung, memungkinkan analisis tiga variabel sekaligus: posisi horizontal (<b>${x}</b>), posisi vertikal (<b>${y}</b>), dan besaran yang direpresentasikan oleh diameter gelembung. Variasi ukuran dan posisi bubble secara simultan mengungkap pola multidimensi yang tidak terlihat dalam scatter plot biasa — seperti hubungan non-linear atau segmentasi alami dalam data. Visualisasi ini sangat efektif untuk analisis pangsa pasar, portofolio produk, atau perbandingan kinerja entitas secara multidimensi.`;
    return `<b>Bubble Chart — ${x} vs ${y}</b><br>The bubble chart extends the scatter plot by adding a third dimension through bubble size, enabling simultaneous analysis of three variables: horizontal position (<b>${x}</b>), vertical position (<b>${y}</b>), and magnitude represented by bubble diameter. Combined variation in size and position reveals multi-dimensional patterns invisible in standard scatter plots — such as non-linear relationships or natural data segmentation. This is particularly effective for market-share analysis, product portfolio assessment, or multi-dimensional entity performance comparison.`;
  },
  'fv-boxcat': (d, ctx) => {
    const lang = window.DM_LANG || 'id', id = lang === 'id';
    const y = (ctx && ctx.activeY) || 'Numerik', x = (ctx && ctx.activeX) || 'Kategori';
    if (id) return `<b>Boxplot per Kategori — ${y} by ${x}</b><br>Boxplot ini membandingkan distribusi <b>${y}</b> di setiap kelompok <b>${x}</b> secara berdampingan, dengan garis tengah setiap box menandai median masing-masing kelompok. Perbedaan posisi median yang signifikan antar kategori mengindikasikan perbedaan tendensi sentral yang bermakna secara statistik — prasyarat visual penting sebelum melakukan uji ANOVA atau Kruskal-Wallis. Perhatikan juga variasi lebar box antar kelompok: perbedaan IQR yang besar menandakan heteroskedastisitas yang perlu dipertimbangkan dalam pemilihan metode uji statistik.`;
    return `<b>Boxplot per Category — ${y} by ${x}</b><br>This boxplot compares the distribution of <b>${y}</b> across <b>${x}</b> groups side by side, with each box's centre line marking the group median. Significant median differences between categories indicate meaningful central-tendency shifts — an essential visual prerequisite before performing ANOVA or Kruskal-Wallis tests. Also note IQR variation between groups: large differences suggest heteroscedasticity that must be considered when selecting the appropriate statistical test method.`;
  },
  'fv-violincat': (d, ctx) => {
    const lang = window.DM_LANG || 'id', id = lang === 'id';
    const y = (ctx && ctx.activeY) || 'Numerik', x = (ctx && ctx.activeX) || 'Kategori';
    if (id) return `<b>Violin per Kategori — ${y} by ${x}</b><br>Violin plot memberikan gambaran distribusi <b>${y}</b> yang lebih lengkap di setiap segmen <b>${x}</b> — bukan hanya ringkasan 5 angka seperti boxplot, tetapi estimasi kepadatan penuh. Perbedaan bentuk violin antar kelompok mengungkap karakteristik distribusi unik: distribusi bimodal (dua puncak) hanya terdeteksi melalui violin, bukan boxplot. Informasi ini sangat berharga untuk memahami heterogenitas perilaku antar segmen pelanggan, wilayah, atau kelompok produk sebelum merumuskan strategi yang ditargetkan.`;
    return `<b>Violin per Category — ${y} by ${x}</b><br>The violin plot provides a richer picture of <b>${y}</b> distribution across <b>${x}</b> segments — not just the 5-number summary but a full density estimate. Shape differences between groups reveal unique distributional characteristics: bimodal distributions (two peaks) are only detectable via violin, not boxplot. This insight is invaluable for understanding behavioural heterogeneity across customer segments, regions, or product groups before formulating targeted strategies.`;
  },
  'fv-grouped': (d, ctx) => {
    const lang = window.DM_LANG || 'id', id = lang === 'id';
    const y = (ctx && ctx.activeY) || 'Numerik', x = (ctx && ctx.activeX) || 'Kategori';
    if (id) return `<b>Grouped Bar Chart — ${y} by ${x}</b><br>Chart ini membandingkan nilai agregat <b>${y}</b> antar kelompok <b>${x}</b> secara berdampingan, ideal untuk analisis komparatif multi-dimensi. Dua jenis perbandingan dapat dilakukan sekaligus: membandingkan performa antar kategori, dan membandingkan variabel berbeda dalam kategori yang sama. Perbedaan tinggi batang yang mencolok antar kelompok mengindikasikan adanya interaksi antara variabel yang patut diselidiki lebih mendalam menggunakan uji statistik lanjutan.`;
    return `<b>Grouped Bar Chart — ${y} by ${x}</b><br>This chart compares the aggregate value of <b>${y}</b> across <b>${x}</b> groups side by side, ideal for multi-dimensional comparative analysis. Two comparisons can be made simultaneously: comparing performance across categories, and comparing different variables within the same category. Striking height differences between groups indicate variable interactions worth deeper investigation using advanced statistical tests.`;
  },
  'fv-strip': (d, ctx) => {
    const lang = window.DM_LANG || 'id', id = lang === 'id';
    const y = (ctx && ctx.activeY) || 'Numerik', x = (ctx && ctx.activeX) || 'Kategori';
    if (id) return `<b>Strip Plot — ${y} by ${x}</b><br>Strip plot menampilkan setiap observasi individual <b>${y}</b> sebagai titik yang dikelompokkan berdasarkan <b>${x}</b> — tanpa agregasi yang menyembunyikan detail data asli. Konsentrasi titik yang padat di suatu nilai menunjukkan frekuensi tinggi, sementara titik yang terisolasi di luar area utama mengindikasikan potensi outlier atau segmen minoritas. Visualisasi ini sangat transparan dan ideal untuk dataset berukuran kecil hingga sedang di mana agregasi statistik bisa menyesatkan interpretasi.`;
    return `<b>Strip Plot — ${y} by ${x}</b><br>Strip plot displays every individual observation of <b>${y}</b> as a dot grouped by <b>${x}</b> — no aggregation hides the original data details. Dense dot clusters indicate high-frequency values, while isolated points outside the main area suggest potential outliers or minority segments. This visualisation is fully transparent and ideal for small-to-medium datasets where statistical aggregation could mislead interpretation.`;
  },
  'fv-ts-line': (d, ctx) => {
    const lang = window.DM_LANG || 'id', id = lang === 'id';
    const y = (ctx && ctx.activeY) || 'Nilai', x = (ctx && ctx.activeX) || 'Waktu';
    if (id) return `<b>Time Series — ${y} dari Waktu ke Waktu</b><br>Line chart menampilkan perubahan <b>${y}</b> terhadap <b>${x}</b>, mengungkap tren jangka panjang — apakah meningkat, menurun, atau stabil — serta pola musiman yang berulang secara periodik. Kemiringan setiap segmen garis mencerminkan laju perubahan pada periode tersebut; kemiringan tajam menandakan perubahan drastis yang perlu diinvestigasi sebagai dampak event eksternal atau kebijakan tertentu. Deteksi dini anomali temporal melalui deviasi dari pola historis memungkinkan respons proaktif sebelum dampak membesar.`;
    return `<b>Time Series — ${y} Over Time</b><br>The line chart shows <b>${y}</b> changes over <b>${x}</b>, revealing long-term trends — whether increasing, decreasing, or stable — along with recurring seasonal patterns. Each segment's slope reflects the rate of change for that period; steep slopes indicate drastic changes that should be investigated as external event impacts or policy effects. Early detection of temporal anomalies through deviation from historical patterns enables proactive responses before impacts escalate.`;
  },
  'fv-ts-ma': (d, ctx) => {
    const lang = window.DM_LANG || 'id', id = lang === 'id';
    const y = (ctx && ctx.activeY) || 'Nilai';
    if (id) return `<b>Moving Average — ${y}</b><br>Moving average (MA) menghaluskan fluktuasi jangka pendek pada data <b>${y}</b> sehingga tren fundamental yang mendasarinya menjadi lebih mudah diidentifikasi. Titik perpotongan antara garis nilai aktual dan garis MA sering digunakan sebagai sinyal awal perubahan arah tren — ini adalah indikator teknikal yang banyak digunakan dalam analisis pasar keuangan. Pemilihan window MA sangat krusial: window terlalu pendek masih mengandung noise, sementara window terlalu panjang akan terlambat merespons perubahan tren yang signifikan.`;
    return `<b>Moving Average — ${y}</b><br>The moving average (MA) smooths short-term fluctuations in <b>${y}</b> data, making the underlying fundamental trend easier to identify. Crossover points between the actual value line and the MA line are frequently used as early signals of trend direction changes — a widely used technical indicator in financial market analysis. MA window selection is critical: too short a window still contains noise, while too long a window responds too slowly to significant trend changes.`;
  },
  'fv-ts-roll': (d, ctx) => {
    const lang = window.DM_LANG || 'id', id = lang === 'id';
    const y = (ctx && ctx.activeY) || 'Nilai';
    if (id) return `<b>Rolling Mean 30 Periode — ${y}</b><br>Rata-rata bergulir 30 periode memberikan pandangan tren jangka menengah yang stabil untuk <b>${y}</b> dengan meminimalkan dampak fluktuasi harian atau mingguan. Deviasi signifikan antara nilai aktual dan rolling mean mengindikasikan adanya anomali, perubahan tren mendadak, atau efek musiman yang memerlukan investigasi lebih mendalam. Untuk analisis yang lebih komprehensif, kombinasikan rolling mean dengan rolling standard deviation untuk mendeteksi perubahan volatilitas — peningkatan volatilitas sering mendahului perubahan tren signifikan.`;
    return `<b>30-Period Rolling Mean — ${y}</b><br>The 30-period rolling mean provides a stable medium-term trend view for <b>${y}</b> by minimising the impact of daily or weekly fluctuations. Significant deviations between the actual value and the rolling mean indicate anomalies, sudden trend changes, or seasonal effects requiring deeper investigation. For more comprehensive analysis, combine the rolling mean with rolling standard deviation to detect volatility changes — increased volatility often precedes significant trend shifts.`;
  },
  'fv-ts-trend': (d, ctx) => {
    const lang = window.DM_LANG || 'id', id = lang === 'id';
    const y = (ctx && ctx.activeY) || 'Nilai';
    if (id) return `<b>Trend Line — ${y}</b><br>Garis tren (regresi linear) menunjukkan arah pergerakan <b>${y}</b> dalam jangka panjang — kemiringan positif menandakan pertumbuhan konsisten, negatif menandakan penurunan, dan mendekati nol mengindikasikan stagnasi. Perhatikan seberapa rapat titik-titik data aktual mengikuti garis tren: jika titik tersebar jauh dari garis, nilai R\u00b2 rendah dan tren tidak cukup kuat untuk dijadikan dasar prediksi yang andal. Residual antara data aktual dan garis tren mengandung komponen siklikal dan random yang analisisnya dapat mengungkap pola musiman tersembunyi atau faktor eksternal yang mempengaruhi data.`;
    return `<b>Trend Line — ${y}</b><br>The trend line (linear regression) shows the long-term direction of <b>${y}</b> — a positive slope indicates consistent growth, a negative slope indicates decline, and near-zero suggests stagnation. Note how closely actual data points follow the trend line: widely scattered points mean a low R\u00b2 and the trend is insufficiently strong for reliable prediction. Residuals between actual data and the trend line contain cyclical and random components whose analysis can reveal hidden seasonal patterns or external factors influencing the data.`;
  },
};

// Cache stats for insight generation
let _numStatsCache = null;
let _catStatsCache = null;

async function _ensureStatsCache() {
  if (!_numStatsCache) {
    try {
      const r = await fetch('/api/stats/numerical');
      _numStatsCache = await r.json();
    } catch(e) { _numStatsCache = []; }
  }
  if (!_catStatsCache) {
    try {
      const r = await fetch('/api/stats/categorical');
      _catStatsCache = await r.json();
    } catch(e) { _catStatsCache = []; }
  }
}

async function updateVizInsight(cid) {
  const panel = document.getElementById('vp-' + cid);
  if (!panel) return;
  const insightEl = panel.querySelector('.viz-insight-text');
  if (!insightEl) return;

  await _ensureStatsCache();

  const fn = _VIZ_INSIGHTS[cid];
  if (!fn) return;

  // Figure out which column this chart is using
  // Priority: axis selection > figure trace name > first col
  const axCols = _vizAxisCols[cid] || {};
  const activeX = axCols.x || '';
  const activeY = axCols.y || '';

  const key = _VIZ_KEY_MAP[cid];
  const fig = CHARTS[key];

  // For numerical charts: prefer chosen column, else trace name, else first
  let colData = null;
  if (_numStatsCache && _numStatsCache.length) {
    const preferredCol = activeX || activeY;
    if (preferredCol) {
      colData = _numStatsCache.find(s => s.column === preferredCol) || null;
    }
    if (!colData && fig && fig.data && fig.data[0]) {
      const traceName = fig.data[0].name || fig.data[0].x_name || '';
      colData = _numStatsCache.find(s => s.column === traceName) || null;
    }
    if (!colData) colData = _numStatsCache[0];
  }

  let catData = null;
  if (_catStatsCache && _catStatsCache.length) {
    const preferredCol = activeX || activeY;
    if (preferredCol) {
      catData = _catStatsCache.find(s => s.column === preferredCol) || null;
    }
    if (!catData && fig && fig.data && fig.data[0]) {
      const traceName = fig.data[0].name || '';
      catData = _catStatsCache.find(s => s.column === traceName) || null;
    }
    if (!catData) catData = _catStatsCache[0];
  }

  const catCharts = ['fv-bar','fv-pie','fv-count','fv-pareto'];
  const data = catCharts.includes(cid) ? catData : colData;
  const ctx = { activeX, activeY, colData, catData };

  insightEl.innerHTML = '⏳ Memuat insight...';
  // Small delay for smoothness
  await new Promise(r => setTimeout(r, 50));
  insightEl.innerHTML = fn(data, ctx);
}



/* ══════════════════════════════════════════════════════
   PATCH 3 — Invalidate stats cache on new upload
══════════════════════════════════════════════════════ */
const _origInit = init;
init = async function() {
  _numStatsCache = null;
  _catStatsCache = null;
  await _origInit();
};

/* ══════════════════════════════════════════════════════
   PATCH 4 — AI Chatbot Sidebar
══════════════════════════════════════════════════════ */
let _chatHistory = [];

function initAIChat() {
  const input = document.getElementById('aiChatInput');
  const btn   = document.getElementById('aiChatSend');
  if (!input || !btn) return;

  const send = async () => {
    const msg = input.value.trim();
    if (!msg) return;
    input.value = '';
    _appendChat('user', msg);
    var procMsg = (window.DM_LANG||'id')==='id' ? '⏳ Memproses...' : '⏳ Processing...';
    _appendChat('bot', procMsg);
    try {
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({message: msg})
      });
      const d = await r.json();
      _replaceLastBotMsg(d.reply || '—');
    } catch(e) {
      _replaceLastBotMsg((window.DM_LANG||'id')==='id'?'❌ Gagal menghubungi server.':'❌ Failed to connect to server.');
    }
  };

  btn.addEventListener('click', send);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  });

  // Welcome message (language-aware)
  var wlcm = (window.DM_LANG||'id')==='id' ? '👋 Halo! Saya AI DataMind. Tanya saya tentang dataset yang sedang kamu analisis!' : '👋 Hello! I am AI DataMind. Ask me about the dataset you are analyzing!';
  _appendChat('bot', wlcm);
}

function _appendChat(role, text) {
  const box = document.getElementById('aiChatMessages');
  if (!box) return;
  const div = document.createElement('div');
  div.className = 'ai-msg ai-msg-' + role;
  div.innerHTML = text;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
  _chatHistory.push({role, text});
}

function _replaceLastBotMsg(text) {
  const box = document.getElementById('aiChatMessages');
  if (!box) return;
  const msgs = box.querySelectorAll('.ai-msg-bot');
  const last = msgs[msgs.length - 1];
  if (last) last.innerHTML = text;
  box.scrollTop = box.scrollHeight;
}

function toggleAIChat() {
  const panel = document.getElementById('aiChatPanel');
  if (!panel) return;
  const isOpen = panel.style.display !== 'none';
  panel.style.display = isOpen ? 'none' : 'flex';
  if (!isOpen) document.getElementById('aiChatInput')?.focus();
}

document.addEventListener('DOMContentLoaded', function() {
  // AI chat is initialized lazily when the aichat tab is first opened
});

/* ══════════════════════════════════════════════════════
   NEW STYLE PANEL — Preset themes + nspMark helper
══════════════════════════════════════════════════════ */

// Preset definitions: [chartColor, axisColor, bgColor, gridColor]
const NSP_PRESETS = [
  { cc:'#6366F1', ac:'#475569', bc:'transparent', gc:'#E2E8F0', name:'Ocean Blue'  },
  { cc:'#7C3AED', ac:'#6B7280', bc:'#F5F3FF',     gc:'#EDE9FE', name:'Lavender'    },
  { cc:'#059669', ac:'#065F46', bc:'#F0FDF4',     gc:'#D1FAE5', name:'Emerald'     },
  { cc:'#D97706', ac:'#92400E', bc:'#FFFBEB',     gc:'#FDE68A', name:'Amber'       },
  { cc:'#DC2626', ac:'#991B1B', bc:'#FEF2F2',     gc:'#FECACA', name:'Rose'        },
  { cc:'#1E293B', ac:'#94A3B8', bc:'#0F172A',     gc:'#1E293B', name:'Midnight'    },
];

function applyPreset(cid, idx) {
  const p = NSP_PRESETS[idx];
  if (!p) return;

  // Update internal state
  _cSt[cid] = { cc: p.cc, ac: p.ac, bc: p.bc, gc: p.gc };

  // Update active button
  const panel = document.getElementById('sp-' + cid);
  if (panel) {
    panel.querySelectorAll('.nsp-preset').forEach((btn, i) => {
      btn.classList.toggle('nsp-preset-act', i === idx);
    });
  }

  // Apply to chart
  renderSingleViz(cid);
}

// Mark active swatch in a mini-swatch group
function nspMark(groupId, el) {
  const group = document.getElementById(groupId);
  if (!group) return;
  group.querySelectorAll('.nsp-sw').forEach(s => s.classList.remove('nsp-sw-act'));
  el.classList.add('nsp-sw-act');
  // Deactivate preset buttons since user is going custom
  const cid = groupId.replace(/^nsp-[cab]-/, '');
  const panel = document.getElementById('sp-' + cid);
  if (panel) panel.querySelectorAll('.nsp-preset').forEach(b => b.classList.remove('nsp-preset-act'));
}

// Also update populateAxisSelects to target nsp-axis-sel too
const _origPopulate = populateAxisSelects;
populateAxisSelects = function(cid) {
  _origPopulate(cid);
  // Also populate the new nsp selects (xl-/yl- IDs are shared)
  // They're already handled since they use the same IDs
};

// Close style panel when mouse leaves the viz-panel-body area
document.addEventListener('mouseleave', function(e) {
  if (e.target && e.target.classList && e.target.classList.contains('viz-panel-body')) {
    e.target.classList.remove('style-open');
    const btn = e.target.closest('.viz-panel')?.querySelector('.vc-style-btn');
    if (btn) btn.classList.remove('style-active');
  }
}, true);

/* ══════════════════════════════════════════════════════════════
   PATCH — Fix 3 masalah visualisasi
   1. Chart lebih besar (height 600px) + tidak terpotong saat style panel terbuka
   2. Axis X/Y hanya tampil kolom yang relevan, dan disembunyikan jika tidak relevan
   3. Pie chart max 5 kategori, tanpa X/Y selector
══════════════════════════════════════════════════════════════ */

/* ── 1. CHART HEIGHT & TIDAK TERPOTONG ─────────────────────── */
(function patchChartSize() {
  // Inject CSS: chart penuh, tidak kepotong saat style panel terbuka
  const style = document.createElement('style');
  style.textContent = `
    .viz-panel { max-width: 100% !important; }
    .viz-panel-chart {
      width: 100% !important;
      min-width: 0 !important;
      padding: 16px 12px !important;
      box-sizing: border-box !important;
      overflow: hidden !important;
    }
    .viz-panel-chart .plotly-chart-lg {
      width: 100% !important;
      height: 560px !important;
      min-height: 560px !important;
      max-width: 100% !important;
    }
    .viz-panel-main {
      flex: 1 1 0% !important;
      min-width: 0 !important;
      overflow: hidden !important;
    }
    .viz-panel-body.style-open .vc-style-panel.new-style-panel {
      flex: 0 0 260px !important;
      width: 260px !important;
    }
  `;
  document.head.appendChild(style);

  // Resize Plotly setiap kali window resize (termasuk saat style panel buka/tutup)
  window.addEventListener('resize', () => {
    document.querySelectorAll('[id^="fv-"], [id^="vc-"]').forEach(el => {
      if (el._plotlyInitialized) {
        try { Plotly.Plots.resize(el); } catch(e) {}
      }
    });
  });
})();

/* ── 2 & 3. AXIS SELECTOR — FILTER KOLOM SESUAI TIPE CHART ── */
function _getFilteredCols(cid) {
  let allCols = SEARCH_COLS.slice();
  if (!allCols.length) {
    document.querySelectorAll('#fullPreviewTable th').forEach(th => {
      const t = th.textContent.trim();
      if (t && !allCols.includes(t)) allCols.push(t);
    });
  }
  if (_chartNeedsNumX(cid)) {
    const numCols = allCols.filter(c => _isNumCol(c));
    return numCols.length > 0 ? numCols : allCols;
  }
  if (_chartNeedsCatX(cid)) {
    const catCols = allCols.filter(c => _isCatCol(c));
    return catCols.length > 0 ? catCols : allCols;
  }
  return allCols;
}



/* ── CONSOLIDATED vizNavSwitch, setYLabel, loadCharts ────────── */
const _TS_CIDS = ['fv-ts-line', 'fv-ts-ma', 'fv-ts-roll', 'fv-ts-trend'];

const _origVizNavSwitch = vizNavSwitch;
vizNavSwitch = function(tabId, cid) {
  _origVizNavSwitch(tabId, cid);

  const isPie = cid === 'fv-pie';
  const isTS  = _TS_CIDS.includes(cid);

  setTimeout(function() {
    if (isPie) {
      const xSel = document.getElementById('xl-fv-pie');
      const ySel = document.getElementById('yl-fv-pie');
      const xRow = xSel ? xSel.closest('.nsp-axis-row') : null;
      const yRow = ySel ? ySel.closest('.nsp-axis-row') : null;
      if (xRow) xRow.style.display = 'none';
      if (yRow) {
        const lbl = yRow.querySelector('label, .nsp-ctrl-lbl');
        if (lbl) lbl.textContent = 'Variabel';
      }
      if (ySel && SEARCH_COLS.length) {
        const catCols = SEARCH_COLS.filter(function(c) {
          const scale = window._colMetaForPie && window._colMetaForPie[c];
          return !scale || ['nominal','ordinal','boolean'].includes(scale);
        });
        const cols = catCols.length ? catCols : SEARCH_COLS;
        const cur = ySel.value;
        ySel.innerHTML = '<option value="">— Pilih Variabel —</option>' +
          cols.map(function(c) { return '<option value="' + c + '">' + c + '</option>'; }).join('');
        if (cur && cols.includes(cur)) ySel.value = cur;
      }
    }

    if (isTS) {
      const xSel = document.getElementById('xl-' + cid);
      const ySel = document.getElementById('yl-' + cid);
      const xRow = xSel ? xSel.closest('.nsp-axis-row') : null;
      const yRow = ySel ? ySel.closest('.nsp-axis-row') : null;
      if (xRow) xRow.style.display = 'none';
      if (yRow) {
        const lbl = yRow.querySelector('label, .nsp-ctrl-lbl');
        if (lbl) lbl.textContent = 'Variabel Y';
      }
      if (ySel && SEARCH_COLS.length) {
        var numCols = SEARCH_COLS.filter(function(c) {
          var scale = window._colMetaForPie && window._colMetaForPie[c];
          return scale ? ['ratio','interval'].includes(scale) : true;
        });
        var cur = ySel.value;
        ySel.innerHTML = '<option value="">— Pilih Kolom Y —</option>' +
          numCols.map(function(c) { return '<option value="' + c + '">' + c + '</option>'; }).join('');
        if (cur && numCols.includes(cur)) ySel.value = cur;
      }
    }

    updateVizInsight(cid);
  }, 100);
};

const _origSetYLabel = setYLabel;
setYLabel = function(cid, val) {
  if (cid === 'fv-pie') {
    if (!_vizAxisCols[cid]) _vizAxisCols[cid] = {};
    _vizAxisCols[cid].x = val;
    _vizAxisCols[cid].y = '';
    if (val) _regenChart(cid);
  } else if (_TS_CIDS.includes(cid)) {
    if (!_vizAxisCols[cid]) _vizAxisCols[cid] = {};
    _vizAxisCols[cid].y = val;
    _vizAxisCols[cid].x = '';
    if (val) _regenChart(cid);
  } else {
    _origSetYLabel(cid, val);
  }
};

const _origLoadCharts = loadCharts;
loadCharts = async function() {
  await _origLoadCharts();
  setTimeout(function() {
    renderDashViz();
    [200, 600, 1200].forEach(function(ms) {
      setTimeout(function() { window.dispatchEvent(new Event('resize')); }, ms);
    });
  }, 150);
};

/* ═══════════════════════════════════════════════════════════════
   DATAMIND V3 — PRESENTATION MODE TOGGLE
   ═══════════════════════════════════════════════════════════════ */
/* ── Language state ─────────────────────────────────── */
window.DM_LANG = localStorage.getItem('datamind_lang') || 'id';

(function initLangToggle() {

  function injectLangButton() {
    // Don't inject if button already exists in HTML
    if (document.getElementById('langToggleBtn')) return;
    
    const tbRight = document.querySelector('.tb-right, .topbar-right, #topbarRight, .topbar .ms-auto, .topbar .d-flex');
    if (!tbRight) return;

    const btn = document.createElement('button');
    btn.id = 'langToggleBtn';
    btn.title = 'Toggle Language / Ganti Bahasa';
    btn.innerHTML = window.DM_LANG === 'id' ? '🇮🇩 ID' : '🇬🇧 EN';

    btn.addEventListener('click', function () {
      window.DM_LANG = window.DM_LANG === 'id' ? 'en' : 'id';
      localStorage.setItem('datamind_lang', window.DM_LANG);
      btn.innerHTML = window.DM_LANG === 'id' ? '🇮🇩 ID' : '🇬🇧 EN';
      // Use centralized applyLanguage if available
      if (typeof window.applyLanguage === 'function') {
        window.applyLanguage();
      } else {
        document.querySelectorAll('.viz-panel[id^="vp-"]').forEach(function(panel) {
          if (panel.offsetParent !== null) {
            const cid = panel.id.replace('vp-', '');
            updateVizInsight(cid);
          }
        });
      }
    });

    // Insert sebelum elemen pertama di tb-right, atau append
    tbRight.insertBefore(btn, tbRight.firstChild);
  }

  // Inject saat DOM siap
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      injectLangButton();
    });
  } else {
    injectLangButton();
  }

  // Fallback: retry sampai topbar muncul (untuk SPA)
  let retries = 0;
  const interval = setInterval(function () {
    if (document.getElementById('langToggleBtn')) { clearInterval(interval); return; }
    injectLangButton();
    if (++retries > 20) clearInterval(interval);
  }, 500);

})();
/* ═══════════════════════════════════════════════════════════════
   END PRESENTATION MODE
   ═══════════════════════════════════════════════════════════════ */




/* ── FIX 2: Missing values klik → tampilkan detail ─────────── */
(function fixMissingClick() {
  // Buat bar missing values bisa diklik → pindah ke tab categorical
  const _origBuildMissingBars = buildMissingBars;
  buildMissingBars = function(data) {
    const el = document.getElementById('missingBars');
    if (!el || !data.length) return;
    el.innerHTML = `<div class="mb-title">Missing Values by Column — Klik untuk detail</div>` +
      data.map(d => {
        const pct = d.missing_pct || 0;
        const color = pct > 20 ? '#C62828' : pct > 5 ? '#E65100' : '#2E7D32';
        const hasMissing = pct > 0;
        const cursor = hasMissing ? 'pointer' : 'default';
        const hover = hasMissing ? 'opacity:.85;transform:translateX(2px)' : '';
        return `<div class="mb-row" style="cursor:${cursor};transition:all .15s"
          onmouseenter="if(${hasMissing})this.style.cssText='cursor:pointer;transition:all .15s;${hover}'"
          onmouseleave="this.style.cssText='cursor:${cursor};transition:all .15s'"
          onclick="${hasMissing ? `switchTab('missing',document.querySelector('[data-tab=missing]'));setTimeout(()=>{const rows=document.querySelectorAll('#dqFullTable tbody tr');rows.forEach(r=>{if(r.cells[0]&&r.cells[0].textContent.trim()==='${d.column}'){r.style.background='rgba(201,167,74,0.25)';r.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>r.style.background='',2500);}});},400)` : ''}">
          <div class="mb-lbl">${d.column}</div>
          <div class="mb-bar-bg"><div class="mb-bar" style="width:${Math.min(pct*4,100)}%;background:${color}"></div></div>
          <div class="mb-val" style="color:${color};font-weight:${hasMissing?700:400}">${pct}%${hasMissing?' ↗':''}</div>
        </div>`;
      }).join('');
  };

  // Juga buat card "Missing Cells" di overview bisa diklik
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
      const missCard = document.querySelector('.sc-miss');
      if (missCard) {
        missCard.style.cursor = 'pointer';
        missCard.title = 'Klik untuk lihat detail missing values';
        missCard.addEventListener('click', function() {
          switchTab('missing', document.querySelector('[data-tab=missing]'));
        });
      }
    }, 1000);
  });
})();









/* ═══════════════════════════════════════════════════════════════
   FITUR: CHECKLIST VISUALISASI + PREVIEW LAPORAN (tab Download)
   ═══════════════════════════════════════════════════════════════ */

/* Inject CSS checklist */
(function() {
  const s = document.createElement('style');
  s.textContent = `
    .dl-chk-row {
      display:flex;align-items:center;gap:10px;
      padding:8px 0;font-size:14px;color:var(--text1);
      cursor:pointer;border-radius:8px;
      transition:background .12s;
    }
    .dl-chk-row:hover { background:var(--bg,#f9fafb); }
    .dl-chk-row input[type=checkbox] {
      width:18px;height:18px;cursor:pointer;accent-color:#6366F1;
    }
    @media print {
      body > *:not(#dlPrintFrame) { display:none !important; }
      #dlPrintFrame { display:block !important; }
    }
  `;
  document.head.appendChild(s);
})();

function dlUpdateCount() {
  const checked = document.querySelectorAll('.dl-chk:checked').length;
  const el = document.getElementById('dlSelectedCount');
  var _id=(window.DM_LANG||'id')==='id';
  if (el) el.innerHTML = checked + ' ' + (window.__?window.__('download.selected'):(_id?'dipilih':'selected'));
}

function dlSelectAll(val) {
  document.querySelectorAll('.dl-chk').forEach(c => c.checked = val);
  dlUpdateCount();
}

/* Ambil chart yang dicentang */
function dlGetSelected() {
  const selected = [];
  document.querySelectorAll('.dl-chk:checked').forEach(c => selected.push(c.value));
  return selected;
}

/* Ambil halaman yang dicentang */
function dlGetSelectedPages() {
  const pages = [];
  document.querySelectorAll('.dl-page-chk:checked').forEach(c => pages.push(c.value));
  return pages;
}

/* Label nama chart */
const DL_CHART_LABELS = {
  histogram:   'Histogram',
  boxplot:     'Boxplot',
  density:     'Density Plot',
  qq_plot:     'QQ Plot',
  violin:      'Violin Plot',
  bar_chart:   'Bar Chart',
  pie_chart:   'Pie Chart',
  count_plot:  'Count Plot',
  pareto_chart:'Pareto Chart',
  scatter:     'Scatter Plot',
  corr_heatmap:'Correlation Heatmap',
  regression:  'Regression Plot',
  bubble:      'Bubble Chart',
  boxplot_cat: 'Boxplot per Kategori',
  violin_cat:  'Violin per Kategori',
  grouped_bar: 'Grouped Bar',
  strip_plot:  'Strip Plot',
  ts_line:     'Time Series Line',
  ts_ma:       'Moving Average',
  ts_rolling:  'Rolling Mean',
  ts_trend:    'Trend Line',
};

/* Label nama halaman */
const DL_PAGE_LABELS = {
  cover: 'Cover',
  tim:   'Tim Pengembang',
  bab1:  'BAB I — Pendahuluan & Gambaran Dataset',
  bab2:  'BAB II — Statistik Deskriptif Numerik',
  bab3:  'BAB III — Statistik Kategorikal & Kualitas Data',
  bab4:  'BAB IV — Temuan Utama & Rekomendasi Strategis',
};

// ── Accordion helpers ──────────────────────────────────────────
function dlToggleAccordion(headEl) {
  const body  = headEl.nextElementSibling;
  const arrow = headEl.querySelector('.dl-acc-arrow');
  const open  = body.style.display !== 'none';
  body.style.display  = open ? 'none' : 'block';
  if (arrow) arrow.style.transform = open ? '' : 'rotate(180deg)';
}

function dlSelectGroup(btnEl, select) {
  const acc   = btnEl.closest('.dl-accordion');
  const boxes = acc.querySelectorAll('input.dl-chk');
  boxes.forEach(b => b.checked = select);
  dlUpdateCount();
}

// ── Update badge count (total + per-accordion) ─────────────────
const _origDlUpdateCount = typeof dlUpdateCount === 'function' ? dlUpdateCount : null;

function dlUpdateCount() {
  const total = document.querySelectorAll('.dl-chk:checked').length;
  const el    = document.getElementById('dlSelectedCount');
  var _id=(window.DM_LANG||'id')==='id';
  if (el) el.innerHTML = total + ' ' + (window.__?window.__('download.selected'):(_id?'dipilih':'selected'));

  // Update badge per accordion
  document.querySelectorAll('.dl-accordion').forEach(acc => {
    const checked = acc.querySelectorAll('input.dl-chk:checked').length;
    const badge   = acc.querySelector('.dl-acc-badge');
    if (badge) badge.textContent = checked + ' ' + (_id?'dipilih':'selected');
  });
}

function dlToggleAllSections(expand) {
  document.querySelectorAll('.dl-section').forEach(function(wrap) {
    const body = wrap.querySelector('.dl-section-body');
    const arrow = wrap.querySelector('.dl-section-arrow');
    if (body) {
      body.style.display = expand ? '' : 'none';
      if (arrow) arrow.textContent = expand ? '▾' : '▸';
    }
  });
}

async function dlPreviewLaporan() {
  const selectedPages  = dlGetSelectedPages();
  const selectedCharts = dlGetSelected();

  if (!selectedPages.length && !selectedCharts.length) {
    showToast('Pilih minimal 1 halaman atau 1 chart dulu ya!', 'w');
    return;
  }
  if (selectedCharts.length && !chartsLoaded) {
    await loadCharts();
  }

  // Inject A4 style sekali
  if (!document.getElementById('dlA4Style')) {
    const st = document.createElement('style');
    st.id = 'dlA4Style';
    st.textContent = `
      #dlPreviewPagesContainer { padding: 28px 0; display:flex; flex-direction:column; gap:28px; align-items:center; min-width: 880px; }
      .dl-a4 {
        width: 860px; min-height: 1200px;
        background: #fff; color: #1B2A4A;
        padding: 80px 96px 72px;
        box-shadow: 0 8px 48px rgba(0,0,0,0.30);
        border-radius: 3px;
        font-family: 'Times New Roman', Times, serif;
        font-size: 11.5pt; line-height: 1.78;
        box-sizing: border-box; position: relative;
        flex-shrink: 0;
      }
      .dl-a4 p { margin: 0 0 12px; text-align: justify; }
      .dl-a4 .a4-cover-title { font-size:19pt; font-weight:800; color:#6366F1; text-align:center; margin:0 0 6px; letter-spacing:.01em; }
      .dl-a4 .a4-cover-sub  { font-size:12pt; color:#64748B; text-align:center; margin:0 0 28px; }
      .dl-a4 .a4-bab-label  { font-size:10.5pt; font-weight:700; color:#6366F1; text-transform:uppercase; letter-spacing:.08em; margin:0 0 3px; }
      .dl-a4 .a4-bab-title  { font-size:13pt; font-weight:700; color:#1B2A4A; text-transform:uppercase; margin:0 0 8px; }
      .dl-a4 .a4-sub        { font-size:11.5pt; font-weight:700; color:#1B2A4A; margin:18px 0 7px; }
      .dl-a4 hr.a4-hr       { border:none; border-top:2.5px solid #6366F1; margin:0 0 18px; }
      .dl-a4 hr.a4-thin     { border:none; border-top:1px solid #CBD5E1; margin:12px 0; }
      .dl-a4 .a4-page-num   { position:absolute; bottom:28px; right:48px; font-size:9pt; color:#94A3B8; }
      .dl-a4 .a4-footer     { border-top:1px solid #CBD5E1; margin-top:28px; padding-top:10px; text-align:center; font-size:9pt; color:#94A3B8; }
      .a4t { width:100%; border-collapse:collapse; font-size:9pt; margin:10px 0 4px; word-break:break-word; }
      .a4t th { padding:7px 9px; text-align:left; font-weight:700; color:#fff; }
      .a4t td { padding:6px 9px; border-bottom:1px solid #e2e8f0; }
      .a4t.navy th { background:#1B2A4A; } .a4t.navy tr:nth-child(even) td { background:#F8FAFC; }
      .a4t.blue th { background:#6366F1; } .a4t.blue tr:nth-child(even) td { background:#EEF2FF; }
      .a4t.green th { background:#059669; } .a4t.green tr:nth-child(even) td { background:#ECFDF5; }
      .a4t.amber th { background:#D97706; } .a4t.amber tr:nth-child(even) td { background:#FFFBEB; }
      .a4t-cap { font-size:8.5pt; color:#64748B; text-align:center; margin:3px 0 14px; font-style:italic; }
      .a4-stat-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin:14px 0; }
      .a4-stat-card { background:#F8FAFC; border:1px solid #EEF2FF; border-radius:8px; padding:13px; text-align:center; }
      .a4-stat-val  { font-size:18pt; font-weight:800; color:#6366F1; }
      .a4-stat-lbl  { font-size:8pt; color:#64748B; text-transform:uppercase; letter-spacing:.04em; margin-top:3px; }
      .a4-findings  { background:#EEF2FF; border-left:4px solid #6366F1; border-radius:0 8px 8px 0; padding:16px 22px; margin:10px 0 16px; }
      .a4-findings ul { padding-left:18px; } .a4-findings li { margin-bottom:8px; }
      .a4-rec { background:#F8FAFC; border:1px solid #e2e8f0; border-radius:8px; padding:13px 16px; margin-bottom:10px; }
      .a4-rec-t { font-weight:700; color:#6366F1; margin-bottom:5px; }
      .a4-toc { width:100%; border-collapse:collapse; }
      .a4-toc tr.toc-b td { font-weight:700; color:#1B2A4A; padding:7px 0 3px; border-bottom:1.5px solid #6366F1; }
      .a4-toc tr.toc-s td { color:#64748B; padding:3px 0 3px 20px; border-bottom:1px solid #f1f5f9; font-size:10.5pt; }
      .a4-toc .toc-p { text-align:right; font-weight:700; color:#6366F1; }
      .a4-bdg { display:inline-block; padding:1px 6px; border-radius:3px; font-size:7.5pt; font-weight:700; }
      .a4-bdg.ratio,.a4-bdg.interval { background:rgba(99,102,241,.15); color:#6366F1; }
      .a4-bdg.nominal,.a4-bdg.ordinal { background:rgba(5,150,105,.15); color:#059669; }
    `;
    document.head.appendChild(st);
  }

  const container   = document.getElementById('dlPreviewPagesContainer');
  const placeholder = document.getElementById('dlPreviewPlaceholder');
  const scroller    = document.getElementById('dlPreviewScroller');
  if (!container) return;
  if (placeholder) placeholder.style.display = 'none';
  container.innerHTML = '';
  container.style.display = 'flex';
  if (scroller) scroller.scrollTop = 0;

  let ov = {};
  try { ov = await fetch('/api/overview').then(r=>r.json()); } catch(e){}

  const nowStr = new Date().toLocaleDateString('id-ID',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  const TEAM = [
    {no:'1', name:'Den Yuan Frasseka',       nim:'52250050', role:'Project Lead & Koordinator Analisis Data'},
    {no:'2', name:'Boma Satrio Wicaksono D.',nim:'52250061', role:'Backend Development & Data Pipeline'},
    {no:'3', name:'Frizzy Litmensyah',       nim:'52250062', role:'EDA & Pembuatan Visualisasi Grafik'},
    {no:'4', name:'Angelica Florentina M',   nim:'52250063', role:'UI/UX Design Dashboard & Frontend'},
    {no:'5', name:'Adam Richie Wijaya',      nim:'52250064', role:'Statistical Analysis & Insight Generator'},
    {no:'6', name:'Andre',                   nim:'52250065', role:'Data Cleaning, Preprocessing & Validasi'},
  ];

  function mkPage(pgNum) {
    const d = document.createElement('div');
    d.className = 'dl-a4';
    d.innerHTML = `<div class="a4-page-num">${pgNum}</div>`;
    container.appendChild(d);
    return d;
  }
  function fmtN(v) {
    if (v===null||v===undefined||v===''||v==='-') return '—';
    const n=parseFloat(v); if(isNaN(n)) return String(v).slice(0,12);
    if(Math.abs(n)>=1e9) return (n/1e9).toFixed(2)+'B';
    if(Math.abs(n)>=1e6) return (n/1e6).toFixed(2)+'M';
    if(Math.abs(n)>=1e4) return Math.round(n).toLocaleString('id');
    return parseFloat(n.toFixed(4)).toString();
  }

  let pageNum = 1;

  // ══════════════ COVER ══════════════
  if (selectedPages.includes('cover')) {
    const pg = mkPage(pageNum++);
    pg.innerHTML += `
      <div style="text-align:center;padding-top:20px">
        <hr style="border:none;border-top:4px solid #6366F1;margin-bottom:28px"/>
        <div class="a4-cover-title">LAPORAN ANALISIS DATA EKSPLORASI</div>
        <div class="a4-cover-sub">Exploratory Data Analysis (EDA)</div>
        <hr style="border:none;border-top:1px solid #CBD5E1;width:55%;margin:0 auto 28px"/>
        <table class="a4t navy" style="max-width:480px;margin:0 auto 36px">
          <tr><th>Keterangan</th><th>Detail</th></tr>
          <tr><td>Total Observasi</td><td><b>${(ov.rows||'-').toLocaleString?.()??ov.rows} baris</b></td></tr>
          <tr><td>Total Variabel</td><td><b>${ov.cols||'-'} kolom</b></td></tr>
          <tr><td>Var. Numerik</td><td>${ov.num_cols||'-'} kolom</td></tr>
          <tr><td>Var. Kategorikal</td><td>${ov.cat_cols||'-'} kolom</td></tr>
          <tr><td>Missing Values</td><td>${ov.missing_pct||'0'}%</td></tr>
          <tr><td>Kualitas Data</td><td><b>${ov.health||'-'}</b></td></tr>
          <tr><td>Tanggal Laporan</td><td>${nowStr}</td></tr>
        </table>
        <hr style="border:none;border-top:4px solid #6366F1;margin-bottom:16px"/>
        <div style="font-size:12pt;font-weight:700;color:#1B2A4A">Dibuat dengan DataMind — Intelligent EDA Platform</div>
        <div style="font-size:11pt;color:#1B2A4A;margin-top:4px">Institut Teknologi Sains Bandung — Program Studi Sains Data</div>
        <div style="font-size:11pt;color:#64748B;margin-top:4px">Kelompok 4 · Kelas B &nbsp;|&nbsp; Dosen: Bakti Siregar, M.Sc., CDS</div>
        <div style="font-size:10pt;color:#94A3B8;margin-top:16px">© 2026 DataMind. Seluruh hak dilindungi.</div>
      </div>`;
  }

  // ══════════════ TIM PENGEMBANG ══════════════
  if (selectedPages.includes('tim')) {
    const pg = mkPage(pageNum++);
    pg.innerHTML += `
      <div class="a4-bab-label">Halaman 1 — Tim Pengembang</div>
      <div class="a4-bab-title">Tim Pengembang</div>
      <hr class="a4-hr"/>
      <p style="margin-bottom:16px">DataMind dikembangkan oleh mahasiswa Program Studi Sains Data,
      Institut Teknologi Sains Bandung sebagai proyek akhir mata kuliah Data Science Programming tahun 2026.</p>
      <table class="a4t navy" style="margin-bottom:6px">
        <tr><th>Keterangan</th><th>Detail</th></tr>
        <tr><td>Institusi</td><td>Institut Teknologi Sains Bandung</td></tr>
        <tr><td>Program Studi</td><td>Program Studi Sains Data</td></tr>
        <tr><td>Mata Kuliah</td><td>Data Science Programming</td></tr>
        <tr><td>Kelompok</td><td>Kelompok 4 · Kelas B</td></tr>
        <tr><td>Dosen Pembimbing</td><td>Bakti Siregar, M.Sc., CDS</td></tr>
        <tr><td>Tahun Akademik</td><td>2026</td></tr>
      </table>
      <div class="a4t-cap">Tabel Tim.1 Informasi institusi dan mata kuliah</div>
      <div class="a4-sub">Anggota Tim</div>
      <table class="a4t blue">
        <tr><th style="width:36px">No.</th><th>Nama Lengkap</th><th>NIM</th><th>Kontribusi Utama</th></tr>
        ${TEAM.map(m=>`<tr><td style="text-align:center">${m.no}</td><td><b>${m.name}</b></td><td>${m.nim}</td><td>${m.role}</td></tr>`).join('')}
      </table>
      <div class="a4t-cap">Tabel Tim.2 Anggota tim dan kontribusi masing-masing</div>
      <div class="a4-sub">Tentang DataMind</div>
      <p>DataMind adalah platform EDA berbasis web yang mendukung upload dataset, analisis statistik otomatis,
      20+ jenis visualisasi interaktif, deteksi dan penanganan data quality (missing, duplikat, outlier),
      time series analytics, AI-powered insight generation, serta ekspor ke PDF, Excel, dan HTML.</p>
    `;
  }

  // ══════════════ DAFTAR ISI ══════════════
  if (selectedPages.includes('daftar_isi') || selectedPages.includes('cover')) {
    const pg = mkPage(pageNum++);
    pg.innerHTML += `
      <div style="font-size:15pt;font-weight:800;color:#6366F1;text-align:center;margin-bottom:14px">DAFTAR ISI</div>
      <hr class="a4-hr"/>
      <table class="a4-toc">
        <tr class="toc-b"><td>Cover</td><td class="toc-p">Cover</td></tr>
        <tr class="toc-b"><td>Tim Pengembang</td><td class="toc-p">1</td></tr>
        <tr class="toc-b"><td>Daftar Isi</td><td class="toc-p">2</td></tr>
        <tr class="toc-b"><td>BAB I — Pendahuluan dan Gambaran Umum Dataset</td><td class="toc-p">3</td></tr>
        <tr class="toc-s"><td>1.1 Latar Belakang</td><td class="toc-p">3</td></tr>
        <tr class="toc-s"><td>1.2 Tujuan Analisis</td><td class="toc-p">3</td></tr>
        <tr class="toc-s"><td>1.3 Ringkasan Dataset</td><td class="toc-p">3</td></tr>
        <tr class="toc-s"><td>1.4 Pratinjau Data (5 Baris Pertama)</td><td class="toc-p">3</td></tr>
        <tr class="toc-b"><td>BAB II — Statistik Deskriptif Variabel Numerik</td><td class="toc-p">4</td></tr>
        <tr class="toc-s"><td>2.1 Ringkasan Statistik Numerik</td><td class="toc-p">4</td></tr>
        <tr class="toc-s"><td>2.2 Analisis Distribusi dan Normalitas</td><td class="toc-p">4</td></tr>
        <tr class="toc-s"><td>2.3 Analisis Outlier</td><td class="toc-p">4</td></tr>
        <tr class="toc-b"><td>BAB III — Variabel Kategorikal &amp; Kualitas Data</td><td class="toc-p">5</td></tr>
        <tr class="toc-s"><td>3.1 Analisis Variabel Kategorikal</td><td class="toc-p">5</td></tr>
        <tr class="toc-s"><td>3.2 Pola Dominasi Kategori</td><td class="toc-p">5</td></tr>
        <tr class="toc-s"><td>3.3 Analisis Kualitas Data Komprehensif</td><td class="toc-p">5</td></tr>
        <tr class="toc-b"><td>BAB IV — Temuan Utama &amp; Rekomendasi Strategis</td><td class="toc-p">6</td></tr>
        <tr class="toc-s"><td>4.1 Ringkasan Temuan Utama</td><td class="toc-p">6</td></tr>
        <tr class="toc-s"><td>4.2 Rekomendasi Analisis Lanjutan (5 poin)</td><td class="toc-p">6</td></tr>
        <tr class="toc-b"><td>Lampiran — Visualisasi Data Pilihan</td><td class="toc-p">Lamp.</td></tr>
      </table>
      <p style="margin-top:20px">Laporan ini terdiri dari <b>8 halaman utama</b> (termasuk Tim Pengembang di Halaman 1) ditambah lampiran visualisasi.
      Dibuat secara otomatis oleh <b>DataMind Intelligent EDA Platform</b> pada ${nowStr}.</p>`;
  }

  // ══════════════ BAB I ══════════════
  if (selectedPages.includes('bab1')) {
    const pg = mkPage(pageNum++);
    let prevHtml = '';
    try {
      const pvRes = await fetch('/api/preview?limit=5');
      const pvData = await pvRes.json();
      if (pvData.columns && pvData.data) {
        const maxC = Math.min(7, pvData.columns.length);
        const cols = pvData.columns.slice(0, maxC);
        prevHtml = `<div style="overflow-x:auto"><table class="a4t blue" style="font-size:8pt">
          <tr>${cols.map(c=>`<th>${c}</th>`).join('')}</tr>
          ${pvData.data.map(r=>`<tr>${cols.map(c=>`<td>${r[c]!==null&&r[c]!==undefined?r[c]:'—'}</td>`).join('')}</tr>`).join('')}
        </table></div>
        <div class="a4t-cap">Tabel 1.2 Pratinjau lima baris pertama dataset${pvData.columns.length>7?' ('+pvData.columns.length+' kolom total, tampil 7 pertama)':''}</div>`;
      }
    } catch(e){}

    let colInfoHtml = '';
    try {
      const ciRes = await fetch('/api/column_info');
      const ciData = await ciRes.json();
      if (ciData && ciData.length) {
        colInfoHtml = `<table class="a4t navy" style="font-size:8.5pt">
          <tr><th>Nama Kolom</th><th>Tipe</th><th>Skala</th><th>Nilai Unik</th><th>Missing</th><th>Missing%</th></tr>
          ${ciData.map(c=>`<tr>
            <td><b>${c.name}</b></td>
            <td><span style="font-size:7.5pt;color:#64748B">${c.dtype}</span></td>
            <td><span class="a4-bdg ${c.scale}">${(c.scale||'').toUpperCase()}</span></td>
            <td style="text-align:center">${c.unique}</td>
            <td style="text-align:center">${c.missing}</td>
            <td style="text-align:center">${c.missing_pct}%</td>
          </tr>`).join('')}
        </table>
        <div class="a4t-cap">Tabel 1.3 Informasi lengkap setiap kolom dataset</div>`;
      }
    } catch(e){}

    pg.innerHTML += `
      <div class="a4-bab-label">BAB I</div>
      <div class="a4-bab-title">Pendahuluan dan Gambaran Umum Dataset</div>
      <hr class="a4-hr"/>
      <div class="a4-sub">1.1 Latar Belakang</div>
      <p>Laporan ini disusun sebagai hasil analisis eksplorasi data (<i>Exploratory Data Analysis</i>/EDA)
      menggunakan platform DataMind — Intelligent EDA Platform yang dikembangkan oleh Kelompok 4,
      Program Studi Sains Data, Institut Teknologi Sains Bandung.
      Analisis dilakukan terhadap dataset yang memiliki <b>${(ov.rows||'-').toLocaleString?.()??ov.rows} observasi</b> dan
      <b>${ov.cols||'-'} variabel</b>. EDA merupakan tahapan krusial dalam siklus ilmu data yang bertujuan
      memahami struktur, distribusi, kualitas, dan pola tersembunyi di dalam data sebelum dilakukan
      pemodelan statistik maupun machine learning.</p>
      <div class="a4-sub">1.2 Tujuan Analisis</div>
      <p>Tujuan utama: (1) mengidentifikasi karakteristik statistik deskriptif setiap variabel;
      (2) mendeteksi missing values, duplikat, dan outlier; (3) menganalisis distribusi dan normalitas;
      (4) memahami pola variabel kategorikal; (5) memberikan rekomendasi strategis untuk analisis lanjutan.</p>
      <div class="a4-sub">1.3 Ringkasan Dataset</div>
      <div class="a4-stat-grid">
        <div class="a4-stat-card"><div class="a4-stat-val">${(ov.rows||'-').toLocaleString?.()??ov.rows}</div><div class="a4-stat-lbl">Total Baris</div></div>
        <div class="a4-stat-card"><div class="a4-stat-val">${ov.cols||'-'}</div><div class="a4-stat-lbl">Total Kolom</div></div>
        <div class="a4-stat-card"><div class="a4-stat-val">${ov.missing_pct||'0'}%</div><div class="a4-stat-lbl">Missing Values</div></div>
        <div class="a4-stat-card"><div class="a4-stat-val">${ov.num_cols||'-'}</div><div class="a4-stat-lbl">Var. Numerik</div></div>
        <div class="a4-stat-card"><div class="a4-stat-val">${ov.cat_cols||'-'}</div><div class="a4-stat-lbl">Var. Kategorikal</div></div>
        <div class="a4-stat-card"><div class="a4-stat-val">${ov.health||'-'}</div><div class="a4-stat-lbl">Data Quality</div></div>
      </div>
      ${colInfoHtml}
      <div class="a4-sub">1.4 Pratinjau Data (5 Baris Pertama)</div>
      ${prevHtml||'<p style="color:#64748B">Data pratinjau tidak tersedia.</p>'}
    `;
  }

  // ══════════════ BAB II ══════════════
  if (selectedPages.includes('bab2')) {
    const pg = mkPage(pageNum++);
    pg.innerHTML += `
      <div class="a4-bab-label">BAB II</div>
      <div class="a4-bab-title">Statistik Deskriptif Variabel Numerik</div>
      <hr class="a4-hr"/>
      <div class="a4-sub">2.1 Ringkasan Statistik Numerik</div>
      <p>Tabel berikut menyajikan statistik deskriptif lengkap untuk variabel numerik. Nilai besar
      diformat ringkas (M=juta, B=miliar). Kolom <b>Normalitas</b> menunjukkan hasil uji distribusi.</p>
      <div id="dlB2NumTable"><p style="color:#64748B;font-size:10pt">Memuat data...</p></div>
      <div class="a4-sub">2.2 Analisis Distribusi dan Normalitas</div>
      <div id="dlB2DistNarr"><p style="color:#64748B;font-size:10pt">Memuat...</p></div>
      <div class="a4-sub">2.3 Analisis Outlier</div>
      <div id="dlB2OutlierNarr"><p style="color:#64748B;font-size:10pt">Memuat...</p></div>
      <div id="dlB2OutlierTbl"></div>
    `;
    fetch('/api/stats/numerical').then(r=>r.json()).then(data => {
      const tblEl = document.getElementById('dlB2NumTable');
      const narrEl = document.getElementById('dlB2DistNarr');
      const outNarrEl = document.getElementById('dlB2OutlierNarr');
      const outTblEl = document.getElementById('dlB2OutlierTbl');
      if (!tblEl||!data||!data.length) { if(tblEl) tblEl.innerHTML='<p style="color:#64748B">Data numerik tidak tersedia.</p>'; return; }
      tblEl.innerHTML = `<div style="overflow-x:auto"><table class="a4t blue" style="font-size:8pt;min-width:600px">
        <tr><th>Variabel</th><th>N</th><th>Mean</th><th>Median</th><th>Std Dev</th><th>Min</th><th>Max</th><th>Skewness</th><th>Outlier</th><th>Normalitas</th></tr>
        ${data.map((r,i)=>`<tr style="background:${i%2?'#EEF2FF':'#fff'}">
          <td><b>${r.column||'-'}</b></td><td style="text-align:center">${r.count||'-'}</td>
          <td style="text-align:center">${fmtN(r.mean)}</td><td style="text-align:center">${fmtN(r.median)}</td>
          <td style="text-align:center">${fmtN(r.std)}</td><td style="text-align:center">${fmtN(r.min)}</td>
          <td style="text-align:center">${fmtN(r.max)}</td><td style="text-align:center">${fmtN(r.skewness)}</td>
          <td style="text-align:center">${r.outliers||'0'}</td>
          <td style="text-align:center;font-weight:700;color:${r.normality==='Normal'?'#059669':'#DC2626'}">${r.normality==='Normal'?'Normal':'Tidak Normal'}</td>
        </tr>`).join('')}
      </table></div>
      <div class="a4t-cap">Tabel 2.1 Statistik deskriptif variabel numerik (lengkap)</div>`;

      const normal = data.filter(r=>r.normality==='Normal');
      const notN   = data.filter(r=>r.normality!=='Normal');
      const skPos  = data.filter(r=>parseFloat(r.skewness||0)>1);
      const skNeg  = data.filter(r=>parseFloat(r.skewness||0)<-1);
      let dt = `Hasil uji normalitas: <b>${normal.length} dari ${data.length} variabel</b> berdistribusi normal, <b>${notN.length} variabel</b> tidak normal. `;
      if (notN.length) dt += `Variabel tidak normal: <b>${notN.slice(0,4).map(r=>r.column).join(', ')}</b>. Disarankan transformasi data atau metode non-parametrik. `;
      if (skPos.length) dt += `${skPos.length} variabel <i>right-skewed</i> (skewness>1): ${skPos.slice(0,3).map(r=>r.column).join(', ')}. `;
      if (skNeg.length) dt += `${skNeg.length} variabel <i>left-skewed</i>: ${skNeg.slice(0,3).map(r=>r.column).join(', ')}. `;
      narrEl.innerHTML = `<p>${dt}</p>`;

      const outls = data.filter(r=>parseFloat(r.outliers||0)>0);
      if (outls.length) {
        outNarrEl.innerHTML = `<p>Analisis IQR mendeteksi outlier pada <b>${outls.length} variabel</b>. Detail:</p>`;
        const rows = outls.map(r=>{
          const pct=(parseFloat(r.outliers||0)/(ov.rows||1)*100).toFixed(2);
          const rec=pct>5?'Winsorize / Log Transform':'Investigasi lebih lanjut';
          return `<tr><td><b>${r.column}</b></td><td style="text-align:center">${r.outliers}</td><td style="text-align:center">${pct}%</td><td>${rec}</td></tr>`;
        }).join('');
        outTblEl.innerHTML = `<table class="a4t amber"><tr><th>Variabel</th><th>Jumlah Outlier</th><th>% dari Total</th><th>Rekomendasi</th></tr>${rows}</table>
          <div class="a4t-cap">Tabel 2.2 Ringkasan outlier per variabel</div>`;
      } else {
        outNarrEl.innerHTML = `<p>Analisis IQR tidak mendeteksi outlier signifikan. Dataset bersih dari nilai ekstrem.</p>`;
      }
    }).catch(()=>{});
  }

  // ══════════════ BAB III ══════════════
  if (selectedPages.includes('bab3')) {
    const pg = mkPage(pageNum++);
    pg.innerHTML += `
      <div class="a4-bab-label">BAB III</div>
      <div class="a4-bab-title">Statistik Deskriptif Variabel Kategorikal dan Kualitas Data</div>
      <hr class="a4-hr"/>
      <div class="a4-sub">3.1 Analisis Variabel Kategorikal</div>
      <p>Analisis frekuensi, distribusi kategori, dan dominasi nilai modus untuk seluruh variabel
      kategorikal dalam dataset. Pemahaman ini penting untuk segmentasi dan pemodelan klasifikasi.</p>
      <div id="dlB3CatTable"><p style="color:#64748B;font-size:10pt">Memuat data...</p></div>
      <div class="a4-sub">3.2 Pola Dominasi Kategori</div>
      <div id="dlB3DomNarr"><p style="color:#64748B;font-size:10pt">Memuat...</p></div>
      <div class="a4-sub">3.3 Analisis Kualitas Data Komprehensif</div>
      <div id="dlB3QualNarr"><p style="color:#64748B;font-size:10pt">Memuat...</p></div>
    `;
    fetch('/api/stats/categorical').then(r=>r.json()).then(data => {
      const tblEl  = document.getElementById('dlB3CatTable');
      const domEl  = document.getElementById('dlB3DomNarr');
      const qualEl = document.getElementById('dlB3QualNarr');
      if (!tblEl||!data||!data.length) { if(tblEl) tblEl.innerHTML='<p style="color:#64748B">Data kategorikal tidak tersedia.</p>'; return; }
      tblEl.innerHTML = `<table class="a4t green" style="font-size:9pt">
        <tr><th>Variabel</th><th>N</th><th>Nilai Unik</th><th>Modus</th><th>Modus%</th><th>Missing%</th></tr>
        ${data.map((r,i)=>`<tr>
          <td><b>${r.column||'-'}</b></td><td style="text-align:center">${r.count||'-'}</td>
          <td style="text-align:center">${r.unique||'-'}</td><td>${r.mode||'-'}</td>
          <td style="text-align:center">${r.mode_pct||'-'}%</td><td style="text-align:center">${r.missing_pct||'0'}%</td>
        </tr>`).join('')}
      </table>
      <div class="a4t-cap">Tabel 3.1 Statistik deskriptif variabel kategorikal</div>`;

      const dom = data.filter(r=>parseFloat(r.mode_pct||0)>30);
      domEl.innerHTML = `<p>${dom.length
        ? `Terdapat <b>${dom.length} variabel</b> dengan dominasi >30%: ${dom.slice(0,4).map(r=>`<b>${r.column}</b> ("${r.mode}", ${r.mode_pct}%)`).join('; ')}. Berpotensi menyebabkan class imbalance dalam pemodelan prediktif.`
        : 'Tidak ditemukan dominasi kategori ekstrem (>30%). Distribusi antar kategori relatif seimbang.'}</p>`;

      const allStats = data;
      const highM = allStats.filter(r=>parseFloat(r.missing_pct||0)>10);
      const lowM  = allStats.filter(r=>{const p=parseFloat(r.missing_pct||0);return p>0&&p<=10;});
      let qt = `Evaluasi kualitas data pada <b>${ov.cols||'-'} variabel</b>. Total missing: <b>${ov.missing||'0'} sel (${ov.missing_pct||'0'}%)</b>. `;
      if (highM.length) qt += `Missing >10%: <b>${highM.slice(0,4).map(r=>r.column).join(', ')}</b>. Rekomendasi: imputasi atau drop. `;
      if (lowM.length)  qt += `Missing rendah: ${lowM.slice(0,4).map(r=>r.column).join(', ')}. Imputasi sederhana cukup. `;
      if (!highM.length&&!lowM.length) qt += 'Dataset bersih dari missing values. ';
      qualEl.innerHTML = `<p>${qt}</p>`;
    }).catch(()=>{});
  }

  // ══════════════ BAB IV ══════════════
  if (selectedPages.includes('bab4')) {
    const pg = mkPage(pageNum++);
    const missPct = parseFloat(ov.missing_pct||0);

    let numD=[],catD=[];
    try { numD = await fetch('/api/stats/numerical').then(r=>r.json()); } catch(e){}
    try { catD = await fetch('/api/stats/categorical').then(r=>r.json()); } catch(e){}

    const outls   = numD.filter(r=>parseFloat(r.outliers||0)>0);
    const notN    = numD.filter(r=>r.normality&&r.normality!=='Normal');
    const domCat  = catD.filter(r=>parseFloat(r.mode_pct||0)>30);
    const findings = [];
    if (numD.length) {
      const hm = numD.reduce((a,b)=>parseFloat(a.mean||0)>parseFloat(b.mean||0)?a:b);
      findings.push(`Variabel <b>${hm.column}</b> memiliki nilai rata-rata tertinggi (${fmtN(hm.mean)}), menjadi variabel dengan magnitudo terbesar.`);
    }
    if (outls.length) {
      const mo = outls.reduce((a,b)=>parseFloat(a.outliers||0)>parseFloat(b.outliers||0)?a:b);
      const pct=(parseFloat(mo.outliers||0)/(ov.rows||1)*100).toFixed(1);
      findings.push(`Variabel <b>${mo.column}</b> memiliki outlier terbanyak (${mo.outliers} data point / ${pct}%), memerlukan investigasi mendalam.`);
    }
    if (notN.length) findings.push(`Sebanyak <b>${notN.length} variabel</b> tidak berdistribusi normal: ${notN.slice(0,4).map(r=>r.column).join(', ')}. Disarankan korelasi Spearman.`);
    if (domCat.length) findings.push(`Variabel <b>${domCat[0].column}</b> menunjukkan dominasi kategori "${domCat[0].mode}" sebesar ${domCat[0].mode_pct}% — berpotensi class imbalance.`);
    findings.push(`Rasio missing values <b>${missPct}%</b>, tergolong <b>${missPct<5?'sangat baik (<5%)':'perlu penanganan sebelum pemodelan'}</b>.`);

    pg.innerHTML += `
      <div class="a4-bab-label">BAB IV</div>
      <div class="a4-bab-title">Temuan Utama dan Rekomendasi Strategis</div>
      <hr class="a4-hr"/>
      <div class="a4-sub">4.1 Ringkasan Temuan Utama</div>
      <p>Berikut temuan utama dari proses EDA yang mencakup statistik deskriptif, kualitas data, distribusi, dan pola kategorikal.</p>
      <div class="a4-findings">
        <ul>${findings.map(f=>`<li>${f}</li>`).join('')}</ul>
      </div>
      <div class="a4-sub">4.2 Rekomendasi Analisis Lanjutan</div>
      <div class="a4-rec"><div class="a4-rec-t">4.2.1 Pra-pemrosesan Data</div>
        <p style="margin:0">Tangani outlier dengan winsorization atau transformasi log untuk variabel skewed. Imputasi missing values: median untuk numerik, modus untuk kategorikal. Drop kolom/baris jika missing >30%.</p></div>
      <div class="a4-rec"><div class="a4-rec-t">4.2.2 Analisis Korelasi</div>
        <p style="margin:0">Gunakan Pearson untuk variabel normal dan Spearman untuk non-normal. Heatmap korelasi untuk deteksi multikolinearitas sebelum pemodelan.</p></div>
      <div class="a4-rec"><div class="a4-rec-t">4.2.3 Segmentasi dan Pengelompokan</div>
        <p style="margin:0">Gunakan K-Means/clustering untuk segmentasi. Bandingkan distribusi numerik antar segmen untuk pola bermakna.</p></div>
      <div class="a4-rec"><div class="a4-rec-t">4.2.4 Pemodelan Prediktif</div>
        <p style="margin:0">Normalisasi variabel numerik sebelum pemodelan. Untuk class imbalance gunakan SMOTE atau class_weight balancing.</p></div>
      <div class="a4-rec"><div class="a4-rec-t">4.2.5 Validasi dan Reproduktibilitas</div>
        <p style="margin:0">Dokumentasikan semua keputusan pra-pemrosesan dalam pipeline yang dapat direproduksi. Gunakan cross-validation k-fold untuk generalisasi model.</p></div>
      <div class="a4-footer">Laporan dibuat otomatis oleh DataMind Intelligent EDA Platform · ${nowStr}</div>
    `;
  }

  // ══════════════ LAMPIRAN CHART ══════════════
  if (selectedCharts.length) {
    const pg = mkPage(pageNum++);
    pg.innerHTML += `
      <div class="a4-bab-label">Lampiran</div>
      <div class="a4-bab-title">Visualisasi Data Pilihan</div>
      <hr class="a4-hr"/>
      <p>Lampiran ini memuat <b>${selectedCharts.length} visualisasi</b> yang dipilih sebagai pelengkap laporan EDA.</p>
      <div id="dlPreviewChartsGrid" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:14px"></div>
    `;
    const grid = document.getElementById('dlPreviewChartsGrid');
    selectedCharts.forEach(key => {
      const fig = CHARTS[key];
      const label = DL_CHART_LABELS[key] || key;
      const wrap = document.createElement('div');
      wrap.style.cssText = 'border:1px solid #E2E8F0;border-radius:8px;padding:10px;background:#FAFAFA;';
      wrap.innerHTML = `<div style="font-size:9pt;font-weight:700;color:#1B2A4A;margin-bottom:6px;text-align:center">${label}</div>
        <div id="dlchart-${key}" style="height:220px;width:100%"></div>`;
      grid.appendChild(wrap);
      requestAnimationFrame(() => {
        const el = document.getElementById('dlchart-'+key);
        if (!el||!fig||fig.error){if(el)el.innerHTML='<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#9ca3af;font-size:10pt">Data tidak tersedia</div>';return;}
        try {
          Plotly.newPlot(el,fig.data,Object.assign({},fig.layout,{
            autosize:true,height:210,margin:{t:24,r:8,b:32,l:40},
            paper_bgcolor:'#FAFAFA',plot_bgcolor:'#FAFAFA',
            font:{size:9,family:'Times New Roman'},
          }),{responsive:true,displayModeBar:false});
        } catch(e){}
      });
    });
  }

  setTimeout(() => {
    window.dispatchEvent(new Event('resize'));
    const pc = document.getElementById('dlPreviewPageCount');
    if (pc) pc.textContent = (pageNum-1) + ' halaman';
  }, 400);
}

/* ── Floating Page Navigator ── */
function dlTogglePageNav() {
  const nav = document.getElementById('dlPageNav');
  if (!nav) return;
  nav.classList.toggle('visible');
}

function dlNavJump(pageIndex) {
  const pages = document.querySelectorAll('#dlPreviewPagesContainer .dl-a4');
  if (pages[pageIndex]) {
    pages[pageIndex].scrollIntoView({ behavior: 'smooth', block: 'start' });
    // Highlight active nav link
    document.querySelectorAll('#dlPageNav a').forEach((a, i) => {
      a.classList.toggle('active', i === pageIndex);
    });
  }
}

// Auto-highlight nav on scroll
(function() {
  let _navScrollTimer = null;
  document.addEventListener('scroll', function() {
    clearTimeout(_navScrollTimer);
    _navScrollTimer = setTimeout(function() {
      const scroller = document.getElementById('dlPreviewScroller');
      if (!scroller) return;
      const pages = scroller.querySelectorAll('.dl-a4');
      const scrollTop = scroller.scrollTop + 80;
      let activeIdx = 0;
      pages.forEach((p, i) => {
        if (p.offsetTop <= scrollTop) activeIdx = i;
      });
      document.querySelectorAll('#dlPageNav a').forEach((a, i) => {
        a.classList.toggle('active', i === activeIdx);
      });
    }, 80);
  }, true);
})();


async function dlDownloadPDF() {
  if (!dlGuardLink()) return;
  const pages  = dlGetSelectedPages();
  const charts = dlGetSelected();
  var _id=(window.DM_LANG||'id')==='id';

  if (!pages.length && !charts.length) {
    showToast(_id?'Pilih minimal 1 halaman atau 1 chart sebelum download!':'Select at least 1 page or 1 chart before downloading!', 'w');
    return;
  }

  const btn = event.currentTarget;
  const origText = btn.innerHTML;
  btn.innerHTML = _id?'⏳ Menyiapkan PDF...':'⏳ Preparing PDF...';
  btn.disabled = true;

  try {
    const res = await fetch('/export/pdf_custom?lang=' + (window.DM_LANG||'id'), {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ pages, charts }),
    });
    if (res.status === 403) {
      const errD = await res.json().catch(()=>({}));
      showToast(errD.message || (_id?'Login dulu untuk download laporan.':'Please log in to download reports.'), 'w');
      return;
    }
    if (!res.ok) throw new Error(_id?'Gagal generate PDF':'Failed to generate PDF');
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'DataMind_Report.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch(e) {
    showToast((_id?'Gagal download PDF: ':'Failed to download PDF: ') + e.message, 'e');
  } finally {
    btn.innerHTML = origText;
    btn.disabled  = false;
  }
}

async function dlDownloadHTML() {
  if (!dlGuardLink()) return;
  const pages  = dlGetSelectedPages();
  const chartKeys = dlGetSelected();
  var _id=(window.DM_LANG||'id')==='id';

  if (!pages.length && !chartKeys.length) {
    showToast(_id?'Pilih minimal 1 halaman atau 1 chart sebelum download!':'Select at least 1 page or 1 chart before downloading!', 'w');
    return;
  }

  const btn = event.currentTarget;
  const origText = btn.innerHTML;
  btn.innerHTML = _id?'⏳ Menyiapkan HTML...':'⏳ Preparing HTML...';
  btn.disabled = true;

  try {
    // Collect chart Plotly JSON data from CHARTS object
    const chartData = {};
    chartKeys.forEach(key => {
      if (CHARTS[key]) {
        chartData[key] = CHARTS[key];
      }
    });

    const res = await fetch('/export/html_custom?lang=' + (window.DM_LANG||'id'), {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ pages, charts: chartData }),
    });
    if (res.status === 403) {
      const errD = await res.json().catch(()=>({}));
      showToast(errD.message || (_id?'Login dulu untuk download laporan.':'Please log in to download reports.'), 'w');
      return;
    }
    if (!res.ok) throw new Error(_id?'Gagal generate HTML':'Failed to generate HTML');
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'DataMind_Dashboard.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch(e) {
    showToast((_id?'Gagal download HTML: ':'Failed to download HTML: ') + e.message, 'e');
  } finally {
    btn.innerHTML = origText;
    btn.disabled  = false;
  }
}

function dlPrintLaporan() {
  const area = document.getElementById('dlPreviewArea');
  if (!area || area.style.display === 'none') {
    dlPreviewLaporan().then(() => setTimeout(dlPrintLaporan, 800));
    return;
  }
  const paper = document.getElementById('dlPreviewPaper');
  if (!paper) return;

  const printWin = window.open('', '_blank', 'width=900,height=700');
  printWin.document.write(`<!DOCTYPE html><html><head>
    <title>DataMind — Laporan Analisis</title>
    <script src="https://cdn.plot.ly/plotly-2.27.0.min.js"><\/script>
    <style>
      body { font-family: 'Inter', sans-serif; margin:0; padding:32px; color:#111; background:#fff; }
      @page { margin: 20mm; }
      .page-break { page-break-after: always; }
    </style>
  </head><body>
    ${paper.outerHTML}
    <script>window.onload=function(){ setTimeout(()=>{ window.print(); },800); }<\/script>
  </body></html>`);
  printWin.document.close();
}
/* ═══════════════════════════════════════════════════════════════
   DATA QUALITY MODAL — Missing, Duplicate, Outlier
   ═══════════════════════════════════════════════════════════════ */

let _dqModalInjected = false;

/* ═══════════════════════════════════════════════════════════════
   DATA QUALITY PAGE — Super Lengkap
   ═══════════════════════════════════════════════════════════════ */

let _dqPageCSSInjected = false;
function injectDQPageCSS() {
  if (_dqPageCSSInjected) return;
  _dqPageCSSInjected = true;
  const css = document.createElement('style');
  css.textContent = `
    .dqp-tab {
      padding:12px 24px; border:none; background:transparent;
      font-size:16px; font-weight:600; cursor:pointer;
      color:#64748B; border-bottom:3px solid transparent;
      margin-bottom:-1px; transition:all .15s; font-family:inherit;
    }
    .dqp-tab:hover { color:#6366F1; }
    .dqp-tab.active { color:#6366F1; border-bottom-color:#6366F1; }

    /* Summary stat cards */
    .dqp-stat-cards { display:flex; gap:16px; margin-bottom:24px; flex-wrap:wrap; }
    .dqp-stat { background:#F8FAFC; border:1px solid #E2E8F0; border-radius:12px;
      padding:18px 24px; min-width:150px; }
    .dqp-stat-val { font-size:32px; font-weight:800; color:#1E293B; line-height:1; }
    .dqp-stat-lbl { font-size:14px; color:#64748B; margin-top:6px; }
    .dqp-stat.danger .dqp-stat-val { color:#DC2626; }
    .dqp-stat.warn .dqp-stat-val { color:#D97706; }
    .dqp-stat.ok .dqp-stat-val { color:#059669; }

    /* Table */
    .dqp-table-wrap { overflow-x:auto; width:100%; -webkit-overflow-scrolling:touch; }
    .dqp-table { width:100%; min-width:700px; border-collapse:collapse; font-size:15px; }
    .dqp-table th { background:#1B2A4A; color:#fff; padding:12px 16px;
      text-align:left; font-weight:600; position:sticky; top:0; z-index:1;
      white-space:nowrap; }
    .dqp-table td { padding:11px 14px; border-bottom:1px solid #F1F5F9; vertical-align:middle; }
    .dqp-table tr:hover td { background:#F8FAFC; }
    .dqp-table tr.selected td { background:#EEF2FF; }
    .dqp-action-row { white-space:nowrap; }

    /* Checkbox */
    .dqp-cb { width:20px; height:20px; cursor:pointer; accent-color:#6366F1; }

    /* Progress bar */
    .dqp-bar-bg { height:8px; background:#E5E7EB; border-radius:4px; min-width:100px; }
    .dqp-bar { height:100%; border-radius:4px; transition:width .4s; }

    /* Badge */
    .dqp-badge { display:inline-block; padding:4px 14px; border-radius:14px;
      font-size:13px; font-weight:700; }
    .dqp-badge.danger { background:#FEE2E2; color:#DC2626; }
    .dqp-badge.warn { background:#FEF3C7; color:#D97706; }
    .dqp-badge.ok { background:#D1FAE5; color:#059669; }

    /* Action row */
    .dqp-action-row { display:flex; gap:8px; align-items:center; }
    .dqp-sel { padding:8px 12px; border:1px solid #CBD5E1; border-radius:8px;
      font-size:14px; background:#fff; cursor:pointer; }
    .dqp-btn { padding:8px 16px; border:none; border-radius:8px;
      font-size:14px; font-weight:600; cursor:pointer; font-family:inherit; transition:all .15s; }
    .dqp-btn.primary { background:#6366F1; color:#fff; }
    .dqp-btn.primary:hover { background:#4F46E5; }
    .dqp-btn.danger { background:#DC2626; color:#fff; }
    .dqp-btn.success { background:#059669; color:#fff; }
    .dqp-btn.ghost { background:#F1F5F9; color:#334155; }
    .dqp-btn.ghost:hover { background:#E2E8F0; }

    /* Recommend chip */
    .dqp-rec { display:inline-block; padding:4px 12px; border-radius:8px;
      font-size:13px; background:#EEF2FF; color:#4F46E5; font-weight:600; }

    /* Detail panel (slide in) */
    .dqp-detail-panel {
      background:#F8FAFC; border:1px solid #E2E8F0; border-radius:12px;
      padding:20px; margin-top:12px; animation:slideDown .2s ease;
    }
    @keyframes slideDown { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
    .dqp-detail-title { font-size:15px; font-weight:700; color:#1E293B; margin-bottom:12px; }
    .dqp-detail-table { width:100%; border-collapse:collapse; font-size:14px; }
    .dqp-detail-table th { background:#E2E8F0; padding:8px 12px; text-align:left; }
    .dqp-detail-table td { padding:7px 12px; border-bottom:1px solid #F1F5F9; }

    /* Apply all banner */
    .dqp-apply-all-bar {
      display:flex; align-items:center; justify-content:space-between;
      background:linear-gradient(135deg,#EEF2FF,#F5F3FF);
      border:1px solid #C7D2FE; border-radius:12px;
      padding:16px 20px; margin-bottom:18px;
    }
    .dqp-apply-all-text { font-size:15px; color:#4F46E5; font-weight:600; }
    .dqp-apply-all-sub { font-size:13px; color:#818CF8; margin-top:2px; }

    /* Select all row */
    .dqp-select-bar { display:flex; align-items:center; gap:12px; margin-bottom:12px; }
    .dqp-select-bar label { font-size:15px; color:#374151; font-weight:600; cursor:pointer; }

    /* ── Health Score Summary ── */
    .dqp-health-wrap {
      display:flex; gap:20px; align-items:stretch; background:#fff;
      border:1px solid #E2E8F0; border-radius:16px; padding:22px 24px;
      margin-bottom:22px; flex-wrap:wrap;
    }
    .dqp-health-ring-box { display:flex; align-items:center; gap:16px; min-width:220px; }
    .dqp-health-ring-box svg { display:block; }
    .dqp-health-score-num { font-size:30px; font-weight:800; }
    .dqp-health-score-lbl { font-size:14px; color:#64748B; font-weight:600; margin-top:2px; }
    .dqp-health-title { font-size:12px; color:#94A3B8; text-transform:uppercase; letter-spacing:.04em; font-weight:700; }
    .dqp-health-breakdown { flex:1; min-width:260px; display:flex; flex-direction:column; gap:12px; justify-content:center; }
    .dqp-hb-row { display:flex; align-items:center; gap:12px; }
    .dqp-hb-label { font-size:14px; color:#475569; font-weight:600; width:130px; flex-shrink:0; }
    .dqp-hb-bar-bg { flex:1; height:10px; background:#F1F5F9; border-radius:5px; overflow:hidden; }
    .dqp-hb-bar { height:100%; border-radius:5px; transition:width .5s ease; }
    .dqp-hb-pct { font-size:14px; font-weight:700; width:60px; text-align:right; flex-shrink:0; }
    .dqp-health-divider { width:1px; background:#E2E8F0; align-self:stretch; }

    /* ── Severity badge ── */
    .dqp-sev { display:inline-flex; align-items:center; gap:5px; padding:4px 14px;
      border-radius:14px; font-size:13px; font-weight:700; }
    .dqp-sev .dot { width:8px; height:8px; border-radius:50%; }
    .dqp-sev.low { background:#D1FAE5; color:#059669; }
    .dqp-sev.low .dot { background:#059669; }
    .dqp-sev.medium { background:#FEF3C7; color:#D97706; }
    .dqp-sev.medium .dot { background:#D97706; }
    .dqp-sev.high { background:#FEE2E2; color:#DC2626; }
    .dqp-sev.high .dot { background:#DC2626; }

    /* ── Mini boxplot sparkline (outlier) ── */
    .dqp-boxplot-wrap { display:flex; flex-direction:column; gap:2px; min-width:150px; }
    .dqp-boxplot-svg { display:block; }

    /* ── Row preview viewer (overall) ── */
    .dqp-rowprev-tabs { display:flex; gap:8px; margin-bottom:12px; flex-wrap:wrap; }
    .dqp-rowprev-tab { padding:6px 16px; border-radius:8px; font-size:14px; font-weight:600;
      cursor:pointer; border:1px solid #E2E8F0; background:#F8FAFC; color:#475569; }
    .dqp-rowprev-tab.active { background:#6366F1; color:#fff; border-color:#6366F1; }
  `;
  document.head.appendChild(css);
}

/* ── CSS lama untuk modal (tetap ada untuk backward compat) ── */
function injectDQModal() {
  if (_dqModalInjected) return;
  _dqModalInjected = true;
  const css = document.createElement('style');
  css.textContent = `
    .dq-overlay { position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:24px; }
    .dq-modal { background:#fff;border-radius:16px;width:100%;max-width:800px;max-height:85vh;display:flex;flex-direction:column;box-shadow:0 24px 80px rgba(0,0,0,0.4);overflow:hidden; }
    .dq-modal-header { display:flex;align-items:center;justify-content:space-between;padding:20px 24px;border-bottom:1px solid #E2E8F0;flex-shrink:0; }
    .dq-modal-title { font-size:18px;font-weight:700;color:#1E293B; }
    .dq-modal-close { width:36px;height:36px;border:none;border-radius:8px;background:#F1F5F9;font-size:18px;cursor:pointer;color:#64748B;font-family:inherit; }
    .dq-modal-close:hover { background:#E2E8F0; }
    .dq-tabs { display:flex;gap:4px;padding:12px 24px 0;background:#F8FAFC;border-bottom:1px solid #E2E8F0;flex-shrink:0; }
    .dq-tab { padding:10px 18px;border:none;border-radius:8px 8px 0 0;font-size:14px;font-weight:600;cursor:pointer;background:transparent;color:#64748B;font-family:inherit;transition:all .15s; }
    .dq-tab:hover { background:#EEF2F6;color:#334155; }
    .dq-tab.active { background:#fff;color:#1E293B;box-shadow:0 -1px 3px rgba(0,0,0,0.05); }
    .dq-body { flex:1;overflow-y:auto;padding:20px 24px;min-height:200px; }
    .dq-body table { width:100%;border-collapse:collapse;font-size:13px; }
    .dq-body th { text-align:left;padding:10px 8px;background:#1B2A4A;color:#fff;font-weight:600;position:sticky;top:0; }
    .dq-body td { padding:8px;border-bottom:1px solid #F1F5F9; }
    .dq-body tr:hover td { background:#F8FAFC; }
    .dq-action-row { display:flex;gap:8px;align-items:center;flex-wrap:wrap; }
    .dq-action-row select { padding:6px 10px;border:1px solid #CBD5E1;border-radius:6px;font-size:12px;background:#fff; }
    .dq-btn-sm { padding:6px 14px;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit; }
    .dq-btn-sm.primary { background:#6366F1;color:#fff; }
    .dq-btn-sm.danger { background:#DC2626;color:#fff; }
    .dq-btn-sm.success { background:#059669;color:#fff; }
    .dq-empty { text-align:center;padding:40px;color:#94A3B8;font-size:14px; }
    .dq-badge { display:inline-block;padding:2px 10px;border-radius:12px;font-size:11px;font-weight:600; }
    .dq-badge.danger { background:#FEE2E2;color:#DC2626; }
    .dq-badge.warn { background:#FEF3C7;color:#D97706; }
    .dq-badge.ok { background:#D1FAE5;color:#059669; }
    .dq-footer { padding:14px 24px;border-top:1px solid #E2E8F0;background:#F8FAFC;font-size:12px;color:#64748B;flex-shrink:0;text-align:center; }
  `;
  document.head.appendChild(css);
}

/* ── Rekomendasi otomatis per kolom ── */
function getRecommendedAction(colData) {
  const pct = parseFloat(colData.missing_pct || 0);
  const isNum = colData.dtype && (colData.dtype.includes('float') || colData.dtype.includes('int'));
  if (pct > 50) return 'drop_col';
  if (pct > 20) return isNum ? 'median' : 'mode';
  return isNum ? 'mean' : 'mode';
}
function getRecommendedActionLabel(action) {
  const map = { drop:'Drop Rows', drop_col:'Drop Kolom', mean:'Impute Mean',
    median:'Impute Median', mode:'Impute Mode', zero:'Impute Zero',
    cap:'Cap (Winsorize)', drop_dupes:'Hapus Duplikat' };
  return map[action] || action;
}

/* ── Switch tab di halaman DQ ── */
let _dqActiveTab = 'missing';
function switchDQPageTab(tab) {
  _dqActiveTab = tab;
  document.querySelectorAll('#tab-missing .dqp-tab').forEach(t =>
    t.classList.toggle('active', t.dataset.tab === tab));
  const body = document.getElementById('dqPageTabBody');
  if (!body) return;
  body.innerHTML = '<div style="text-align:center;padding:60px;color:#94A3B8;font-size:16px">⏳ Memuat data...</div>';
  loadDQHealthSummary();
  if (tab === 'missing') loadDQMissingPage();
  else if (tab === 'duplicate') loadDQDuplicatePage();
  else if (tab === 'outlier') loadDQOutlierPage();
}

/* ══════════════════════════════════
   RINGKASAN KESEHATAN DATA (Overall)
══════════════════════════════════ */
function dqSeverityFromPct(pct) {
  if (pct > 20) return 'high';
  if (pct > 5) return 'medium';
  return 'low';
}
function dqSeverityLabel(sev) {
  return sev === 'high' ? 'Tinggi' : sev === 'medium' ? 'Sedang' : 'Rendah';
}

async function loadDQHealthSummary() {
  const wrap = document.getElementById('dqHealthSummary');
  if (!wrap) return;
  try {
    const d = await fetch('/api/dq_health_score').then(r => r.json());
    if (!d || d.error) { wrap.innerHTML = ''; return; }
    const score = parseFloat(d.score || 0);
    const color = d.color || '#6366F1';
    const circ = 2 * Math.PI * 34;
    const offset = circ - (score / 100) * circ;
    const bd = d.breakdown || {};
    const rows = [
      { key: 'missing',   icon: '⚠', color: '#6366F1' },
      { key: 'duplicate', icon: '🔁', color: '#F59E0B' },
      { key: 'outlier',   icon: '📊', color: '#EC4899' },
    ];
    wrap.innerHTML = `
      <div class="dqp-health-wrap">
        <div class="dqp-health-ring-box">
          <svg width="84" height="84" viewBox="0 0 84 84">
            <circle cx="42" cy="42" r="34" fill="none" stroke="#F1F5F9" stroke-width="9"/>
            <circle cx="42" cy="42" r="34" fill="none" stroke="${color}" stroke-width="9"
              stroke-linecap="round" stroke-dasharray="${circ}" stroke-dashoffset="${offset}"
              transform="rotate(-90 42 42)" style="transition:stroke-dashoffset .6s ease"/>
            <text x="42" y="47" text-anchor="middle" font-size="20" font-weight="800" fill="${color}">${score}</text>
          </svg>
          <div>
            <div class="dqp-health-title">Skor Kesehatan Data</div>
            <div class="dqp-health-score-num" style="color:${color}">${d.label || '-'}</div>
            <div class="dqp-health-score-lbl">${d.total_rows||0} baris &times; ${d.total_cols||0} kolom</div>
          </div>
        </div>
        <div class="dqp-health-divider"></div>
        <div class="dqp-health-breakdown">
          ${rows.map(r => {
            const item = bd[r.key] || { pct: 0, count: 0, label: r.key };
            const pct = parseFloat(item.pct || 0);
            return `<div class="dqp-hb-row">
              <span class="dqp-hb-label">${r.icon} ${item.label}</span>
              <div class="dqp-hb-bar-bg"><div class="dqp-hb-bar" style="width:${Math.min(pct,100)}%;background:${r.color}"></div></div>
              <span class="dqp-hb-pct" style="color:${r.color}">${pct.toFixed(1)}%</span>
            </div>`;
          }).join('')}
        </div>
      </div>
    `;
  } catch (e) {
    wrap.innerHTML = '';
  }
}

/* ══════════════════════════════════
   TAB MISSING — Full Page
══════════════════════════════════ */
let _dqMissingData = [];
async function loadDQMissingPage() {
  const body = document.getElementById('dqPageTabBody');
  try {
    const data = await fetch('/api/missing_info').then(r => r.json());
    _dqMissingData = data || [];

    if (!_dqMissingData.length) {
      body.innerHTML = '<div style="text-align:center;padding:60px;font-size:17px;color:#059669">✅ Tidak ada missing values! Dataset lengkap.</div>';
      return;
    }

    const totalMissing = _dqMissingData.reduce((s,r) => s + (parseInt(r.missing)||0), 0);
    const maxPct = Math.max(..._dqMissingData.map(r => parseFloat(r.missing_pct||0)));
    const recActions = _dqMissingData.map(r => getRecommendedAction(r));

    body.innerHTML = `
      <!-- Summary cards -->
      <div class="dqp-stat-cards">
        <div class="dqp-stat ${maxPct>20?'danger':maxPct>5?'warn':'ok'}">
          <div class="dqp-stat-val">${_dqMissingData.length}</div>
          <div class="dqp-stat-lbl">Kolom dengan Missing</div>
        </div>
        <div class="dqp-stat ${maxPct>20?'danger':maxPct>5?'warn':'ok'}">
          <div class="dqp-stat-val">${totalMissing}</div>
          <div class="dqp-stat-lbl">Total Sel Kosong</div>
        </div>
        <div class="dqp-stat ok">
          <div class="dqp-stat-val" style="font-size:18px">${maxPct.toFixed(1)}%</div>
          <div class="dqp-stat-lbl">Missing Tertinggi</div>
        </div>
      </div>

      <!-- Column Tags: kolom mana aja yang missing -->
      <div id="dqMissOverviewTags" style="margin-bottom:12px"></div>



      <!-- Apply All Banner -->
      <div class="dqp-apply-all-bar">
        <div>
          <div class="dqp-apply-all-text">✦ Rekomendasi Otomatis Siap</div>
          <div class="dqp-apply-all-sub">Sistem telah merekomendasikan aksi terbaik per kolom. Klik <b>Apply All Rekomendasi</b> untuk langsung bersihkan semua.</div>
        </div>
        <button class="dqp-btn primary" onclick="applyAllRecommended()">Apply All →</button>
      </div>

      <!-- Select all -->
      <div class="dqp-select-bar">
        <input type="checkbox" class="dqp-cb" id="dqSelectAll" onchange="toggleSelectAllMissing(this.checked)">
        <label for="dqSelectAll">Pilih Semua</label>
        <button class="dqp-btn ghost" style="margin-left:auto" onclick="applySelectedMissing()">Apply Terpilih</button>
      </div>

      <!-- Table -->
      <div class="dqp-table-wrap"><table class="dqp-table">
        <thead>
          <tr>
            <th style="width:36px"></th>
            <th>Kolom</th>
            <th>Tipe</th>
            <th>Missing</th>
            <th>%</th>
            <th>Sebaran</th>
            <th>Rekomendasi</th>
            <th>Aksi</th>
            <th></th>
          </tr>
        </thead>
        <tbody id="dqMissingTbody">
          ${_dqMissingData.map((r,i) => {
            const pct = parseFloat(r.missing_pct||0);
            const badge = pct>20?'danger':pct>5?'warn':'ok';
            const rec = recActions[i];
            const barColor = pct>20?'#DC2626':pct>5?'#F59E0B':'#10B981';
            return `<tr id="dqr-${i}" onclick="toggleDQRow(${i})" style="cursor:pointer">
              <td onclick="event.stopPropagation()">
                <input type="checkbox" class="dqp-cb dq-row-cb" data-idx="${i}" onchange="updateDQSelected()">
              </td>
              <td style="font-weight:700">${r.col||r.column||'-'}</td>
              <td><span style="font-size:13px;color:#64748B">${r.dtype||'-'}</span></td>
              <td><b>${r.missing||0}</b></td>
              <td><span class="dqp-badge ${badge}">${pct.toFixed(1)}%</span></td>
              <td>
                <div class="dqp-bar-bg">
                  <div class="dqp-bar" style="width:${Math.min(pct,100)}%;background:${barColor}"></div>
                </div>
              </td>
              <td><span class="dqp-rec">💡 ${getRecommendedActionLabel(rec)}</span></td>
              <td onclick="event.stopPropagation()">
                <div class="dqp-action-row">
                  <select class="dqp-sel" id="dqm-sel-${i}">
                    <option value="drop" ${rec==='drop'?'selected':''}>Drop Rows</option>
                    <option value="drop_col" ${rec==='drop_col'?'selected':''}>Drop Kolom</option>
                    <option value="mean" ${rec==='mean'?'selected':''}>Impute Mean</option>
                    <option value="median" ${rec==='median'?'selected':''}>Impute Median</option>
                    <option value="mode" ${rec==='mode'?'selected':''}>Impute Mode</option>
                    <option value="zero">Impute Zero</option>
                  </select>
                  <button class="dqp-btn primary" onclick="applyMissingPageAction(${i})">Apply</button>
                </div>
              </td>
              <td><span style="font-size:11px;color:#94A3B8">▼ Detail</span></td>
            </tr>
            <tr id="dqr-detail-${i}" style="display:none">
              <td colspan="9" style="padding:0 12px 12px">
                <div class="dqp-detail-panel" id="dqr-detail-body-${i}">
                  <div style="color:#94A3B8;font-size:13px">Memuat detail...</div>
                </div>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table></div>

      <!-- Missing Pattern: Top Missing Rows -->
      <div id="dqpMissingPattern" style="margin-top:24px">
        <div style="font-size:16px;font-weight:700;color:#1E293B;margin-bottom:10px">📋 Pola Missing — Baris dengan Missing Terbanyak</div>
        <div id="dqpMissingPatternBody" style="font-size:14px;color:#94A3B8">⏳ Memuat pola...</div>
      </div>
    `;
    loadMissingOverviewTags();
    loadMissingPatternSummary();
  } catch(e) {
    body.innerHTML = `<div style="text-align:center;padding:40px;color:#DC2626;font-size:16px">❌ Gagal memuat: ${e.message}</div>`;
  }
}

async function loadMissingOverviewTags() {
  try {
    const r = await fetch('/api/missing_overview');
    const d = await r.json();
    const el = document.getElementById('dqMissOverviewTags');
    if (d.error || !d.columns_with_missing || !d.columns_with_missing.length) { if (el) el.innerHTML = ''; return; }
    el.innerHTML = d.columns_with_missing.map(c => {
      const colors = { high: '#DC2626', medium: '#D97706', low: '#2563EB' };
      const bgColors = { high: '#FEE2E2', medium: '#FEF3C7', low: '#DBEAFE' };
      return `<span style="display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:8px;font-size:13px;font-weight:600;background:${bgColors[c.severity]};color:${colors[c.severity]}">
        <span style="width:7px;height:7px;border-radius:50%;background:${colors[c.severity]}"></span>
        ${c.column}
        <span style="opacity:.7">(${c.missing_pct}%)</span>
      </span>`;
    }).join('');
  } catch(e) {
    console.warn('Missing overview tags load error:', e);
  }
}

async function loadDQMissingHeatmap() {
  try {
    const r = await fetch('/api/missing_heatmap');
    const d = await r.json();
    const wrap = document.getElementById('dqMissHeatmapWrap');
    if (d.error || !d.rows || !d.rows.length) { wrap.style.display = 'none'; return; }
    const container = document.getElementById('dqMissingHeatmap');
    const cellW = Math.max(8, Math.min(16, Math.floor(340 / d.columns.length)));
    const cellH = Math.max(8, Math.min(14, Math.floor(180 / d.rows.length)));
    container.innerHTML = '';
    // Header row
    const header = document.createElement('div');
    header.style.cssText = 'display:flex;gap:2px;padding-left:30px';
    d.columns.forEach(c => {
      const el = document.createElement('div');
      el.style.cssText = `width:${cellW}px;font-size:7px;color:#94A3B8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:center`;
      el.title = c;
      el.textContent = c.length > 4 ? c.slice(0,4) : c;
      header.appendChild(el);
    });
    container.appendChild(header);
    // Data rows
    const totalCells = d.rows.length * d.columns.length;
    let missingCells = 0;
    d.rows.forEach(row => {
      const rowDiv = document.createElement('div');
      rowDiv.style.cssText = 'display:flex;gap:2px;align-items:center';
      const label = document.createElement('span');
      label.style.cssText = 'width:28px;font-size:7px;color:#94A3B8;text-align:right;flex-shrink:0;overflow:hidden';
      label.textContent = `#${row.row}`;
      rowDiv.appendChild(label);
      d.columns.forEach(c => {
        const isMiss = row.values[c];
        if (isMiss) missingCells++;
        const cell = document.createElement('div');
        cell.style.cssText = `width:${cellW}px;height:${cellH}px;border-radius:2px;background:${isMiss ? '#DC2626' : '#E2E8F0'};flex-shrink:0;transition:opacity .15s`;
        cell.title = `${c}: Baris ${row.row} — ${isMiss ? 'MISSING' : 'Terisi'}`;
        cell.onmouseenter = () => { cell.style.opacity = '.6'; };
        cell.onmouseleave = () => { cell.style.opacity = '1'; };
        rowDiv.appendChild(cell);
      });
      container.appendChild(rowDiv);
    });
    document.getElementById('dqMhMeta').textContent = `${d.total_rows.toLocaleString()} baris × ${d.total_cols} kolom (sampling ${d.sampled_rows} baris × ${d.max_display_cols} kolom)`;
    document.getElementById('dqMhStats').textContent = `🔴 ${missingCells} missing dari ${totalCells} sel`;
    wrap.style.display = 'block';
  } catch(e) {
    console.warn('DQ Missing heatmap load error:', e);
  }
}

async function loadMissingPatternSummary() {
  try {
    const r = await fetch('/api/missing_pattern_rows');
    const d = await r.json();
    const el = document.getElementById('dqpMissingPatternBody');
    if (d.error || !d.rows || !d.rows.length) {
      el.innerHTML = '<div style="font-size:15px;color:#059669">✅ Tidak ada baris dengan missing values.</div>';
      return;
    }
    let html = `<div style="display:flex;gap:12px;margin-bottom:12px;flex-wrap:wrap">
      <span style="font-size:13px;background:#F1F5F9;padding:6px 12px;border-radius:8px;color:#475569">📊 ${d.total_rows_checked.toLocaleString()} baris diperiksa</span>
      <span style="font-size:13px;background:#FEE2E2;padding:6px 12px;border-radius:8px;color:#DC2626">⚠ ${d.rows_with_any_missing.toLocaleString()} baris memiliki missing</span>
    </div>
    <div style="overflow-x:auto">
      <table class="dqp-detail-table" style="font-size:14px">
        <thead><tr>
          <th>#Baris</th>
          <th>Missing Count</th>
          <th>Missing %</th>
          <th>Kolom yang Missing</th>
        </tr></thead>
        <tbody>${d.rows.map(r => `
          <tr>
            <td style="font-weight:700">${r.row_num}</td>
            <td><span class="dqp-badge ${r.missing_pct > 50 ? 'danger' : r.missing_pct > 20 ? 'warn' : 'ok'}">${r.missing_count} / ${r.total_cols}</span></td>
            <td>${r.missing_pct}%</td>
            <td style="max-width:350px;white-space:normal">${r.missing_columns.map(c => `<span style="display:inline-block;padding:3px 8px;background:#FEE2E2;color:#DC2626;border-radius:6px;font-size:12px;font-weight:600;margin:2px 3px">${c}</span>`).join('')}${r.missing_cols_exceeded ? ' <span style="color:#94A3B8;font-size:12px">…dan lainnya</span>' : ''}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
    el.innerHTML = html;
  } catch(e) {
    console.warn('Missing pattern load error:', e);
  }
}

function toggleDQRow(i) {
  const detailRow = document.getElementById(`dqr-detail-${i}`);
  if (!detailRow) return;
  const isOpen = detailRow.style.display !== 'none';
  // Tutup semua detail lain
  document.querySelectorAll('[id^="dqr-detail-"]').forEach(r => { r.style.display = 'none'; });
  if (!isOpen) {
    detailRow.style.display = '';
    loadMissingRowDetail(i);
  }
}

async function loadMissingRowDetail(i) {
  const r = _dqMissingData[i];
  const col = r.col || r.column;
  const bodyEl = document.getElementById(`dqr-detail-body-${i}`);
  if (!bodyEl) return;
  try {
    // Ambil preview baris yang missing (endpoint resmi: /api/missing_rows)
    const res = await fetch(`/api/missing_rows?col=${encodeURIComponent(col)}`).then(rr => rr.json()).catch(() => null);
    const rows = res?.rows || [];
    const contextCols = res?.context_cols || (rows.length ? Object.keys(rows[0].data) : []);

    // Data table preview
    const dataPreviewHtml = rows.length ? `
      <div class="dqp-detail-title" style="margin-top:8px">📋 Contoh Baris dengan Missing (maks 12):</div>
      <div style="overflow-x:auto">
        <table class="dqp-detail-table">
          <thead><tr><th>#Baris</th>${contextCols.slice(0,6).map(k=>`<th>${k}</th>`).join('')}</tr></thead>
          <tbody>${rows.slice(0,12).map(row => {
            return `<tr>
              <td style="font-weight:700">${row.row_num}</td>
              ${contextCols.slice(0,6).map(c => {
                const v = row.data[c];
                return `<td style="${v===null||v===undefined||v===''?'color:#DC2626;font-weight:700':''}">${v===null||v===undefined||v===''?'NULL':String(v).slice(0,20)}</td>`;
              }).join('')}
            </tr>`;
          }).join('')}</tbody>
        </table>
      </div>` : '';

    bodyEl.innerHTML = `
      <div class="dqp-detail-title">🔍 Detail Missing: <b>${col}</b></div>
      <div style="display:flex;gap:20px;margin-bottom:12px;flex-wrap:wrap">
        <div><span style="font-size:14px;color:#64748B">Missing</span><br><b style="font-size:16px">${r.missing||0} baris</b></div>
        <div><span style="font-size:14px;color:#64748B">Persentase</span><br><b style="font-size:16px">${parseFloat(r.missing_pct||0).toFixed(2)}%</b></div>
        <div><span style="font-size:14px;color:#64748B">Tipe</span><br><b style="font-size:16px">${r.dtype||r.scale||'-'}</b></div>
        <div><span style="font-size:14px;color:#64748B">Rekomendasi</span><br><b style="font-size:16px;color:#6366F1">${getRecommendedActionLabel(getRecommendedAction(r))}</b></div>
      </div>
      ${dataPreviewHtml}
      ${rows.length ? `
        <div class="dqp-detail-title" style="margin-top:14px">📋 Baris dengan Missing (maks 5):</div>
        <div style="overflow-x:auto">
          <table class="dqp-detail-table">
            <thead><tr><th>#Baris</th>${contextCols.slice(0,6).map(k=>`<th>${k}</th>`).join('')}</tr></thead>
            <tbody>${rows.slice(0,5).map(row=>`<tr>
              <td>${row.row_num}</td>
              ${contextCols.slice(0,6).map(c=>{
                const v = row.data[c];
                return `<td>${v===null||v===undefined||v===''?'<span style="color:#DC2626;font-weight:700">NULL</span>':v}</td>`;
              }).join('')}
            </tr>`).join('')}</tbody>
          </table>
        </div>` : '<div style="font-size:12px;color:#94A3B8;margin-top:6px">Detail baris tidak tersedia dari API.</div>'}
    `;
  } catch(e) {
    bodyEl.innerHTML = `<div style="color:#DC2626;font-size:13px">Gagal memuat detail.</div>`;
  }
}

function toggleSelectAllMissing(checked) {
  document.querySelectorAll('.dq-row-cb').forEach(cb => cb.checked = checked);
  updateDQSelected();
}

function updateDQSelected() {
  const checked = document.querySelectorAll('.dq-row-cb:checked').length;
  const el = document.getElementById('dqPageSelectedCount');
  if (el) el.textContent = checked > 0 ? `${checked} kolom terpilih` : '';
  // Highlight baris
  document.querySelectorAll('.dq-row-cb').forEach(cb => {
    const row = document.getElementById(`dqr-${cb.dataset.idx}`);
    if (row) row.classList.toggle('selected', cb.checked);
  });
}

async function applyMissingPageAction(idx) {
  const sel = document.getElementById(`dqm-sel-${idx}`);
  if (!sel) return;
  const action = sel.value;
  const r = _dqMissingData[idx];
  const col = r.col || r.column;
  try {
    const res = await fetch('/api/handle_missing', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ actions: {[col]: action}, custom_vals: {} })
    });
    const result = await res.json();
    if (result.success || result.message) {
      showToast(`✅ ${col}: ${getRecommendedActionLabel(action)} berhasil!`, 's');
      showDQUndoBtn();
      loadDQMissingPage();
      if (typeof loadOverview === 'function') loadOverview();
      loadDQHealthSummary();
    } else { showToast('Gagal: ' + (result.error||'unknown'), 'e'); }
  } catch(e) { showToast('Error: ' + e.message, 'e'); }
}

async function applySelectedMissing() {
  const checked = document.querySelectorAll('.dq-row-cb:checked');
  if (!checked.length) { showToast('Pilih minimal 1 kolom dulu', 'e'); return; }
  const actions = {};
  checked.forEach(cb => {
    const i = cb.dataset.idx;
    const sel = document.getElementById(`dqm-sel-${i}`);
    const r = _dqMissingData[i];
    if (r && sel) actions[r.col||r.column] = sel.value;
  });
  try {
    const res = await fetch('/api/handle_missing', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ actions, custom_vals: {} })
    });
    const result = await res.json();
    if (result.success || result.message) {
      showToast(`✅ ${Object.keys(actions).length} kolom berhasil di-handle!`, 's');
      showDQUndoBtn();
      loadDQMissingPage();
      if (typeof loadOverview === 'function') loadOverview();
      loadDQHealthSummary();
    } else { showToast('Gagal: ' + (result.error||'unknown'), 'e'); }
  } catch(e) { showToast('Error: ' + e.message, 'e'); }
}

async function applyAllRecommended() {
  if (!_dqMissingData.length) {
    // Coba load dulu kalau belum
    await fetch('/api/missing_info').then(r=>r.json()).then(d => { _dqMissingData = d||[]; });
  }
  if (!_dqMissingData.length) { showToast('Tidak ada missing values', 's'); return; }
  const actions = {};
  _dqMissingData.forEach(r => {
    actions[r.col||r.column] = getRecommendedAction(r);
  });
  try {
    const res = await fetch('/api/handle_missing', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ actions, custom_vals: {} })
    });
    const result = await res.json();
    if (result.success || result.message) {
      showToast(`🎉 Semua ${Object.keys(actions).length} kolom berhasil dibersihkan!`, 's');
      showDQUndoBtn();
      if (_dqActiveTab === 'missing') loadDQMissingPage();
      if (typeof loadOverview === 'function') loadOverview();
      loadDQHealthSummary();
    } else { showToast('Gagal: ' + (result.error||'unknown'), 'e'); }
  } catch(e) { showToast('Error: ' + e.message, 'e'); }
}

/* ══════════════════════════════════
   TAB DUPLICATE — Full Page
══════════════════════════════════ */
async function loadDQDuplicatePage() {
  const body = document.getElementById('dqPageTabBody');
  try {
    const data = await fetch('/api/duplicate_info').then(r => r.json());
    const totalDupes = data.total_dupes || 0;
    const totalRows = data.total_rows || 0;
    const columns = data.columns || data.duplicate_columns || [];
    const pct = totalRows ? ((totalDupes/totalRows)*100).toFixed(1) : '0';

    body.innerHTML = `
      <div class="dqp-stat-cards">
        <div class="dqp-stat ${totalDupes>0?'danger':'ok'}">
          <div class="dqp-stat-val">${totalDupes}</div>
          <div class="dqp-stat-lbl">Baris Duplikat</div>
        </div>
        <div class="dqp-stat">
          <div class="dqp-stat-val">${totalRows}</div>
          <div class="dqp-stat-lbl">Total Baris</div>
        </div>
        <div class="dqp-stat ${parseFloat(pct)>5?'danger':parseFloat(pct)>0?'warn':'ok'}">
          <div class="dqp-stat-val">${pct}%</div>
          <div class="dqp-stat-lbl">Rasio Duplikat</div>
        </div>
      </div>

      ${totalDupes > 0 ? `
        <div class="dqp-apply-all-bar">
          <div>
            <div class="dqp-apply-all-text">🔁 Ditemukan ${totalDupes} baris duplikat</div>
            <div class="dqp-apply-all-sub">Hapus semua duplikat sekaligus dengan satu klik.</div>
          </div>
          <button class="dqp-btn danger" onclick="confirmDropDuplicates()">🗑 Hapus Semua</button>
        </div>
      `         : '<div style="text-align:center;padding:30px;font-size:17px;color:#059669">✅ Tidak ditemukan baris duplikat.</div>'}

      ${columns.length ? `
        <div class="dqp-table-wrap"><table class="dqp-table" style="margin-top:16px;min-width:500px">
          <thead><tr><th>Kolom</th><th>Nilai Duplikat</th><th>%</th><th>Sebaran</th></tr></thead>
          <tbody>
            ${columns.map(c => {
              const cnt = c.duplicates||c.count||0;
              const cpct = totalRows ? ((cnt/totalRows)*100).toFixed(1) : 0;
              const badge = cpct>20?'danger':cpct>5?'warn':'ok';
              return `<tr>
                <td style="font-weight:700">${c.column||c.col||'-'}</td>
                <td><b>${cnt}</b></td>
                <td><span class="dqp-badge ${badge}">${cpct}%</span></td>
                <td><div class="dqp-bar-bg"><div class="dqp-bar" style="width:${Math.min(cpct,100)}%;background:${cpct>20?'#DC2626':cpct>5?'#F59E0B':'#10B981'}"></div></div></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table></div>
      ` : ''}
    `;
  } catch(e) {
    body.innerHTML = `<div style="text-align:center;padding:40px;color:#DC2626;font-size:16px">❌ Gagal: ${e.message}</div>`;
  }
}

/* ══════════════════════════════════
   TAB OUTLIER — Full Page
══════════════════════════════════ */
function outlierSeverity(pct) {
  if (pct > 10) return 'high';
  if (pct > 3) return 'medium';
  return 'low';
}

/* Mini boxplot SVG sparkline: min ─ [lower ▌median▌ upper] ─ max */
function renderMiniBoxplot(r) {
  const min = parseFloat(r.min), max = parseFloat(r.max);
  const lower = parseFloat(r.lower), upper = parseFloat(r.upper), median = parseFloat(r.median);
  if ([min,max,lower,upper,median].some(v => isNaN(v)) || max === min) {
    return '<span style="font-size:13px;color:#CBD5E1">n/a</span>';
  }
  const W = 130, H = 22, pad = 6;
  const scale = v => pad + ((v - min) / (max - min)) * (W - pad*2);
  const xMin = scale(min), xMax = scale(max), xLow = scale(lower), xUp = scale(upper), xMed = scale(median);
  return `
    <svg class="dqp-boxplot-svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
      <line x1="${xMin}" y1="${H/2}" x2="${xMax}" y2="${H/2}" stroke="#CBD5E1" stroke-width="2"/>
      <rect x="${xLow}" y="${H/2-6}" width="${Math.max(xUp-xLow,1)}" height="12" rx="2" fill="#C7D2FE" stroke="#6366F1" stroke-width="1"/>
      <line x1="${xMed}" y1="${H/2-6}" x2="${xMed}" y2="${H/2+6}" stroke="#4F46E5" stroke-width="2"/>
      <circle cx="${xMin}" cy="${H/2}" r="2.5" fill="#DC2626"/>
      <circle cx="${xMax}" cy="${H/2}" r="2.5" fill="#DC2626"/>
    </svg>
    <div style="font-size:11px;color:#94A3B8;display:flex;justify-content:space-between;width:${W}px">
      <span>${min.toFixed(1)}</span><span>${max.toFixed(1)}</span>
    </div>`;
}

async function loadDQOutlierPage() {
  const body = document.getElementById('dqPageTabBody');
  try {
    const data = await fetch('/api/outlier_info').then(r => r.json());
    if (!data || !data.length) {
      body.innerHTML = '<div style="text-align:center;padding:60px;font-size:17px;color:#059669">✅ Tidak ada outlier terdeteksi.</div>';
      return;
    }
    const totalOutliers = data.reduce((s,r) => s+(parseInt(r.outliers||r.count||0)), 0);
    const maxPct = Math.max(...data.map(r => parseFloat(r.pct||0)));

    body.innerHTML = `
      <div class="dqp-stat-cards">
        <div class="dqp-stat ${totalOutliers>0?'warn':'ok'}">
          <div class="dqp-stat-val">${data.length}</div>
          <div class="dqp-stat-lbl">Kolom dengan Outlier</div>
        </div>
        <div class="dqp-stat ${totalOutliers>50?'danger':totalOutliers>10?'warn':'ok'}">
          <div class="dqp-stat-val">${totalOutliers}</div>
          <div class="dqp-stat-lbl">Total Outlier</div>
        </div>
        <div class="dqp-stat ok">
          <div class="dqp-stat-val" style="font-size:18px">${maxPct.toFixed(1)}%</div>
          <div class="dqp-stat-lbl">Outlier Tertinggi</div>
        </div>
      </div>

      <div class="dqp-select-bar">
        <input type="checkbox" class="dqp-cb" id="dqOutSelectAll" onchange="toggleSelectAllOutlier(this.checked)">
        <label for="dqOutSelectAll">Pilih Semua</label>
        <button class="dqp-btn ghost" style="margin-left:auto" onclick="applySelectedOutlier()">Apply Terpilih</button>
      </div>

      <div class="dqp-table-wrap"><table class="dqp-table">
        <thead>
          <tr>
            <th style="width:36px"></th>
            <th>Kolom</th>
            <th>Outlier</th>
            <th>Keparahan</th>
            <th>Distribusi (min ⟷ max)</th>
            <th>Rekomendasi</th>
            <th>Aksi</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${data.map((r,i) => {
            const cnt = parseInt(r.outliers||r.count||0);
            const pct = parseFloat(r.pct||0);
            const badge = pct>10?'danger':pct>3?'warn':'ok';
            const sev = outlierSeverity(pct);
            return `<tr id="dqout-${i}" onclick="toggleDQOutRow(${i})" style="cursor:pointer">
              <td onclick="event.stopPropagation()"><input type="checkbox" class="dqp-cb dq-out-cb" data-idx="${i}"></td>
              <td style="font-weight:700">${r.column||r.col||'-'}<div style="font-size:13px;font-weight:400;color:#94A3B8">${cnt} baris (${pct.toFixed(1)}%)</div></td>
              <td><span class="dqp-badge ${badge}">${cnt}</span></td>
              <td><span class="dqp-sev ${sev}"><span class="dot"></span>${dqSeverityLabel(sev)}</span></td>
              <td><div class="dqp-boxplot-wrap">${renderMiniBoxplot(r)}</div></td>
              <td><span class="dqp-rec">💡 Cap (Winsorize)</span></td>
              <td onclick="event.stopPropagation()">
                <div class="dqp-action-row">
                  <select class="dqp-sel" id="dq-out-sel-${i}">
                    <option value="cap">Cap (Winsorize)</option>
                    <option value="median">Replace Median</option>
                    <option value="drop">Drop Rows</option>
                  </select>
                  <button class="dqp-btn primary" onclick="applyOutlierPageAction(${i}, '${r.column||r.col}')">Apply</button>
                </div>
              </td>
              <td><span style="font-size:13px;color:#94A3B8">▼ Lihat Baris</span></td>
            </tr>
            <tr id="dqout-detail-${i}" style="display:none">
              <td colspan="8" style="padding:0 12px 12px">
                <div class="dqp-detail-panel" id="dqout-detail-body-${i}">
                  <div style="color:#94A3B8;font-size:13px">Memuat detail...</div>
                </div>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table></div>
    `;
    window._dqOutlierData = data;
  } catch(e) {
    body.innerHTML = `<div style="text-align:center;padding:40px;color:#DC2626;font-size:16px">❌ Gagal: ${e.message}</div>`;
  }
}

function toggleDQOutRow(i) {
  const detailRow = document.getElementById(`dqout-detail-${i}`);
  if (!detailRow) return;
  const isOpen = detailRow.style.display !== 'none';
  document.querySelectorAll('[id^="dqout-detail-"]').forEach(r => { r.style.display = 'none'; });
  if (!isOpen) {
    detailRow.style.display = '';
    loadOutlierRowDetail(i);
  }
}

async function loadOutlierRowDetail(i) {
  const r = (window._dqOutlierData||[])[i];
  if (!r) return;
  const col = r.column || r.col;
  const bodyEl = document.getElementById(`dqout-detail-body-${i}`);
  if (!bodyEl) return;
  try {
    const res = await fetch(`/api/outlier_rows?col=${encodeURIComponent(col)}`).then(rr => rr.json()).catch(() => null);
    const rows = res?.rows || [];
    bodyEl.innerHTML = `
      <div class="dqp-detail-title">🔍 Baris Outlier: <b>${col}</b></div>
      <div style="display:flex;gap:20px;margin-bottom:12px;flex-wrap:wrap">
        <div><span style="font-size:14px;color:#64748B">Total Outlier</span><br><b style="font-size:16px">${res?.total_outliers||0} baris</b></div>
        <div><span style="font-size:14px;color:#64748B">Lower Bound</span><br><b style="font-size:16px">${res?.lower!==undefined?res.lower:'-'}</b></div>
        <div><span style="font-size:14px;color:#64748B">Upper Bound</span><br><b style="font-size:16px">${res?.upper!==undefined?res.upper:'-'}</b></div>
        <div><span style="font-size:14px;color:#64748B">Rekomendasi</span><br><b style="font-size:16px;color:#6366F1">Cap (Winsorize)</b></div>
      </div>
      ${rows.length ? `
        <div class="dqp-detail-title" style="margin-top:8px">📋 Baris Outlier Paling Ekstrem (maks 10, diurutkan):</div>
        <div style="overflow-x:auto">
          <table class="dqp-detail-table">
            <thead><tr>
              <th>#Baris</th>
              ${Object.keys(rows[0].data).slice(0,5).map(k=>`<th>${k}</th>`).join('')}
              <th>Keparahan</th>
            </tr></thead>
            <tbody>${rows.slice(0,10).map(row => {
              const sev = row.severity > 2 ? 'high' : row.severity > 0.7 ? 'medium' : 'low';
              return `<tr>
                <td>${row.row_num}</td>
                ${Object.values(row.data).slice(0,5).map(v=>{
                  const isTarget = false;
                  return `<td>${v===null||v===''?'<span style="color:#DC2626;font-weight:700">NULL</span>':v}</td>`;
                }).join('')}
                <td><span class="dqp-sev ${sev}"><span class="dot"></span>${row.severity}&times; IQR</span></td>
              </tr>`;
            }).join('')}</tbody>
          </table>
        </div>` : '<div style="font-size:12px;color:#94A3B8;margin-top:6px">Detail baris tidak tersedia.</div>'}
    `;
  } catch(e) {
    bodyEl.innerHTML = `<div style="color:#DC2626;font-size:13px">Gagal memuat detail.</div>`;
  }
}

function toggleSelectAllOutlier(checked) {
  document.querySelectorAll('.dq-out-cb').forEach(cb => cb.checked = checked);
}

async function applySelectedOutlier() {
  const cbs = document.querySelectorAll('.dq-out-cb:checked');
  if (!cbs.length) { showToast('Pilih minimal 1 kolom', 'e'); return; }
  for (const cb of cbs) {
    const i = cb.dataset.idx;
    const r = (window._dqOutlierData||[])[i];
    const sel = document.getElementById(`dq-out-sel-${i}`);
    if (!r || !sel) continue;
    await fetch('/api/handle_outlier', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ column: r.column||r.col, action: sel.value })
    });
  }
  showToast(`✅ ${cbs.length} kolom outlier berhasil di-handle!`, 's');
  showDQUndoBtn();
  loadDQOutlierPage();
  loadDQHealthSummary();
  if (typeof loadOverview === 'function') loadOverview();
}

async function applyOutlierPageAction(idx, col) {
  const sel = document.getElementById(`dq-out-sel-${idx}`);
  if (!sel) return;
  try {
    const r = await fetch('/api/handle_outlier', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ column: col, action: sel.value })
    });
    const result = await r.json();
    if (result.success || result.message) {
      showToast(`✅ ${col}: ${sel.value} berhasil!`, 's');
      showDQUndoBtn();
      loadDQOutlierPage();
      loadDQHealthSummary();
      if (typeof loadOverview === 'function') loadOverview();
    } else { showToast('Gagal: '+(result.error||'unknown'), 'e'); }
  } catch(e) { showToast('Error: '+e.message, 'e'); }
}

/* ── Undo ── */
function showDQUndoBtn() {
  const btn = document.getElementById('dqUndoBtnPage');
  if (btn) btn.style.display = 'inline-block';
  showUndoBtn(); // modal juga
}

/* ══════════════════════════════════
   MODAL (dari summary card klik)
══════════════════════════════════ */

function openMissingModal() {
  injectDQModal();

  let overlay = document.getElementById('dqOverlay');
  if (overlay) { overlay.style.display = 'flex'; return; }

  overlay = document.createElement('div');
  overlay.id = 'dqOverlay';
  overlay.className = 'dq-overlay';
  overlay.innerHTML = `
    <div class="dq-modal">
      <div class="dq-modal-header">
        <span class="dq-modal-title">⚙ Kualitas Data — Missing, Duplicate, Outlier</span>
        <button class="dq-modal-close" onclick="document.getElementById('dqOverlay').style.display='none'">✕</button>
      </div>
      <div class="dq-tabs">
        <button class="dq-tab active" data-tab="missing" onclick="switchDQTab('missing')">⚠ Missing</button>
        <button class="dq-tab" data-tab="duplicate" onclick="switchDQTab('duplicate')">🔁 Duplicate</button>
        <button class="dq-tab" data-tab="outlier" onclick="switchDQTab('outlier')">📊 Outlier</button>
      </div>
      <div class="dq-body" id="dqBody">
        <div style="text-align:center;padding:40px;color:#94A3B8">Memuat data...</div>
      </div>
      <div class="dq-footer" style="display:flex;justify-content:space-between;align-items:center">
        <span>Klik kolom untuk melihat detail | Pilih aksi lalu klik Apply</span>
        <button id="dqUndoBtn" class="dq-btn-sm danger" style="display:none" onclick="undoLastAction()">↩ Undo Aksi Terakhir</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  // Tutup modal klik backdrop
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) overlay.style.display = 'none';
  });

  // Muat tab pertama
  switchDQTab('missing');
}

function switchDQTab(tab) {
  document.querySelectorAll('#dqOverlay .dq-tab').forEach(function(t) {
    t.classList.toggle('active', t.dataset.tab === tab);
  });
  const body = document.getElementById('dqBody');
  if (!body) return;
  body.innerHTML = '<div style="text-align:center;padding:40px;color:#94A3B8">Memuat data...</div>';

  if (tab === 'missing') loadMissingTab();
  else if (tab === 'duplicate') loadDuplicateTab();
  else if (tab === 'outlier') loadOutlierTab();
}

async function loadMissingTab() {
  const body = document.getElementById('dqBody');
  if (!body) return;

  try {
    const data = await fetch('/api/missing_info').then(function(r) { return r.json(); });
    if (!data || !data.length) {
      body.innerHTML = '<div class="dq-empty">✅ Tidak ada missing values.</div>';
      return;
    }

    let rows = data.map(function(r, i) {
      const pct = parseFloat(r.missing_pct);
      const badge = pct > 20 ? 'danger' : pct > 5 ? 'warn' : 'ok';
      return '<tr>' +
        '<td style="font-weight:600">' + (r.col||r.column||'-') + '</td>' +
        '<td>' + (r.missing||'-') + '</td>' +
        '<td><span class="dq-badge ' + badge + '">' + (pct || 0).toFixed(1) + '%</span></td>' +
        '<td>' +
          '<div class="dq-action-row">' +
            '<select id="dq-act-' + i + '">' +
              '<option value="drop">Drop rows</option>' +
              '<option value="mean">Impute Mean</option>' +
              '<option value="median">Impute Median</option>' +
              '<option value="mode">Impute Mode</option>' +
              '<option value="zero">Impute Zero</option>' +
            '</select>' +
            '<button class="dq-btn-sm primary" onclick="applyMissingAction(' + i + ')">Apply</button>' +
          '</div>' +
        '</td>' +
      '</tr>';
    });

    body.innerHTML =
      '<table><thead><tr><th>Kolom</th><th>Missing</th><th>Persentase</th><th>Aksi</th></tr></thead><tbody>' +
      rows.join('') + '</tbody></table>';
  } catch(e) {
    body.innerHTML = '<div class="dq-empty">❌ Gagal memuat data missing: ' + e.message + '</div>';
  }
}

async function applyMissingAction(idx) {
  const sel = document.getElementById('dq-act-' + idx);
  if (!sel) return;
  const action = sel.value;

  // Dapatkan nama kolom dari baris
  const row = sel.closest('tr');
  const col = row ? row.cells[0].textContent.trim() : '';
  if (!col) return;

  try {
    const r = await fetch('/api/handle_missing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actions: Object.fromEntries([[col, action]]), custom_vals: {} })
    });
    const result = await r.json();
    if (result.success || result.message) {
      showToast(col + ': ' + action + ' berhasil!', 's');
      showUndoBtn();
      switchDQTab('missing');
    } else {
      showToast('Gagal: ' + (result.error || 'unknown'), 'e');
    }
  } catch(e) {
    showToast('Error: ' + e.message, 'e');
  }
}

async function loadDuplicateTab() {
  const body = document.getElementById('dqBody');
  if (!body) return;

  try {
    const data = await fetch('/api/duplicate_info').then(function(r) { return r.json(); });
    const totalDupes = data.total_dupes || 0;
    const totalRows = data.total_rows || 0;
    const columns = data.columns || data.duplicate_columns || [];

    let html = '<div style="margin-bottom:16px">' +
      '<div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap">' +
      '<div style="padding:12px 20px;background:#F1F5F9;border-radius:10px">' +
      '<div style="font-size:24px;font-weight:800;color:#0A2E1A">' + totalDupes + '</div>' +
      '<div style="font-size:12px;color:#64748B">Baris Duplikat</div></div>' +
      '<div style="padding:12px 20px;background:#F1F5F9;border-radius:10px">' +
      '<div style="font-size:24px;font-weight:800;color:#0A2E1A">' + totalRows + '</div>' +
      '<div style="font-size:12px;color:#64748B">Total Baris</div></div>' +
      '<div style="padding:12px 20px;background:#F1F5F9;border-radius:10px">' +
      '<div style="font-size:24px;font-weight:800;color:' + (totalDupes > 0 ? '#DC2626' : '#059669') + '">' +
      (totalRows ? ((totalDupes / totalRows) * 100).toFixed(1) : '0') + '%</div>' +
      '<div style="font-size:12px;color:#64748B">Rasio Duplikat</div></div>' +
      '</div></div>';

    if (totalDupes > 0) {
      html += '<div style="margin-bottom:12px">' +
        '<button class="dq-btn-sm danger" onclick="confirmDropDuplicates()">🗑 Hapus Semua Duplikat</button>' +
        '</div>';
    }

    if (columns && columns.length) {
      html += '<table><thead><tr><th>Kolom</th><th>Duplikat</th></tr></thead><tbody>' +
        columns.map(function(c) {
          return '<tr><td>' + (c.column||c.col||'-') + '</td><td>' + (c.duplicates||c.count||0) + '</td></tr>';
        }).join('') + '</tbody></table>';
    } else if (!totalDupes) {
      html += '<div class="dq-empty">✅ Tidak ditemukan baris duplikat.</div>';
    }

    body.innerHTML = html;
  } catch(e) {
    body.innerHTML = '<div class="dq-empty">❌ Gagal memuat data duplikat: ' + e.message + '</div>';
  }
}

function confirmDropDuplicates() {
  if (!confirm('Hapus semua baris duplikat? Aksi ini tidak bisa dibatalkan.')) return;

  fetch('/api/handle_duplicate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'drop', subset: [] })
  }).then(function(r) { return r.json(); }).then(function(result) {
    if (result.success || result.message) {
      showToast('Duplikat berhasil dihapus!', 's');
      showUndoBtn();
      loadDuplicateTab();
    } else {
      showToast('Gagal: ' + (result.error || 'unknown'), 'e');
    }
  }).catch(function(e) {
    showToast('Error: ' + e.message, 'e');
  });
}

async function loadOutlierTab() {
  const body = document.getElementById('dqBody');
  if (!body) return;

  try {
    const data = await fetch('/api/outlier_info').then(function(r) { return r.json(); });
    if (!data || !data.length) {
      body.innerHTML = '<div class="dq-empty">✅ Tidak ada outlier terdeteksi.</div>';
      return;
    }

    let rows = data.map(function(r, i) {
      const count = parseInt(r.outliers || r.count || 0);
      const badge = count > 50 ? 'danger' : count > 10 ? 'warn' : 'ok';
      return '<tr>' +
        '<td style="font-weight:600">' + (r.column||r.col||'-') + '</td>' +
        '<td><span class="dq-badge ' + badge + '">' + count + '</span></td>' +
        '<td>' + (r.lower_bound !== undefined ? parseFloat(r.lower_bound).toFixed(2) : '-') + '</td>' +
        '<td>' + (r.upper_bound !== undefined ? parseFloat(r.upper_bound).toFixed(2) : '-') + '</td>' +
        '<td>' +
          '<div class="dq-action-row">' +
            '<select id="dq-out-act-' + i + '">' +
              '<option value="drop">Drop rows</option>' +
              '<option value="cap">Cap (Winsorize)</option>' +
              '<option value="median">Replace with Median</option>' +
            '</select>' +
            '<button class="dq-btn-sm primary" onclick="applyOutlierAction(' + i + ')">Apply</button>' +
          '</div>' +
        '</td>' +
      '</tr>';
    });

    body.innerHTML =
      '<table><thead><tr><th>Kolom</th><th>Outlier</th><th>Lower Bound</th><th>Upper Bound</th><th>Aksi</th></tr></thead><tbody>' +
      rows.join('') + '</tbody></table>';
  } catch(e) {
    body.innerHTML = '<div class="dq-empty">❌ Gagal memuat data outlier: ' + e.message + '</div>';
  }
}

async function applyOutlierAction(idx) {
  const sel = document.getElementById('dq-out-act-' + idx);
  if (!sel) return;
  const action = sel.value;
  const row = sel.closest('tr');
  const col = row ? row.cells[0].textContent.trim() : '';
  if (!col) return;

  try {
    const r = await fetch('/api/handle_outlier', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ column: col, action: action })
    });
    const result = await r.json();
    if (result.success || result.message) {
      showToast(col + ': ' + action + ' berhasil!', 's');
      showUndoBtn();
      loadOutlierTab();
    } else {
      showToast('Gagal: ' + (result.error || 'unknown'), 'e');
    }
  } catch(e) {
    showToast('Error: ' + e.message, 'e');
  }
}

async function undoLastAction() {
  try {
    const r = await fetch('/api/undo', { method: 'POST' });
    const result = await r.json();
    if (result.success) {
      showToast('Data berhasil di-undo!', 's');
      document.getElementById('dqUndoBtn').style.display = 'none';
      // Reload tab aktif
      var active = document.querySelector('#dqOverlay .dq-tab.active');
      if (active) switchDQTab(active.dataset.tab);
    } else {
      showToast(result.error || 'Gagal undo', 'e');
    }
  } catch(e) {
    showToast('Error: ' + e.message, 'e');
  }
}

function showUndoBtn() {
  var btn = document.getElementById('dqUndoBtn');
  if (btn) btn.style.display = 'inline-block';
}

/* ═══════════════════════════════════════════════════════════════
   END FITUR LAPORAN
   ═══════════════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════════
   SIDEBAR PROFILE CARD
   ═══════════════════════════════════════════════════════════════ */

function dlGuardLink(e) {
  if (window.DM_LOGGED_IN) return true;
  if (e && e.preventDefault) e.preventDefault();
  var _id = (window.DM_LANG||'id') === 'id';
  showToast(_id ? '🔒 Login dulu untuk download laporan.' : '🔒 Please log in to download reports.', 'e');
  return false;
}

async function loadSidebarProfile() {
  try {
    const r = await fetch('/api/user/profile');
    const p = await r.json();

    const guestEl = document.getElementById('spcGuest');
    const userEl  = document.getElementById('spcUser');

    // Lock/unlock Download menu based on login state
    const lockBadge   = document.getElementById('navDownloadLock');
    const guestBanner = document.getElementById('dlGuestBanner');
    if (lockBadge)   lockBadge.style.display   = p.logged_in ? 'none' : 'inline';
    if (guestBanner) guestBanner.style.display = p.logged_in ? 'none' : 'flex';
    window.DM_LOGGED_IN = !!p.logged_in;

    if (!guestEl || !userEl) return;

    if (!p.logged_in) {
      guestEl.style.display = 'flex';
      userEl.style.display  = 'none';
      return;
    }

    guestEl.style.display = 'none';
    userEl.style.display  = 'block';

    // Avatar
    const avatarEl = document.getElementById('spcAvatar');
    if (avatarEl) {
      if (p.avatar_url) {
        avatarEl.innerHTML = `<img src="${p.avatar_url}?t=${Date.now()}" alt="avatar">`;
      } else {
        const initials = (p.name || 'U').split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase();
        avatarEl.textContent = initials;
      }
    }

    const nameEl  = document.getElementById('spcName');
    const emailEl = document.getElementById('spcEmail');
    if (nameEl)  nameEl.textContent  = p.name  || '—';
    if (emailEl) emailEl.textContent = p.email || '—';

    const dsEl = document.getElementById('spcDatasets');
    const rpEl = document.getElementById('spcReports');
    if (dsEl) dsEl.textContent = p.dataset_count || 0;
    if (rpEl) rpEl.textContent = p.report_count  || 0;

    // History
    const histR = await fetch('/api/user/history');
    const histD = await histR.json();
    renderSidebarHistory(histD.history || []);

  } catch(e) {
    console.warn('loadSidebarProfile error:', e);
  }
}

function renderSidebarHistory(history) {
  const listEl = document.getElementById('spcHistList');
  const allBtn = document.getElementById('spcHistAll');
  if (!listEl) return;

  if (!history.length) {
    listEl.innerHTML = '<div class="spc-hist-empty">Belum ada riwayat</div>';
    if (allBtn) allBtn.style.display = 'none';
    return;
  }

  const preview = history.slice(0, 2);
  listEl.innerHTML = preview.map(h => `
    <div class="spc-hist-item">
      <span class="spc-hist-icon">📊</span>
      <div class="spc-hist-meta">
        <div class="spc-hist-name" title="${h.filename}">${h.filename}</div>
        <div class="spc-hist-sub">${h.rows} baris · ${h.date}</div>
      </div>
      ${h.raw_path ? `<button class="spc-hist-reload" onclick="reloadHistoryEntry('${h.id}')">↩ Load</button>` : ''}
    </div>
  `).join('');

  if (allBtn) allBtn.style.display = history.length > 2 ? 'block' : 'none';
}

async function reloadHistoryEntry(id) {
  showToast('Memuat dataset...', 'i');
  try {
    const r = await fetch(`/api/user/history/${id}/reload`, { method: 'POST' });
    const d = await r.json();
    if (d.success) {
      showToast(`${d.filename} berhasil dimuat!`, 's');
      // Reload overview
      if (typeof loadOverview === 'function') loadOverview();
      if (typeof updateSbFileInfo === 'function') updateSbFileInfo();
    } else {
      showToast(d.error || 'Gagal memuat', 'e');
    }
  } catch(e) {
    showToast('Error: ' + e.message, 'e');
  }
}

async function uploadAvatar(input) {
  const file = input.files[0];
  if (!file) return;
  const form = new FormData();
  form.append('avatar', file);
  try {
    const r = await fetch('/api/user/avatar', { method: 'POST', body: form });
    const d = await r.json();
    if (d.success) {
      showToast('Foto profil diperbarui!', 's');
      loadSidebarProfile();
    } else {
      showToast(d.error || 'Gagal upload foto', 'e');
    }
  } catch(e) {
    showToast('Error: ' + e.message, 'e');
  }
}

async function doLogout() {
  try {
    await fetch('/api/logout', { method: 'POST' });
  } catch(e) {}
  showToast('Berhasil keluar', 's');
  loadSidebarProfile();
  // Tampilkan modal login jika ada
  const loginOverlay = document.getElementById('loginOverlay') || document.getElementById('authOverlay');
  if (loginOverlay) {
    loginOverlay.style.display = 'flex';
    setTimeout(() => loginOverlay.classList.add('active'), 10);
  }
}

async function openHistoryModal() {
  const overlay = document.getElementById('histModalOverlay');
  const modal   = document.getElementById('histModal');
  const body    = document.getElementById('histModalBody');
  if (!modal) return;
  overlay.style.display = 'block';
  modal.style.display   = 'flex';
  body.innerHTML = '<div class="spc-hist-empty">Memuat...</div>';

  try {
    const r = await fetch('/api/user/history');
    const d = await r.json();
    const history = d.history || [];
    if (!history.length) {
      body.innerHTML = '<div class="spc-hist-empty">Belum ada riwayat dataset</div>';
      return;
    }
    body.innerHTML = history.map(h => `
      <div class="hist-modal-item">
        <span style="font-size:20px">📊</span>
        <div class="hist-modal-meta">
          <div class="hist-modal-name">${h.filename}</div>
          <div class="hist-modal-sub">${h.rows.toLocaleString()} baris · ${h.cols} kolom · ${h.date}</div>
        </div>
        ${h.raw_path ? `<button class="spc-hist-reload" onclick="reloadHistoryEntry('${h.id}');closeHistoryModal()">↩ Load</button>` : '<span style="font-size:9px;color:var(--textm)">File tidak tersedia</span>'}
      </div>
    `).join('');
  } catch(e) {
    body.innerHTML = '<div class="spc-hist-empty">Gagal memuat riwayat</div>';
  }
}

function closeHistoryModal() {
  document.getElementById('histModalOverlay').style.display = 'none';
  document.getElementById('histModal').style.display = 'none';
}

// Auto-load profile saat halaman siap
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(loadSidebarProfile, 500);
});

// Refresh profile setelah login/register sukses
const _origOnLoginSuccess = window.onLoginSuccess;
window.onLoginSuccess = function(user) {
  if (_origOnLoginSuccess) _origOnLoginSuccess(user);
  loadSidebarProfile();
};

/* ═══════════════════════════════════════════════════════════════ */