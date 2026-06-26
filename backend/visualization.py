"""
FILE    : backend/visualization.py
KEGUNAAN: Generate semua chart otomatis menggunakan Plotly.
          Mengembalikan JSON plotly figure untuk di-render di frontend.
          Support: Numerical Univariate, Categorical Univariate,
          Bivariate, Multivariate, Categorical vs Numerical, Time Series.

STANDAR INTERNASIONAL:
  - Pie chart: max 5 kategori + "Others" (Cleveland & McGill 1984)
  - Bar chart: zero baseline, sorted descending (Tufte 1983)
  - Color palette: ColorBrewer Set2 (colorblind-friendly)
  - Gridlines: Y-axis only, light (#E2E8F0)
  - Axis labels: selalu disertakan
  - Margin: l=60, r=20, t=40, b=50 (cukup untuk label)
  - Font: sans-serif, 11pt
"""

import pandas as pd
import numpy as np
import json, logging

logger = logging.getLogger(__name__)

def _fig_to_json(fig):
    import plotly
    return json.loads(plotly.io.to_json(fig))

def _to_list(series_or_array):
    if hasattr(series_or_array, 'tolist'):
        return series_or_array.tolist()
    return list(series_or_array)

# Multicolor vibrant palette — soft, colorful, distinguishable
COLORS = ["#A8D8EA","#FFB3C1","#B5EAD7","#FFDAC1","#C7CEEA","#F2C6DE","#FFFACD","#B8E0D2"]
# Single color untuk numerical charts (soft coral-teal)
COLOR_NUM = "#A8D8EA"
COLOR_ACCENT = "#FFB3C1"
COLOR_GRID = "#E2E8F0"

AXIS_STYLE = dict(
    gridcolor=COLOR_GRID,
    showgrid=True,
    zerolinecolor=COLOR_GRID,
    tickfont=dict(size=10, color="#64748B"),
    title=dict(standoff=10, font=dict(size=11, color="#334155")),
)

def _base_layout(title="", height=280, xlabel="", ylabel=""):
    xaxis = dict(
        title=dict(text=xlabel, font=dict(size=11, color="#334155")),
        gridcolor=COLOR_GRID,
        showgrid=False,
        zerolinecolor=COLOR_GRID,
        tickfont=dict(size=10, color="#64748B"),
    )
    yaxis = dict(
        title=dict(text=ylabel, font=dict(size=11, color="#334155")),
        gridcolor=COLOR_GRID,
        showgrid=True,
        zerolinecolor=COLOR_GRID,
        tickfont=dict(size=10, color="#64748B"),
    )
    return dict(
        title=dict(text=title, font=dict(size=12, color="#1E293B"), x=0.02, pad=dict(t=8)),
        height=height,
        margin=dict(l=60, r=20, t=40, b=50),
        plot_bgcolor="rgba(0,0,0,0)",
        paper_bgcolor="rgba(0,0,0,0)",
        font=dict(family="Inter, Segoe UI, Arial, sans-serif", size=11, color="#334155"),
        xaxis=xaxis,
        yaxis=yaxis,
        showlegend=False,
    )

# ── NUMERICAL UNIVARIATE ──────────────────────────────────────

def histogram(df, col):
    import plotly.graph_objects as go
    s = df[col].dropna()
    fig = go.Figure(go.Histogram(
        x=_to_list(s), nbinsx=20,
        marker_color=COLOR_NUM,
        marker_line=dict(color="#FFFFFF", width=0.5)
    ))
    fig.update_layout(**_base_layout(f"Histogram — {col}", xlabel=col, ylabel="Frekuensi"))
    return _fig_to_json(fig)

def boxplot(df, col):
    import plotly.graph_objects as go
    s = df[col].dropna()
    fig = go.Figure(go.Box(
        y=_to_list(s), marker_color=COLOR_NUM,
        line_color=COLOR_NUM, name=col,
        boxmean=True
    ))
    fig.update_layout(**_base_layout(f"Boxplot — {col}", ylabel=col))
    fig.update_yaxes(showgrid=True, gridcolor=COLOR_GRID)
    return _fig_to_json(fig)

def density_plot(df, col):
    import plotly.graph_objects as go
    from scipy.stats import gaussian_kde
    s = df[col].dropna().values
    if len(s) < 3: return None
    kde = gaussian_kde(s)
    x = np.linspace(s.min(), s.max(), 200)
    fig = go.Figure(go.Scatter(
        x=_to_list(x), y=_to_list(kde(x)),
        fill='tozeroy', line=dict(color=COLOR_NUM, width=2),
        fillcolor="rgba(168,216,234,0.25)"
    ))
    fig.update_layout(**_base_layout(f"Density — {col}", xlabel=col, ylabel="Density"))
    return _fig_to_json(fig)

