/* =====================================================
   概率悖论演示层 — demo.js
   ===================================================== */

/* ── 通用错误 Toast ── */
function showToast(msg) {
    let toast = document.getElementById('demo-toast')
    if (!toast) {
        toast = document.createElement('div')
        toast.id = 'demo-toast'
        Object.assign(toast.style, {
            position: 'fixed', bottom: '24px', left: '50%',
            transform: 'translateX(-50%)',
            background: '#dc2626', color: '#fff',
            padding: '10px 20px', borderRadius: '8px',
            fontSize: '14px', zIndex: '9999',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            transition: 'opacity 0.3s'
        })
        document.body.appendChild(toast)
    }
    toast.textContent = msg
    toast.style.opacity = '1'
    clearTimeout(toast._timer)
    toast._timer = setTimeout(() => { toast.style.opacity = '0' }, 3500)
}

const basePath = document.body.dataset.basePath || ''
const apiPath = (path) => basePath + path

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
   🚪 MONTY HALL — Zone 1: Interactive Game
   ===================================== */

// Helper for better randomness
function getSecureRandomInt(max) {
    if (window.crypto && window.crypto.getRandomValues) {
        const array = new Uint32Array(1)
        window.crypto.getRandomValues(array)
        return array[0] % max
    }
    return Math.floor(Math.random() * max)
}

// Game state
const PHASE = { PICK: 'pick', DECIDE: 'decide', DONE: 'done' }
let gamePhase = PHASE.PICK
let gameCar = -1       // Which door hides the car
let gamePicked = -1    // Player's initial pick
let gameRevealed = -1  // Door the host opens
let gameSwitch = -1    // The other remaining door

// Personal stats
const ps = { stayWin: 0, stayLose: 0, switchWin: 0, switchLose: 0 }

function gdoor(i) { return document.getElementById('gdoor-' + i) }
function gdoorFace(i) { return document.getElementById('gdoor-face-' + i) }
function gdoorReveal(i) { return document.getElementById('gdoor-reveal-' + i) }

function setGamePhaseMsg(msg) {
    document.getElementById('game-phase-msg').innerHTML = msg
}

function resetGame() {
    gamePhase = PHASE.PICK
    gameCar = getSecureRandomInt(3) // 提前生成车辆位置，确保每局刷新
    gamePicked = gameRevealed = gameSwitch = -1

    console.log(`[Monty] 新开一局，车已提前安置 (开发者调试: 门 ${gameCar + 1})`)

    for (let i = 0; i < 3; i++) {
        gdoor(i).className = 'door-wrap clickable'
        gdoorFace(i).className = 'door'
        gdoorReveal(i).textContent = ''
    }

    document.getElementById('decide-btns').style.display = 'none'
    document.getElementById('play-again-wrap').style.display = 'none'
    setGamePhaseMsg('👆 点击一扇门，选择你的初始猜测')
}

function updatePlayerStats() {
    document.getElementById('ps-stay-win').textContent = ps.stayWin
    document.getElementById('ps-stay-lose').textContent = ps.stayLose
    document.getElementById('ps-switch-win').textContent = ps.switchWin
    document.getElementById('ps-switch-lose').textContent = ps.switchLose
    document.getElementById('player-stats').style.display = 'flex'
}

function handleDoorClick(i) {
    if (gamePhase !== PHASE.PICK) return

    gamePhase = PHASE.DECIDE
    gamePicked = i

    console.log(`[Monty] 用户初始选择了门 ${i + 1}`)

    // Highlight picked door
    for (let d = 0; d < 3; d++) {
        gdoor(d).className = 'door-wrap' + (d === i ? ' selected' : '')
    }
    setGamePhaseMsg(`你选了门 ${i + 1}，主持人正在开门……`)

    // After a short delay, host reveals a goat door
    setTimeout(() => {
        // Host picks a door that is neither the player's pick nor the car
        const candidates = [0, 1, 2].filter(d => d !== gamePicked && d !== gameCar)
        gameRevealed = candidates[getSecureRandomInt(candidates.length)]
        // If player picked the car, candidates has 2 entries (both goats), pick randomly
        // If player picked a goat, candidates has exactly 1 entry (the other goat door)

        console.log(`[Monty] 主持人揭开了门 ${gameRevealed + 1} (山羊)`)

        gdoorReveal(gameRevealed).textContent = '🐐'
        gdoorFace(gameRevealed).classList.add('open')
        gdoor(gameRevealed).classList.add('revealed')

        gameSwitch = [0, 1, 2].find(d => d !== gamePicked && d !== gameRevealed)

        setGamePhaseMsg(`主持人打开了门 ${gameRevealed + 1}，是山羊！你要换到门 ${gameSwitch + 1} 吗？`)
        document.getElementById('decide-btns').style.display = 'block'
    }, 600)
}

