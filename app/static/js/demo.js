/* =====================================================
   概率悖论演示层 — demo.js
   ===================================================== */

/* ── Tab navigation ── */
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const target = btn.dataset.tab
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'))
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'))
        btn.classList.add('active')
        document.getElementById('tab-' + target).classList.add('active')
    })
})

/* =====================================
   🚪 MONTY HALL
   ===================================== */
let montyTotal = 0, montyStay = 0, montySwitch = 0

function animateDoors(carDoor, pickedDoor, revealedDoor) {
    // Reset
    for (let i = 0; i < 3; i++) {
        const wrap = document.getElementById('door-' + i)
        const face = document.getElementById('door-face-' + i)
        const back = document.getElementById('door-reveal-' + i)
        wrap.className = 'door-wrap'
        face.className = 'door'
        back.textContent = ''
    }

    const status = document.getElementById('door-status')

    // Step 1: show player pick
    document.getElementById('door-' + pickedDoor).classList.add('selected')
    status.textContent = `你选了门 ${pickedDoor + 1}`

    setTimeout(() => {
        // Step 2: host reveals a goat
        const revealEl = document.getElementById('door-reveal-' + revealedDoor)
        revealEl.textContent = '🐐'
        document.getElementById('door-face-' + revealedDoor).classList.add('open')
        document.getElementById('door-' + revealedDoor).classList.add('revealed')
        status.textContent = `主持人打开了门 ${revealedDoor + 1}（山羊！）`
    }, 600)

    setTimeout(() => {
        // Step 3: reveal all doors
        for (let i = 0; i < 3; i++) {
            const back = document.getElementById('door-reveal-' + i)
            back.textContent = i === carDoor ? '🚗' : '🐐'
            document.getElementById('door-face-' + i).classList.add('open')
        }
        const switchDoor = [0, 1, 2].find(d => d !== pickedDoor && d !== revealedDoor)
        const switchWins = switchDoor === carDoor
        status.textContent = switchWins
            ? `换门赢！🎉 门 ${switchDoor + 1} 是车`
            : `不换赢！🎉 门 ${pickedDoor + 1} 是车`
    }, 1400)
}

function updateMontyBars() {
    const stayRate = montyTotal ? (montyStay / montyTotal * 100) : 0
    const switchRate = montyTotal ? (montySwitch / montyTotal * 100) : 0

    document.getElementById('stay-fill').style.width = stayRate + '%'
    document.getElementById('switch-fill').style.width = switchRate + '%'
    document.getElementById('stay-pct').textContent = stayRate.toFixed(1) + '%'
    document.getElementById('switch-pct').textContent = switchRate.toFixed(1) + '%'
    document.getElementById('monty-count').textContent = `累计模拟 ${montyTotal.toLocaleString()} 次`
    document.getElementById('monty-bars').style.display = 'block'
}

document.querySelectorAll('[data-demo="monty"]').forEach(btn => {
    if (btn.classList.contains('btn-sim')) {
        btn.addEventListener('click', async () => {
            const n = parseInt(btn.dataset.n)
            btn.disabled = true

            // Play one door animation first (using random values)
            const car = Math.floor(Math.random() * 3)
            const pick = Math.floor(Math.random() * 3)
            const options = [0, 1, 2].filter(d => d !== car && d !== pick)
            const reveal = options[Math.floor(Math.random() * options.length)] ?? [0, 1, 2].find(d => d !== pick)
            animateDoors(car, pick, reveal)

            // Then run batch simulation
            setTimeout(async () => {
                const res = await fetch('/demo/monty-hall', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ n })
                })
                const data = await res.json()
                montyTotal += data.n
                montyStay += data.stay_wins
                montySwitch += data.switch_wins
                updateMontyBars()
                btn.disabled = false
            }, 1800)
        })
    }

    if (btn.classList.contains('btn-reset')) {
        btn.addEventListener('click', () => {
            montyTotal = montyStay = montySwitch = 0
            for (let i = 0; i < 3; i++) {
                document.getElementById('door-' + i).className = 'door-wrap'
                document.getElementById('door-face-' + i).className = 'door'
                document.getElementById('door-reveal-' + i).textContent = ''
            }
            document.getElementById('door-status').textContent = '点击下方按钮，开始模拟'
            document.getElementById('monty-bars').style.display = 'none'
        })
    }
})

