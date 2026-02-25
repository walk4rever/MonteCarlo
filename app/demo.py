import numpy as np
from flask import Blueprint, render_template, request, jsonify

demo = Blueprint('demo', __name__)


@demo.route('/demo')
def demo_index():
    return render_template('demo.html')


@demo.route('/demo/monty-hall', methods=['POST'])
def monty_hall():
    data = request.get_json(silent=True) or {}
    n = min(max(int(data.get('n', 1000)), 1), 50000)

    car = np.random.randint(0, 3, n)
    pick = np.random.randint(0, 3, n)

    # Staying: win if original pick is the car
    stay_wins = int(np.sum(pick == car))
    # Switching: win if original pick is NOT the car
    switch_wins = n - stay_wins

    return jsonify({
        'n': n,
        'stay_wins': stay_wins,
        'switch_wins': switch_wins,
        'stay_rate': round(stay_wins / n * 100, 1),
        'switch_rate': round(switch_wins / n * 100, 1),
    })


@demo.route('/demo/birthday', methods=['POST'])
def birthday():
    data = request.get_json(silent=True) or {}
    max_group = min(max(int(data.get('max_group', 60)), 5), 100)
    trials = min(max(int(data.get('trials', 5000)), 500), 20000)

    results = []
    for size in range(2, max_group + 1):
        hits = 0
        for _ in range(trials):
            birthdays = np.random.randint(0, 365, size)
            if len(set(birthdays)) < size:
                hits += 1
        results.append({
            'size': size,
            'probability': round(hits / trials * 100, 1)
        })

    # Also return one sample group for visualization
    sample_size = int(data.get('sample_size', 30))
    sample_birthdays = np.random.randint(0, 365, sample_size).tolist()

    return jsonify({
        'curve': results,
        'sample': sample_birthdays,
    })


@demo.route('/demo/petersburg', methods=['POST'])
def petersburg():
    data = request.get_json(silent=True) or {}
    n = min(max(int(data.get('n', 10000)), 100), 50000)
    buy_price = float(data.get('buy_price', 10))

    payouts = []
    for _ in range(n):
        flips = 0
        while np.random.random() < 0.5:
            flips += 1
        payouts.append(2 ** flips)

    payouts = np.array(payouts)
    median = float(np.median(payouts))
    mean = float(np.mean(payouts))
    breakeven_pct = float(np.mean(payouts >= buy_price) * 100)

    # Cap histogram at 99th percentile for readability
    cap = float(np.percentile(payouts, 99))
    capped = payouts[payouts <= cap]
    max_val = int(cap) + 1
    bins = min(40, max_val)
    counts, edges = np.histogram(capped, bins=bins)

    return jsonify({
        'n': n,
        'median': round(median, 2),
        'mean': round(mean, 2),
        'breakeven_pct': round(breakeven_pct, 1),
        'histogram': {
            'counts': counts.tolist(),
            'edges': edges.tolist(),
        },
        'pct_lte_2': round(float(np.mean(payouts <= 2) * 100), 1),
        'pct_lte_4': round(float(np.mean(payouts <= 4) * 100), 1),
    })
