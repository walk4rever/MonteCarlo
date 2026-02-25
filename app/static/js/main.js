/* =============================================
   风险模拟器 — main.js
   ============================================= */

const SCENARIOS = {
    cost: {
        label: '项目成本估算',
        variables: [
            { name: '人力成本', pessimistic: 80, base: 100, optimistic: 120 },
            { name: '采购成本', pessimistic: 50, base: 60, optimistic: 75 },
            { name: '运营费用', pessimistic: 20, base: 25, optimistic: 30 },
        ]
    },
    revenue: {
        label: '销售收入预测',
        variables: [
            { name: '客单价（元）', pessimistic: 200, base: 350, optimistic: 500 },
            { name: '月销量（件）', pessimistic: 500, base: 1200, optimistic: 2000 },
        ]
    },
    investment: {
        label: '投资回报分析',
        variables: [
            { name: '年化收益率（%）', pessimistic: -5, base: 8, optimistic: 20 },
            { name: '投资年限（年）', pessimistic: 3, base: 5, optimistic: 10 },
            { name: '初始资金（万元）', pessimistic: 10, base: 20, optimistic: 50 },
        ]
    }
}

let varCount = 0

function makeVariableRow(data = {}) {
    varCount++
    const id = varCount
    const row = document.createElement('div')
    row.className = 'variable-row'
    row.dataset.id = id

    row.innerHTML = `
    <input type="text"   class="v-name"  placeholder="变量名称" value="${data.name || ''}">
    <input type="number" class="v-pess"  placeholder="最差" value="${data.pessimistic ?? ''}">
    <input type="number" class="v-base"  placeholder="最可能" value="${data.base ?? ''}">
    <input type="number" class="v-opt"   placeholder="最好" value="${data.optimistic ?? ''}">
    <button class="btn-delete" title="删除">×</button>
  `

    row.querySelector('.btn-delete').addEventListener('click', () => {
        row.style.opacity = '0'
        row.style.transform = 'translateX(12px)'
        row.style.transition = 'opacity .15s, transform .15s'
        setTimeout(() => row.remove(), 150)
    })

    return row
}

function collectVariables() {
    const rows = document.querySelectorAll('.variable-row')
    const vars = []
    let valid = true

    rows.forEach(row => {
        const nameEl = row.querySelector('.v-name')
        const pessEl = row.querySelector('.v-pess')
        const baseEl = row.querySelector('.v-base')
        const optEl = row.querySelector('.v-opt')

            ;[nameEl, pessEl, baseEl, optEl].forEach(el => el.classList.remove('invalid'))

        const name = nameEl.value.trim()
        const p = parseFloat(pessEl.value)
        const b = parseFloat(baseEl.value)
        const o = parseFloat(optEl.value)

        let rowValid = true
        if (!name) { nameEl.classList.add('invalid'); rowValid = false }
        if (isNaN(p)) { pessEl.classList.add('invalid'); rowValid = false }
        if (isNaN(b)) { baseEl.classList.add('invalid'); rowValid = false }
        if (isNaN(o)) { optEl.classList.add('invalid'); rowValid = false }
        if (rowValid && !(p <= b && b <= o)) {
            ;[pessEl, baseEl, optEl].forEach(el => el.classList.add('invalid'))
            rowValid = false
        }

        if (!rowValid) { valid = false; return }
        vars.push({ name, pessimistic: p, base: b, optimistic: o })
    })

    return valid ? vars : null
}

function formatNum(n) {
    if (Math.abs(n) >= 10000) return (n / 10000).toFixed(2) + ' 万'
    if (Math.abs(n) >= 1000) return n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    return n.toFixed(2)
}

function showError(msg) {
    const el = document.getElementById('error-msg')
    el.textContent = msg
    el.style.display = 'block'
}

function hideError() {
    document.getElementById('error-msg').style.display = 'none'
}

async function runSimulation() {
    hideError()
    const vars = collectVariables()
    if (!vars) {
        showError('请检查红色高亮的字段：变量名不能为空，且数值须满足"最差 ≤ 最可能 ≤ 最好"')
        return
    }
    if (vars.length === 0) {
        showError('请至少添加一个变量')
        return
    }

    const btn = document.getElementById('run-btn')
    const btnText = document.getElementById('run-btn-text')
    btn.disabled = true
    btnText.textContent = '模拟中…'

    try {
        const res = await fetch('/simulate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ variables: vars, num_simulations: 10000 })
        })
        const data = await res.json()

        if (data.error) {
            showError(data.error)
            return
        }

        renderResults(data, vars)
    } catch (e) {
        showError('网络错误，请稍后重试')
    } finally {
        btn.disabled = false
        btnText.textContent = '重新模拟'
    }
}