def qq_plot(df, col):
    import plotly.graph_objects as go
    from scipy import stats
    s = df[col].dropna().values
    if len(s) < 4: return None
    (osm, osr), (slope, intercept, _) = stats.probplot(s)
    line_y = [slope*x+intercept for x in osm]
    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=_to_list(osm), y=_to_list(osr),
        mode='markers', marker=dict(color=COLOR_NUM, size=5)
    ))
    fig.add_trace(go.Scatter(
        x=_to_list(osm), y=_to_list(line_y),
        mode='lines', line=dict(color=COLOR_ACCENT, width=1.5, dash='dash')
    ))
    fig.update_layout(**_base_layout(f"QQ Plot — {col}", xlabel="Theoretical Quantiles", ylabel="Sample Quantiles"))
    return _fig_to_json(fig)

def violin_plot(df, col):
    import plotly.graph_objects as go
    s = df[col].dropna()
    fig = go.Figure(go.Violin(
        y=_to_list(s), box_visible=True,
        line_color=COLOR_NUM, fillcolor="rgba(168,216,234,0.3)",
        name=col, meanline_visible=True
    ))
    fig.update_layout(**_base_layout(f"Violin — {col}", ylabel=col))
    return _fig_to_json(fig)

# ── CATEGORICAL UNIVARIATE ────────────────────────────────────

def bar_chart(df, col, top_n=10):
    import plotly.graph_objects as go
    vc = df[col].value_counts().head(top_n)
    colors = COLORS[:len(vc)]
    fig = go.Figure(go.Bar(
        x=vc.index.tolist(), y=vc.values.tolist(),
        marker_color=colors, marker_line=dict(color="#FFFFFF", width=0.5)
    ))
    max_y = vc.max() * 1.1
    fig.update_layout(**_base_layout(f"Bar Chart — {col}", xlabel=col, ylabel="Count"))
    fig.update_yaxes(range=[0, max_y])
    return _fig_to_json(fig)

def pie_chart(df, col, max_categories=5):
    import plotly.graph_objects as go
    vc = df[col].value_counts()
    top = vc.head(max_categories)
    if len(vc) > max_categories:
        others_sum = vc.iloc[max_categories:].sum()
        top = pd.concat([top, pd.Series({"Others": others_sum})])
    labels = top.index.tolist()
    values = top.values.tolist()
    colors = COLORS[:len(labels)]
    fig = go.Figure(go.Pie(
        labels=labels, values=values,
        marker=dict(colors=colors),
        hole=0.35, textinfo='percent+label',
        textfont_size=11, sort=False,
        direction='clockwise', rotation=90,
        pull=[0.05] + [0]*(len(labels)-1) if len(labels) > 0 else None
    ))
    layout = _base_layout(f"Pie — {col}", height=300)
    layout["margin"]["r"] = 100
    fig.update_layout(**layout)
    fig.update_layout(showlegend=False)
    return _fig_to_json(fig)

def count_plot(df, col, top_n=10):
    import plotly.graph_objects as go
    vc = df[col].value_counts().head(top_n)
    fig = go.Figure(go.Bar(
        y=vc.index.tolist(), x=vc.values.tolist(),
        orientation='h', marker_color=COLOR_NUM,
        marker_line=dict(color="#FFFFFF", width=0.5)
    ))
    max_x = vc.max() * 1.1
    fig.update_layout(**_base_layout(f"Count Plot — {col}", xlabel="Count", ylabel=col))
    fig.update_xaxes(range=[0, max_x])
    return _fig_to_json(fig)