function playerDecide(stayChoice) {
    if (gamePhase !== PHASE.DECIDE) return
    gamePhase = PHASE.DONE

    document.getElementById('decide-btns').style.display = 'none'

    const finalDoor = stayChoice ? gamePicked : gameSwitch
    const won = finalDoor === gameCar

    // Animate all doors open
    setTimeout(() => {
        for (let d = 0; d < 3; d++) {
            gdoorReveal(d).textContent = d === gameCar ? '🚗' : '🐐'
            gdoorFace(d).classList.add('open')

            // Dim all except the final choice
            if (d !== finalDoor) gdoor(d).classList.add('dimmed')
        }

        // Win/lose styling on final door
        gdoor(finalDoor).classList.add(won ? 'winner' : 'loser')

        // Update stats
        if (stayChoice) {
            won ? ps.stayWin++ : ps.stayLose++
        } else {
            won ? ps.switchWin++ : ps.switchLose++
        }
        updatePlayerStats()

        const action = stayChoice ? '坚持不换' : '换门'
        if (won) {
            setGamePhaseMsg(`🎉 你赢了！${action}，门 ${finalDoor + 1} 是车！`)
        } else {
            setGamePhaseMsg(`😔 你输了，${action}，车其实在门 ${gameCar + 1}。`)
        }

        document.getElementById('play-again-wrap').style.display = 'block'
    }, 200)
}

// Wire up door clicks
for (let i = 0; i < 3; i++) {
    gdoor(i).addEventListener('click', () => handleDoorClick(i))
}

document.getElementById('btn-stay').addEventListener('click', () => playerDecide(true))
document.getElementById('btn-switch').addEventListener('click', () => playerDecide(false))
document.getElementById('btn-play-again').addEventListener('click', resetGame)

// Init game on load
resetGame()

/* =====================================
   🚪 MONTY HALL — Zone 2: Convergence Chart
   ===================================== */

let convRunning = false
let convAnimId = null
let convTotal = 0, convStay = 0, convSwitch = 0
let convChartReady = false

// Run a batch of n pure-JS Monty Hall simulations
function runMontyBatchJS(n) {
    let stayWins = 0, switchWins = 0
    for (let i = 0; i < n; i++) {
        const car = Math.floor(Math.random() * 3)
        const pick = Math.floor(Math.random() * 3)
        // Stay wins if initial pick is car
        if (pick === car) stayWins++
        else switchWins++
    }
    return { stayWins, switchWins }
}

function initConvergenceChart() {
    Plotly.newPlot('monty-convergence-chart', [
        {
            x: [], y: [],
            mode: 'lines',
            name: '🔒 不换胜率',
            line: { color: '#ef4444', width: 2.5 },
            hovertemplate: '%{x} 次 → %{y:.1f}%<extra>不换</extra>'
        },
        {
            x: [], y: [],
            mode: 'lines',
            name: '🔄 换门胜率',
            line: { color: '#10b981', width: 2.5 },
            hovertemplate: '%{x} 次 → %{y:.1f}%<extra>换门</extra>'
        }
    ], {
        margin: { t: 20, r: 20, b: 50, l: 55 },
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'transparent',
        legend: { orientation: 'h', y: 1.12, x: 0, font: { size: 13 } },
        xaxis: {
            title: '模拟次数',
            gridcolor: '#e4e7ec',
            type: 'log',
            range: [Math.log10(10), Math.log10(20000)]
        },
        yaxis: {
            title: '胜率 (%)',
            gridcolor: '#e4e7ec',
            range: [0, 100]
        },
        shapes: [
            {
                type: 'line', x0: 0, x1: 1, xref: 'paper',
                y0: 66.7, y1: 66.7,
                line: { color: '#10b981', width: 1.2, dash: 'dot' }
            },
            {
                type: 'line', x0: 0, x1: 1, xref: 'paper',
                y0: 33.3, y1: 33.3,
                line: { color: '#ef4444', width: 1.2, dash: 'dot' }
            }
        ],
        annotations: [
            {
                x: 1, xref: 'paper', xanchor: 'right',
                y: 66.7, yanchor: 'bottom',
                text: '理论值 66.7%', showarrow: false,
                font: { color: '#059669', size: 11 }
            },
            {
                x: 1, xref: 'paper', xanchor: 'right',
                y: 33.3, yanchor: 'top',
                text: '理论值 33.3%', showarrow: false,
                font: { color: '#dc2626', size: 11 }
            }
        ]
    }, { displayModeBar: false, responsive: true })
    convChartReady = true
}