function renderResults(data, vars) {
    const { summary, histogram, sensitivity } = data
    const { p10, p50, p90 } = summary

    document.getElementById('p10-val').textContent = formatNum(p10)
    document.getElementById('p50-val').textContent = formatNum(p50)
    document.getElementById('p90-val').textContent = formatNum(p90)

    document.getElementById('conclusion-text').innerHTML =
        `模拟结果显示，有 <mark>80%</mark> 的概率结果落在 ` +
        `<mark>${formatNum(p10)}</mark> 到 <mark>${formatNum(p90)}</mark> 之间，` +
        `最可能的结果约为 <mark>${formatNum(p50)}</mark>。`

    // Histogram
    const edges = histogram.bin_edges
    const centers = edges.slice(0, -1).map((v, i) => (v + edges[i + 1]) / 2)

    const p10Idx = centers.findIndex(c => c >= p10)
    const p90Idx = centers.findIndex(c => c >= p90)

    const colors = histogram.counts.map((_, i) => {
        if (i < p10Idx) return 'rgba(220,38,38,0.55)'
        if (i > p90Idx) return 'rgba(5,150,105,0.55)'
        return 'rgba(79,70,229,0.65)'
    })

    Plotly.newPlot('histogram-plot', [{
        x: centers,
        y: histogram.counts,
        type: 'bar',
        marker: { color: colors, line: { color: 'transparent' } },
        hovertemplate: '区间中心: %{x:.2f}<br>频次: %{y}<extra></extra>'
    }], {
        margin: { t: 10, r: 10, l: 40, b: 40 },
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'transparent',
        bargap: 0.04,
        xaxis: { title: '数值', gridcolor: '#e4e7ec' },
        yaxis: { title: '频次', gridcolor: '#e4e7ec' },
        shapes: [
            {
                type: 'line', x0: p10, x1: p10, y0: 0, y1: 1, yref: 'paper',
                line: { color: '#dc2626', width: 1.5, dash: 'dot' }
            },
            {
                type: 'line', x0: p90, x1: p90, y0: 0, y1: 1, yref: 'paper',
                line: { color: '#059669', width: 1.5, dash: 'dot' }
            },
        ],
        annotations: [
            {
                x: p10, y: 1, yref: 'paper', text: 'P10', showarrow: false,
                font: { color: '#dc2626', size: 11 }, xanchor: 'right'
            },
            {
                x: p90, y: 1, yref: 'paper', text: 'P90', showarrow: false,
                font: { color: '#059669', size: 11 }, xanchor: 'left'
            },
        ]
    }, { displayModeBar: false, responsive: true })

    // Sensitivity (only when >1 variable)
    const sensitivityCard = document.getElementById('sensitivity-card')
    if (vars.length > 1 && sensitivity) {
        const sorted = Object.entries(sensitivity).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
        const names = sorted.map(e => e[0])
        const values = sorted.map(e => e[1])
        const barColors = values.map(v => v >= 0 ? 'rgba(79,70,229,0.7)' : 'rgba(220,38,38,0.7)')

        Plotly.newPlot('sensitivity-plot', [{
            y: names, x: values, type: 'bar', orientation: 'h',
            marker: { color: barColors, line: { color: 'transparent' } },
            hovertemplate: '%{y}: %{x:.3f}<extra></extra>'
        }], {
            margin: { t: 6, r: 20, l: 120, b: 40 },
            paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
            xaxis: { title: 'Spearman 相关系数', range: [-1, 1], gridcolor: '#e4e7ec', zeroline: true, zerolinecolor: '#9ca3af' },
            yaxis: { gridcolor: 'transparent' }
        }, { displayModeBar: false, responsive: true })

        sensitivityCard.style.display = 'block'
    } else {
        sensitivityCard.style.display = 'none'
    }

    const section = document.getElementById('results-section')
    section.style.display = 'block'
    section.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function loadScenario(key) {
    const scenario = SCENARIOS[key]
    if (!scenario) return

    const list = document.getElementById('variables-list')
    list.innerHTML = ''
    varCount = 0

    scenario.variables.forEach(v => list.appendChild(makeVariableRow(v)))

    // Mark active scenario card
    document.querySelectorAll('.scenario-card').forEach(c => {
        c.classList.toggle('active', c.dataset.scenario === key)
    })
}

// ===== Init =====
document.addEventListener('DOMContentLoaded', () => {
    // Scenario buttons
    document.querySelectorAll('.scenario-card').forEach(btn => {
        btn.addEventListener('click', () => loadScenario(btn.dataset.scenario))
    })

    // Add variable
    document.getElementById('add-variable-btn').addEventListener('click', () => {
        document.getElementById('variables-list').appendChild(makeVariableRow())
    })

    // Run
    document.getElementById('run-btn').addEventListener('click', runSimulation)

    // Default: load cost scenario
    loadScenario('cost')
})