def pareto_chart(df, col, top_n=10):
    import plotly.graph_objects as go
    vc = df[col].value_counts().head(top_n)
    cum_pct = (vc.cumsum() / vc.sum() * 100).values
    fig = go.Figure()
    fig.add_trace(go.Bar(
        x=vc.index.tolist(), y=vc.values.tolist(),
        marker_color=COLOR_NUM, name='Count', yaxis='y'
    ))
    fig.add_trace(go.Scatter(
        x=vc.index.tolist(), y=cum_pct.tolist(),
        mode='lines+markers', line=dict(color=COLOR_ACCENT, width=2),
        marker=dict(size=6, color=COLOR_ACCENT), name='Cumulative %', yaxis='y2'
    ))
    layout = _base_layout(f"Pareto — {col}", xlabel=col, ylabel="Count")
    layout['yaxis2'] = dict(
        overlaying='y', side='right', range=[0, 110],
        ticksuffix='%', showgrid=False,
        tickfont=dict(size=9, color=COLOR_ACCENT),
        title=dict(text="Cumulative %", font=dict(size=10, color=COLOR_ACCENT))
    )
    layout['showlegend'] = False
    fig.update_layout(**layout)
    fig.update_yaxes(range=[0, vc.max() * 1.15])
    return _fig_to_json(fig)

# ── BIVARIATE / MULTIVARIATE ──────────────────────────────────

def scatter_plot(df, col_x, col_y):
    import plotly.graph_objects as go
    d = df[[col_x, col_y]].dropna()
    fig = go.Figure(go.Scatter(
        x=_to_list(d[col_x]), y=_to_list(d[col_y]),
        mode='markers', marker=dict(color=COLOR_NUM, size=5, opacity=0.55)
    ))
    fig.update_layout(**_base_layout(f"Scatter — {col_x} vs {col_y}", xlabel=col_x, ylabel=col_y))
    return _fig_to_json(fig)

def correlation_heatmap(df, num_cols):
    import plotly.graph_objects as go
    cols = [c for c in num_cols if c in df.columns][:10]
    if len(cols) < 2: return None
    corr = df[cols].corr().round(2)
    fig = go.Figure(go.Heatmap(
        z=corr.values.tolist(), x=list(cols), y=list(cols),
        colorscale=[[0, "#E2E8F0"], [0.5, "#B5EAD7"], [1, "#0D9488"]],
        zmin=-1, zmax=1, text=corr.values.round(2).tolist(),
        texttemplate="%{text}", textfont_size=10,
        hoverongaps=False
    ))
    fig.update_layout(**_base_layout("Correlation Heatmap", height=320))
    fig.update_xaxes(tickangle=45)
    return _fig_to_json(fig)

def regression_plot(df, col_x, col_y):
    import plotly.graph_objects as go
    d = df[[col_x, col_y]].dropna()
    x, y = d[col_x].values, d[col_y].values
    coef = np.polyfit(x, y, 1)
    x_line = np.linspace(x.min(), x.max(), 100)
    y_line = np.polyval(coef, x_line)
    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=_to_list(x), y=_to_list(y),
        mode='markers', marker=dict(color=COLOR_NUM, size=5, opacity=0.5),
        name='Data'
    ))
    fig.add_trace(go.Scatter(
        x=_to_list(x_line), y=_to_list(y_line),
        mode='lines', line=dict(color=COLOR_ACCENT, width=2.5),
        name=f'R² = {np.corrcoef(x, y)[0,1]**2:.3f}'
    ))
    layout = _base_layout(f"Regression — {col_x} vs {col_y}", xlabel=col_x, ylabel=col_y)
    layout['showlegend'] = False
    fig.update_layout(**layout)
    return _fig_to_json(fig)

def bubble_chart(df, col_x, col_y, col_size):
    import plotly.graph_objects as go
    d = df[[col_x, col_y, col_size]].dropna()
    smin, smax = d[col_size].min(), d[col_size].max()
    sizes = ((d[col_size] - smin) / max(smax - smin, 1) * 40 + 8).tolist()
    fig = go.Figure(go.Scatter(
        x=_to_list(d[col_x]), y=_to_list(d[col_y]),
        mode='markers',
        marker=dict(
            size=_to_list(sizes), color=_to_list(d[col_size]),
            colorscale='Viridis', opacity=0.7, showscale=True,
            line=dict(width=0.5, color='rgba(0,0,0,0.2)')
        ),
        text=_to_list(d[col_size]), hoverinfo='text+x+y'
    ))
    fig.update_layout(**_base_layout(f"Bubble — {col_x} / {col_y} / {col_size}", xlabel=col_x, ylabel=col_y))
    return _fig_to_json(fig)

def pair_plot_matrix(df, num_cols):
    import plotly.graph_objects as go
    cols = [c for c in num_cols if c in df.columns][:4]
    if len(cols) < 2: return None
    from plotly.figure_factory import create_scatterplotmatrix
    d = df[cols].dropna().head(300)
    fig = create_scatterplotmatrix(d, diag='histogram', index=cols[0], colormap=COLORS[0], height=350, width=None)
    fig.update_layout(**_base_layout("Pair Plot Matrix", height=350))
    return _fig_to_json(fig)