/* =====================================
   🎂 BIRTHDAY PARADOX
   ===================================== */
let birthdayCurve = null

const groupSlider = document.getElementById('group-slider')
const groupSizeVal = document.getElementById('group-size-val')
const birthdayProbNum = document.getElementById('birthday-prob-num')

function highlightBirthdayPoint(size) {
    if (!birthdayCurve) return
    const idx = size - 2
    const prob = birthdayCurve[idx]?.probability ?? 0
    birthdayProbNum.textContent = prob.toFixed(1) + '%'

    const colors = birthdayCurve.map((d, i) =>
        i === idx ? '#4f46e5' : (d.size === 23 ? '#f59e0b' : 'rgba(79,70,229,0.5)')
    )

    Plotly.restyle('birthday-chart', { 'marker.color': [colors] }, 0)
}

groupSlider.addEventListener('input', () => {
    const size = parseInt(groupSlider.value)
    groupSizeVal.textContent = size
    highlightBirthdayPoint(size)
})

document.getElementById('birthday-run-btn').addEventListener('click', async () => {
    const btn = document.getElementById('birthday-run-btn')
    btn.disabled = true
    btn.textContent = '模拟中…'
    document.getElementById('birthday-loading').style.display = 'block'

    const res = await fetch('/demo/birthday', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ max_group: 60, trials: 5000, sample_size: 30 })
    })
    const data = await res.json()
    birthdayCurve = data.curve
    document.getElementById('birthday-loading').style.display = 'none'

    const sizes = data.curve.map(d => d.size)
    const probs = data.curve.map(d => d.probability)
    const colors = data.curve.map(d =>
        d.size === 23 ? '#f59e0b' : 'rgba(79,70,229,0.6)'
    )

    Plotly.newPlot('birthday-chart', [{
        x: sizes, y: probs,
        type: 'scatter', mode: 'lines+markers',
        line: { color: '#4f46e5', width: 2.5 },
        marker: { color: colors, size: 7 },
        hovertemplate: '%{x} 人 → 概率 %{y:.1f}%<extra></extra>'
    }, {
        x: [23], y: [data.curve[21]?.probability ?? 50.7],
        type: 'scatter', mode: 'markers+text',
        marker: { color: '#f59e0b', size: 14, symbol: 'star' },
        text: ['✦ 23人 ≈ 50%'],
        textposition: 'top right',
        textfont: { size: 12, color: '#92400e', family: 'Inter' },
        hoverinfo: 'skip',
        showlegend: false
    }], {
        margin: { t: 10, r: 20, b: 50, l: 50 },
        paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
        xaxis: { title: '房间人数', gridcolor: '#e4e7ec', range: [2, 62] },
        yaxis: { title: '至少两人同天生日的概率 (%)', gridcolor: '#e4e7ec', range: [0, 105] },
        shapes: [{
            type: 'line', x0: 2, x1: 62, y0: 50, y1: 50,
            line: { color: '#9ca3af', width: 1, dash: 'dot' }
        }]
    }, { displayModeBar: false, responsive: true })

    highlightBirthdayPoint(parseInt(groupSlider.value))

    // Sample visualization
    const sample = data.sample
    const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
    const dayOfYear = n => {
        const monthDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
        let rem = n
        for (let m = 0; m < 12; m++) {
            if (rem < monthDays[m]) return `${months[m]}${rem + 1}日`
            rem -= monthDays[m]
        }
        return `12月31日`
    }

    // Find duplicates
    const seen = {}
    const dupes = new Set()
    sample.forEach(d => {
        if (seen[d] !== undefined) dupes.add(d)
        seen[d] = true
    })

    const dotsEl = document.getElementById('birthday-dots')
    dotsEl.innerHTML = ''
    sample.forEach(d => {
        const span = document.createElement('span')
        span.className = 'bday-dot' + (dupes.has(d) ? ' match' : '')
        span.textContent = dayOfYear(d)
        dotsEl.appendChild(span)
    })

    const matchEl = document.getElementById('birthday-match-text')
    if (dupes.size > 0) {
        matchEl.textContent = `找到了 ${dupes.size} 个重叠生日！🎉`
    } else {
        matchEl.textContent = '这次没有重叠，但概率依然存在。'
    }

    document.getElementById('birthday-sample-wrap').style.display = 'block'

    btn.textContent = '重新模拟'
    btn.disabled = false
})