function convTick() {
    if (!convRunning) return

    const BATCH = 50
    const { stayWins, switchWins } = runMontyBatchJS(BATCH)
    convTotal += BATCH
    convStay += stayWins
    convSwitch += switchWins

    const stayRate = convStay / convTotal * 100
    const switchRate = convSwitch / convTotal * 100

    Plotly.extendTraces('monty-convergence-chart', {
        x: [[convTotal], [convTotal]],
        y: [[stayRate], [switchRate]]
    }, [0, 1])

    document.getElementById('conv-count').textContent =
        `累计模拟 ${convTotal.toLocaleString()} 次 | 不换 ${stayRate.toFixed(1)}%，换门 ${switchRate.toFixed(1)}%`

    // Slow down as we accumulate more data
    const delay = convTotal < 500 ? 40 : convTotal < 3000 ? 80 : 200
    convAnimId = setTimeout(convTick, delay)
}

function startConvergence() {
    if (!convChartReady) initConvergenceChart()
    convRunning = true
    document.getElementById('conv-start-btn').textContent = '⏸ 暂停'
    document.getElementById('conv-start-btn').classList.add('btn-stop')
    convTick()
}

function stopConvergence() {
    convRunning = false
    clearTimeout(convAnimId)
    document.getElementById('conv-start-btn').textContent = '▶ 继续模拟'
    document.getElementById('conv-start-btn').classList.remove('btn-stop')
}

function resetConvergence() {
    stopConvergence()
    convTotal = convStay = convSwitch = 0
    convChartReady = false
    Plotly.purge('monty-convergence-chart')
    document.getElementById('conv-count').textContent = ''
    document.getElementById('conv-start-btn').textContent = '▶ 开始模拟'
}

document.getElementById('conv-start-btn').addEventListener('click', function () {
    if (convRunning) stopConvergence()
    else startConvergence()
})

document.getElementById('conv-reset-btn').addEventListener('click', resetConvergence)

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

    let data
    try {
        const res = await fetch(apiPath('/demo/birthday'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ max_group: 60, trials: 5000, sample_size: 30 })
        })
        if (!res.ok) throw new Error(`服务器错误 ${res.status}`)
        data = await res.json()
    } catch (e) {
        showToast('生日悖论模拟失败：' + e.message)
        document.getElementById('birthday-loading').style.display = 'none'
        btn.textContent = '运行蒙特卡洛模拟（5,000 次）'
        btn.disabled = false
        return
    }
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
        span.innerHTML = `<span class="dot-icon">👤</span> ${dayOfYear(d)}`
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

            let data
            try {
                const res = await fetch(apiPath('/demo/petersburg'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ n, buy_price: buyPrice })
                })
                if (!res.ok) throw new Error(`服务器错误 ${res.status}`)
                data = await res.json()
            } catch (e) {
                showToast('圣彼得堡悖论模拟失败：' + e.message)
                btn.disabled = false
                btn.textContent = '模拟 10,000 次'
                return
            }

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
                margin: { t: 10, r: 20, b: 50, l: 60 },
                paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
                bargap: 0.05,
                xaxis: {
                    title: '赢得的钱（元，对数坐标）',
                    type: 'log',
                    dtick: Math.log10(2), // Highlights powers of 2
                    gridcolor: '#e4e7ec'
                },
                yaxis: { title: '次数', gridcolor: '#e4e7ec' },
                shapes: [
                    {
                        type: 'line', x0: Math.log10(data.median), x1: Math.log10(data.median), y0: 0, y1: 1, yref: 'paper', xref: 'x',
                        line: { color: '#dc2626', width: 2, dash: 'dot' }
                    },
                    {
                        type: 'line', x0: Math.log10(buyPrice), x1: Math.log10(buyPrice), y0: 0, y1: 1, yref: 'paper', xref: 'x',
                        line: { color: '#059669', width: 2, dash: 'dash' }
                    }
                ],
                annotations: [
                    {
                        x: Math.log10(data.median), xanchor: 'right', y: 1, yref: 'paper', xref: 'x', text: `中位数 ${data.median}元`, showarrow: false,
                        font: { color: '#dc2626', size: 11 }
                    },
                    {
                        x: Math.log10(buyPrice), xanchor: 'left', y: 0.85, yref: 'paper', xref: 'x', text: `买入价 ${buyPrice}元`, showarrow: false,
                        font: { color: '#059669', size: 11 }
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