# ── CATEGORICAL VS NUMERICAL ──────────────────────────────────

def boxplot_by_category(df, cat_col, num_col, top_n=6):
    import plotly.graph_objects as go
    top_cats = df[cat_col].value_counts().head(top_n).index.tolist()
    fig = go.Figure()
    for i, cat in enumerate(top_cats):
        vals = df[df[cat_col] == cat][num_col].dropna()
        fig.add_trace(go.Box(
            y=_to_list(vals), name=str(cat),
            marker_color=COLORS[i % len(COLORS)],
            line_color=COLORS[i % len(COLORS)]
        ))
    layout = _base_layout(f"Boxplot — {num_col} by {cat_col}", height=280, ylabel=num_col, xlabel=cat_col)
    layout['showlegend'] = False
    fig.update_layout(**layout)
    return _fig_to_json(fig)

def violin_by_category(df, cat_col, num_col, top_n=5):
    import plotly.graph_objects as go
    top_cats = df[cat_col].value_counts().head(top_n).index.tolist()
    fig = go.Figure()
    for i, cat in enumerate(top_cats):
        vals = df[df[cat_col] == cat][num_col].dropna()
        c = COLORS[i % len(COLORS)]
        fig.add_trace(go.Violin(
            y=_to_list(vals), name=str(cat),
            box_visible=True, line_color=c,
            fillcolor=f'rgba({int(c[1:3],16)},{int(c[3:5],16)},{int(c[5:7],16)},0.25)',
            meanline_visible=True
        ))
    layout = _base_layout(f"Violin — {num_col} by {cat_col}", height=280, ylabel=num_col, xlabel=cat_col)
    layout['showlegend'] = False
    fig.update_layout(**layout)
    return _fig_to_json(fig)

def grouped_bar_chart(df, cat_col, num_cols_list, top_n=6):
    import plotly.graph_objects as go
    top_cats = df[cat_col].value_counts().head(top_n).index.tolist()
    fig = go.Figure()
    for i, nc in enumerate(num_cols_list[:4]):
        vals = [df[df[cat_col] == cat][nc].mean() for cat in top_cats]
        fig.add_trace(go.Bar(
            name=nc, x=top_cats, y=vals,
            marker_color=COLORS[i % len(COLORS)]
        ))
    layout = _base_layout(f"Grouped Bar — {cat_col}", xlabel=cat_col, ylabel="Mean")
    layout['showlegend'] = False
    fig.update_layout(**layout, barmode='group')
    fig.update_yaxes(range=[0, max([max(t.y) for t in fig.data if hasattr(t, 'y') and len(t.y) > 0]) * 1.15] if any(hasattr(t, 'y') and len(t.y) > 0 for t in fig.data) else None)
    return _fig_to_json(fig)

def strip_plot(df, cat_col, num_col, top_n=5):
    import plotly.graph_objects as go
    top_cats = df[cat_col].value_counts().head(top_n).index.tolist()
    fig = go.Figure()
    for i, cat in enumerate(top_cats):
        vals_all = df[df[cat_col] == cat][num_col].dropna()
        vals = vals_all.sample(min(50, len(vals_all)), random_state=42)
        fig.add_trace(go.Scatter(
            x=[str(cat)] * len(vals), y=_to_list(vals),
            mode='markers',
            marker=dict(color=COLORS[i % len(COLORS)], size=5, opacity=0.6),
            name=str(cat)
        ))
    layout = _base_layout(f"Strip — {num_col} by {cat_col}", height=280, ylabel=num_col, xlabel=cat_col)
    layout['showlegend'] = False
    fig.update_layout(**layout)
    return _fig_to_json(fig)

# ── TIME SERIES ───────────────────────────────────────────────

def _prepare_ts(df, date_col, val_col):
    d = df[[date_col, val_col]].dropna().copy()
    d[date_col] = pd.to_datetime(d[date_col], errors='coerce')
    d = d.dropna().sort_values(date_col)
    if d[date_col].dt.to_period('M').nunique() >= len(d) * 0.8:
        return d, date_col, val_col
    monthly = d.groupby(d[date_col].dt.to_period('M'))[val_col].mean().reset_index()
    monthly[date_col] = monthly[date_col].dt.to_timestamp()
    return monthly, date_col, val_col