document.querySelectorAll('[data-demo="birthday"]').forEach(btn => {
    if (btn.classList.contains('btn-reset')) {
        btn.addEventListener('click', () => {
            birthdayCurve = null
            Plotly.purge('birthday-chart')
            document.getElementById('birthday-sample-wrap').style.display = 'none'
            document.getElementById('birthday-prob-num').textContent = '—'
            document.getElementById('birthday-run-btn').textContent = '运行蒙特卡洛模拟（5,000 次）'
        })
    }
})

/* =====================================
   🎰 ST PETERSBURG
   ===================================== */
const priceSlider = document.getElementById('price-slider')
const buyPriceVal = document.getElementById('buy-price-val')

priceSlider.addEventListener('input', () => {
    buyPriceVal.textContent = priceSlider.value
})

document.querySelectorAll('[data-demo="petersburg"]').forEach(btn => {
    if (btn.classList.contains('btn-sim')) {
        btn.addEventListener('click', async () => {
            const n = parseInt(btn.dataset.n)
            const buyPrice = parseInt(priceSlider.value)
            btn.disabled = true
            btn.textContent = '模拟中…'

            const res = await fetch('/demo/petersburg', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ n, buy_price: buyPrice })
            })
            const data = await res.json()

            document.getElementById('pete-median').textContent = data.median + ' 元'
            document.getElementById('pete-mean').textContent = data.mean.toFixed(1) + ' 元'
            document.getElementById('pete-breakeven').textContent = data.breakeven_pct + '%'

            const hist = data.histogram
            const centers = hist.edges.slice(0, -1).map((v, i) => (v + hist.edges[i + 1]) / 2)

            Plotly.newPlot('petersburg-chart', [{
                x: centers,
                y: hist.counts,
                type: 'bar',
                marker: { color: 'rgba(79,70,229,0.65)', line: { color: 'transparent' } },
                hovertemplate: '约 %{x:.0f} 元：%{y} 次<extra></extra>'
            }], {
                margin: { t: 10, r: 20, b: 50, l: 50 },
                paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
                bargap: 0.05,
                xaxis: { title: '赢得的钱（元）', gridcolor: '#e4e7ec' },
                yaxis: { title: '次数', gridcolor: '#e4e7ec' },
                shapes: [
                    {
                        type: 'line', x0: data.median, x1: data.median, y0: 0, y1: 1, yref: 'paper',
                        line: { color: '#dc2626', width: 2, dash: 'dot' }
                    },
                    {
                        type: 'line', x0: buyPrice, x1: buyPrice, y0: 0, y1: 1, yref: 'paper',
                        line: { color: '#059669', width: 2, dash: 'dash' }
                    }
                ],
                annotations: [
                    {
                        x: data.median, y: 1, yref: 'paper', text: '中位数', showarrow: false,
                        font: { color: '#dc2626', size: 11 }, xanchor: 'right'
                    },
                    {
                        x: buyPrice, y: 0.85, yref: 'paper', text: `买入价 ${buyPrice}元`, showarrow: false,
                        font: { color: '#059669', size: 11 }, xanchor: 'left'
                    }
                ]
            }, { displayModeBar: false, responsive: true })

            document.getElementById('pete-footnote').textContent =
                `模拟 ${n.toLocaleString()} 次：有 ${data.pct_lte_2}% 的概率只赢到 2 元或更少，` +
                `${data.pct_lte_4}% 的概率只赢到 4 元或更少。` +
                `花 ${buyPrice} 元买入，实际有 ${data.breakeven_pct}% 的机会回本。`

            document.getElementById('petersburg-result').style.display = 'block'
            btn.disabled = false
            btn.textContent = '重新模拟'
        })
    }

    if (btn.classList.contains('btn-reset')) {
        btn.addEventListener('click', () => {
            Plotly.purge('petersburg-chart')
            document.getElementById('petersburg-result').style.display = 'none'
            document.querySelectorAll('[data-demo="petersburg"].btn-sim').forEach(b => {
                b.disabled = false
                b.textContent = '模拟 10,000 次'
            })
        })
    }
})
