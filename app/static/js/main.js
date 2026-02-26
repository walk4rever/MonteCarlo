/* =============================================
   风险模拟器 — main.js
   ============================================= */

/* ── 通用错误处理 ── */
function showError(msg) {
    const el = document.getElementById('error-msg')
    el.textContent = msg
    el.style.display = 'block'
}

function hideError() {
    document.getElementById('error-msg').style.display = 'none'
}

function formatWan(n) {
    if (Math.abs(n) >= 10000) return (n / 10000).toFixed(1) + ' 万'
    if (Math.abs(n) >= 1000) return n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    return n.toFixed(0)
}

const basePath = document.body.dataset.basePath || ''
const apiPath = (path) => basePath + path

/* ── Scenario selection ── */
const scenarios = document.querySelectorAll('.scenario-card')
let activeScenario = 'retirement'

function selectScenario(key) {
    activeScenario = key
    scenarios.forEach(c => c.classList.toggle('active', c.dataset.scenario === key))

    const retireSection = document.getElementById('retirement-section')
    const runSection = document.getElementById('run-section')
    const resultSection = document.getElementById('results-section')
    const comingSoon = document.getElementById('coming-soon-section')

    if (key === 'retirement') {
        retireSection.style.display = 'block'
        runSection.style.display = 'block'
        comingSoon.style.display = 'none'
        resultSection.style.display = 'none'
    } else {
        retireSection.style.display = 'none'
        runSection.style.display = 'none'
        resultSection.style.display = 'none'
        comingSoon.style.display = 'block'
    }
}

scenarios.forEach(btn => {
    btn.addEventListener('click', () => selectScenario(btn.dataset.scenario))
})

document.getElementById('btn-back-retirement').addEventListener('click', () => {
    selectScenario('retirement')
})

/* ── Slider wiring ── */
const sliderConfigs = [
    { id: 'r-current-age', valId: 'r-current-age-val', format: v => v },
    { id: 'r-retire-age', valId: 'r-retire-age-val', format: v => v },
    { id: 'r-life-exp', valId: 'r-life-exp-val', format: v => v },
    { id: 'r-savings', valId: 'r-savings-val', format: v => (parseFloat(v) / 10000).toFixed(0) },
    { id: 'r-monthly-save', valId: 'r-monthly-save-val', format: v => parseInt(v).toLocaleString() },
    { id: 'r-monthly-expense', valId: 'r-monthly-expense-val', format: v => parseInt(v).toLocaleString() },
    { id: 'r-return-mean', valId: 'r-return-mean-val', format: v => (parseFloat(v) * 100).toFixed(0) },
    { id: 'r-return-std', valId: 'r-return-std-val', format: v => (parseFloat(v) * 100).toFixed(0) },
    { id: 'r-inflation', valId: 'r-inflation-val', format: v => (parseFloat(v) * 100).toFixed(1) },
]

sliderConfigs.forEach(({ id, valId, format }) => {
    const slider = document.getElementById(id)
    const valEl = document.getElementById(valId)
    slider.addEventListener('input', () => {
        valEl.textContent = format(slider.value)
    })
})

/* ── Run retirement simulation ── */
async function runRetirement() {
    hideError()

    const btn = document.getElementById('run-btn')
    const btnText = document.getElementById('run-btn-text')
    btn.disabled = true
    btnText.textContent = '模拟中…'

    const params = {
        current_age: parseInt(document.getElementById('r-current-age').value),
        retire_age: parseInt(document.getElementById('r-retire-age').value),
        life_expectancy: parseInt(document.getElementById('r-life-exp').value),
        current_savings: parseFloat(document.getElementById('r-savings').value),
        monthly_savings: parseFloat(document.getElementById('r-monthly-save').value),
        monthly_expense_retire: parseFloat(document.getElementById('r-monthly-expense').value),
        return_mean: parseFloat(document.getElementById('r-return-mean').value),
        return_std: parseFloat(document.getElementById('r-return-std').value),
        inflation: parseFloat(document.getElementById('r-inflation').value),
        n: 2000,
    }

    try {
        const res = await fetch(apiPath('/simulate/retirement'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params)
        })
        const data = await res.json()

        if (data.error) {
            showError(data.error)
            btn.disabled = false
            btnText.textContent = '重新模拟'
            return
        }

        renderRetirementResults(data, params)
    } catch (e) {
        showError('网络错误：' + e.message)
    } finally {
        btn.disabled = false
        btnText.textContent = '重新模拟'
    }
}