def timeseries_line(df, date_col, val_col):
    import plotly.graph_objects as go
    monthly, dc, vc = _prepare_ts(df, date_col, val_col)
    fig = go.Figure(go.Scatter(
        x=_to_list(monthly[dc].astype(str)), y=_to_list(monthly[vc]),
        fill='tozeroy', line=dict(color=COLOR_NUM, width=2),
        fillcolor="rgba(168,216,234,0.15)"
    ))
    fig.update_layout(**_base_layout(f"Time Series — {vc}", height=270, xlabel=date_col, ylabel=vc))
    return _fig_to_json(fig)

def moving_average(df, date_col, val_col, window=7):
    import plotly.graph_objects as go
    monthly, dc, vc = _prepare_ts(df, date_col, val_col)
    monthly['ma'] = monthly[vc].rolling(window=min(window, len(monthly))).mean()
    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=_to_list(monthly[dc].astype(str)), y=_to_list(monthly[vc]),
        name='Actual', line=dict(color="rgba(13,148,136,0.25)", width=1)
    ))
    fig.add_trace(go.Scatter(
        x=_to_list(monthly[dc].astype(str)), y=_to_list(monthly['ma']),
        name=f'MA-{window}', line=dict(color="#0D9488", width=2)
    ))
    layout = _base_layout(f"Moving Average ({window}-period)", height=270, xlabel=date_col, ylabel=vc)
    layout['showlegend'] = True
    layout['legend'] = dict(font=dict(size=9), x=0.02, y=0.98)
    fig.update_layout(**layout)
    return _fig_to_json(fig)

def rolling_mean(df, date_col, val_col, window=30):
    import plotly.graph_objects as go
    monthly, dc, vc = _prepare_ts(df, date_col, val_col)
    monthly['roll'] = monthly[vc].rolling(window=min(window, len(monthly))).mean()
    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=_to_list(monthly[dc].astype(str)), y=_to_list(monthly[vc]),
        name='Actual', line=dict(color="rgba(13,148,136,0.2)", width=1)
    ))
    fig.add_trace(go.Scatter(
        x=_to_list(monthly[dc].astype(str)), y=_to_list(monthly['roll']),
        name=f'Rolling-{window}', line=dict(color="#818CF8", width=2.5)
    ))
    layout = _base_layout(f"Rolling Mean ({window}-period)", height=270, xlabel=date_col, ylabel=vc)
    layout['showlegend'] = True
    layout['legend'] = dict(font=dict(size=9), x=0.02, y=0.98)
    fig.update_layout(**layout)
    return _fig_to_json(fig)

def trend_line(df, date_col, val_col):
    import plotly.graph_objects as go
    monthly, dc, vc = _prepare_ts(df, date_col, val_col)
    x_num = np.arange(len(monthly))
    y_vals = monthly[vc].values
    if len(x_num) < 2:
        trend = y_vals
    else:
        coef = np.polyfit(x_num, y_vals, 1)
        trend = np.polyval(coef, x_num)
    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=_to_list(monthly[dc].astype(str)), y=_to_list(y_vals),
        name='Actual', line=dict(color=COLOR_NUM, width=1.5)
    ))
    fig.add_trace(go.Scatter(
        x=_to_list(monthly[dc].astype(str)), y=_to_list(trend),
        name='Trend', line=dict(color=COLOR_ACCENT, width=2.5, dash='dash')
    ))
    layout = _base_layout(f"Trend Line — {vc}", height=270, xlabel=date_col, ylabel=vc)
    layout['showlegend'] = True
    layout['legend'] = dict(font=dict(size=9), x=0.02, y=0.98)
    fig.update_layout(**layout)
    return _fig_to_json(fig)

def _safe(fn, name="chart", *args, **kwargs):
    try:
        return fn(*args, **kwargs)
    except Exception as e:
        logger.warning(f"Chart '{name}' gagal: {e}")
        return None

# ── GENERATE CHARTS FOR ONE COLUMN ────────────────────────────

def generate_charts_for_column(df, col_name, col_meta):
    """Generate semua chart yang relevan untuk satu kolom tertentu."""
    scale = col_meta.get(col_name, 'nominal')
    charts = {}

    if scale in ('ratio', 'interval'):
        charts['histogram'] = _safe(histogram, f"hist_{col_name}", df, col_name)
        charts['boxplot'] = _safe(boxplot, f"box_{col_name}", df, col_name)
        charts['density'] = _safe(density_plot, f"density_{col_name}", df, col_name)
        charts['qq_plot'] = _safe(qq_plot, f"qq_{col_name}", df, col_name)
        charts['violin'] = _safe(violin_plot, f"violin_{col_name}", df, col_name)
    elif scale in ('nominal', 'ordinal', 'boolean'):
        charts['bar_chart'] = _safe(bar_chart, f"bar_{col_name}", df, col_name)
        charts['pie_chart'] = _safe(pie_chart, f"pie_{col_name}", df, col_name)
        charts['count_plot'] = _safe(count_plot, f"count_{col_name}", df, col_name)
        charts['pareto_chart'] = _safe(pareto_chart, f"pareto_{col_name}", df, col_name)

    return charts