function renderRetirementResults(data, params) {
    const section = document.getElementById('results-section')
    section.style.display = 'block'

    // -- Success rate ring animation --
    const pct = data.success_rate
    const circumference = 2 * Math.PI * 52 // r=52
    const ring = document.getElementById('ring-fg')
    const pctEl = document.getElementById('success-pct')
    const offset = circumference * (1 - pct / 100)

    // Color based on success rate
    let ringColor = '#dc2626' // bad
    if (pct >= 80) ringColor = '#059669' // good
    else if (pct >= 50) ringColor = '#d97706' // mid
    ring.style.stroke = ringColor
    ring.style.transition = 'stroke-dashoffset 1.2s ease-out, stroke 0.3s'
    ring.style.strokeDashoffset = offset

    pctEl.textContent = pct + '%'
    pctEl.style.color = ringColor

    document.getElementById('res-n').textContent = data.n_simulations.toLocaleString()
    document.getElementById('res-pct-mark').textContent = pct + '%'

    // -- Key stats --
    document.getElementById('retire-wealth-val').textContent = formatWan(data.retire_wealth_median) + ' 元'
    document.getElementById('final-p10-val').textContent = formatWan(data.final_p10) + ' 元'
    document.getElementById('final-p90-val').textContent = formatWan(data.final_p90) + ' 元'

    // -- Fan Chart --
    const t = data.time_years
    const p = data.percentiles
    const retireAge = data.retire_age

    const traces = []

    // P5-P95 band (lightest)
    traces.push({
        x: t, y: p.p95, mode: 'lines', line: { width: 0 },
        showlegend: false, hoverinfo: 'skip'
    })
    traces.push({
        x: t, y: p.p5, mode: 'lines', line: { width: 0 },
        fill: 'tonexty', fillcolor: 'rgba(79,70,229,0.08)',
        showlegend: false, hoverinfo: 'skip'
    })

    // P10-P90 band
    traces.push({
        x: t, y: p.p90, mode: 'lines', line: { width: 0 },
        showlegend: false, hoverinfo: 'skip'
    })
    traces.push({
        x: t, y: p.p10, mode: 'lines', line: { width: 0 },
        fill: 'tonexty', fillcolor: 'rgba(79,70,229,0.15)',
        showlegend: false, hoverinfo: 'skip'
    })

    // P25-P75 band
    traces.push({
        x: t, y: p.p75, mode: 'lines', line: { width: 0 },
        showlegend: false, hoverinfo: 'skip'
    })
    traces.push({
        x: t, y: p.p25, mode: 'lines', line: { width: 0 },
        fill: 'tonexty', fillcolor: 'rgba(79,70,229,0.22)',
        showlegend: false, hoverinfo: 'skip'
    })

    // P50 median line
    traces.push({
        x: t, y: p.p50, mode: 'lines',
        name: '中位数 (P50)',
        line: { color: '#4f46e5', width: 2.5 },
        hovertemplate: '%{x:.0f}岁 → %{y:,.0f}元<extra>P50</extra>'
    })

    // Sample individual paths (faded)
    data.sample_paths.slice(0, 15).forEach((path, i) => {
        traces.push({
            x: t, y: path, mode: 'lines',
            line: { color: 'rgba(139,92,246,0.12)', width: 0.8 },
            showlegend: false, hoverinfo: 'skip'
        })
    })

    // Zero line for bankruptcy
    traces.push({
        x: [t[0], t[t.length - 1]], y: [0, 0],
        mode: 'lines',
        name: '破产线',
        line: { color: '#dc2626', width: 1.5, dash: 'dot' },
        hoverinfo: 'skip'
    })

    Plotly.newPlot('fan-chart', traces, {
        margin: { t: 20, r: 20, b: 50, l: 70 },
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'transparent',
        legend: { orientation: 'h', y: 1.1, x: 0, font: { size: 12 } },
        xaxis: {
            title: '年龄',
            gridcolor: '#e4e7ec',
            range: [t[0], t[t.length - 1]]
        },
        yaxis: {
            title: '财富（元）',
            gridcolor: '#e4e7ec',
            rangemode: 'tozero',
            tickformat: ',.0f'
        },
        shapes: [{
            type: 'line',
            x0: retireAge, x1: retireAge,
            y0: 0, y1: 1, yref: 'paper',
            line: { color: '#f59e0b', width: 1.5, dash: 'dash' }
        }],
        annotations: [{
            x: retireAge, y: 1, yref: 'paper',
            text: '退休',
            showarrow: false,
            font: { color: '#92400e', size: 11 },
            xanchor: 'left', xshift: 4
        }]
    }, { displayModeBar: false, responsive: true })

    // -- Final distribution histogram --
    const dist = data.final_distribution
    const centers = dist.edges.slice(0, -1).map((v, i) => (v + dist.edges[i + 1]) / 2)

    Plotly.newPlot('final-dist-chart', [{
        x: centers,
        y: dist.counts,
        type: 'bar',
        marker: {
            color: centers.map(c => c <= 0 ? 'rgba(220,38,38,0.6)' : 'rgba(79,70,229,0.6)'),
            line: { color: 'transparent' }
        },
        hovertemplate: '终值约 %{x:,.0f} 元：%{y} 次<extra></extra>'
    }], {
        margin: { t: 10, r: 20, b: 50, l: 70 },
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'transparent',
        bargap: 0.05,
        xaxis: { title: '最终财富（元）', gridcolor: '#e4e7ec', tickformat: ',.0f' },
        yaxis: { title: '频次', gridcolor: '#e4e7ec' },
        shapes: [{
            type: 'line',
            x0: 0, x1: 0, y0: 0, y1: 1, yref: 'paper',
            line: { color: '#dc2626', width: 2, dash: 'dot' }
        }],
        annotations: [{
            x: 0, y: 1, yref: 'paper',
            text: '破产线',
            showarrow: false,
            font: { color: '#dc2626', size: 11 },
            xanchor: 'right', xshift: -4
        }]
    }, { displayModeBar: false, responsive: true })

    // Scroll to results
    section.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

/* ── Init ── */
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('run-btn').addEventListener('click', runRetirement)
    selectScenario('retirement')
})