# ── MASTER FUNCTION ───────────────────────────────────────────
def generate_all_charts(df, col_meta):
    num_cols = [c for c,v in col_meta.items() if v in ('interval','ratio') and c in df.columns]
    if not num_cols:
        num_cols = df.select_dtypes(include='number').columns.tolist()
    cat_cols = [c for c,v in col_meta.items() if v in ('nominal','ordinal') and c in df.columns]
    if not cat_cols:
        cat_cols = df.select_dtypes(include=['object','category']).columns.tolist()
    dt_cols  = [c for c,v in col_meta.items() if v == 'datetime' and c in df.columns]
    result   = {}

    # ── BACKWARD COMPAT: chart untuk kolom pertama ──
    if num_cols:
        col = num_cols[0]
        result['histogram']    = _safe(histogram, f"hist_{col}", df, col)
        result['boxplot']      = _safe(boxplot, f"box_{col}", df, col)
        result['density']      = _safe(density_plot, f"density_{col}", df, col)
        result['qq_plot']      = _safe(qq_plot, f"qq_{col}", df, col)
        result['violin']       = _safe(violin_plot, f"violin_{col}", df, col)
        result['num_col']      = col
        result['num_cols']     = num_cols

    if cat_cols:
        col = cat_cols[0]
        result['bar_chart']    = _safe(bar_chart, f"bar_{col}", df, col)
        result['pie_chart']    = _safe(pie_chart, f"pie_{col}", df, col)
        result['count_plot']   = _safe(count_plot, f"count_{col}", df, col)
        result['pareto_chart'] = _safe(pareto_chart, f"pareto_{col}", df, col)
        result['cat_col']      = col
        result['cat_cols']     = cat_cols

    # Bivariate
    if len(num_cols) >= 2:
        result['scatter']      = _safe(scatter_plot, "scatter", df, num_cols[0], num_cols[1])
        result['regression']   = _safe(regression_plot, "regression", df, num_cols[0], num_cols[1])
        result['corr_heatmap'] = _safe(correlation_heatmap, "heatmap", df, num_cols)
    if len(num_cols) >= 3:
        result['bubble']       = _safe(bubble_chart, "bubble", df, num_cols[0], num_cols[1], num_cols[2])

    # Cat vs Num
    if cat_cols and num_cols:
        result['boxplot_cat']  = _safe(boxplot_by_category, "box_cat", df, cat_cols[0], num_cols[0])
        result['violin_cat']   = _safe(violin_by_category, "violin_cat", df, cat_cols[0], num_cols[0])
        result['grouped_bar']  = _safe(grouped_bar_chart, "grouped_bar", df, cat_cols[0], num_cols[:3])
        result['strip_plot']   = _safe(strip_plot, "strip", df, cat_cols[0], num_cols[0])

    # Time Series
    if dt_cols and num_cols:
        dc = dt_cols[0]; vc = num_cols[0]
        result['ts_line']      = _safe(timeseries_line, "ts_line", df, dc, vc)
        result['ts_ma']        = _safe(moving_average, "ts_ma", df, dc, vc, 7)
        result['ts_rolling']   = _safe(rolling_mean, "ts_rolling", df, dc, vc, 30)
        result['ts_trend']     = _safe(trend_line, "ts_trend", df, dc, vc)
        result['date_col']     = dc
        result['val_col']      = vc

    # ── BARU: chart untuk SEMUA kolom ──
    result['charts_by_column'] = {}
    for col in num_cols:
        result['charts_by_column'][col] = generate_charts_for_column(df, col, col_meta)
    for col in cat_cols:
        result['charts_by_column'][col] = generate_charts_for_column(df, col, col_meta)

    # Buang entry chart yang gagal (None)
    chart_keys_failed = [k for k, v in result.items()
                          if v is None and not k.endswith('_col') and not k.endswith('_cols') and not k == 'charts_by_column']
    for k in chart_keys_failed:
        del result[k]

    return result