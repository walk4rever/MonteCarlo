import re
from flask import Blueprint, render_template, request, jsonify
from .monte_carlo import run_simulation

main = Blueprint('main', __name__)

VALID_NAME = re.compile(r'^[a-zA-Z\u4e00-\u9fa5][a-zA-Z0-9\u4e00-\u9fa5_\s]{0,29}$')


@main.route('/')
def index():
    return render_template('index.html')


@main.route('/simulate', methods=['POST'])
def simulate():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({'error': '请求数据无效'}), 400

    variables = data.get('variables', [])
    num_simulations = data.get('num_simulations', 10000)

    if not isinstance(variables, list) or len(variables) == 0:
        return jsonify({'error': '请至少添加一个变量'}), 400

    for var in variables:
        name = str(var.get('name', '')).strip()
        if not VALID_NAME.match(name):
            return jsonify({'error': f'变量名"{name}"无效，只允许中英文、数字和下划线'}), 400
        try:
            p = float(var['pessimistic'])
            b = float(var['base'])
            o = float(var['optimistic'])
        except (KeyError, ValueError, TypeError):
            return jsonify({'error': f'变量"{name}"的数值无效'}), 400
        if not (p <= b <= o):
            return jsonify({'error': f'变量"{name}"的数值须满足：悲观 ≤ 基准 ≤ 乐观'}), 400
        var['name'] = name
        var['pessimistic'] = p
        var['base'] = b
        var['optimistic'] = o

    try:
        num_simulations = int(num_simulations)
    except (ValueError, TypeError):
        num_simulations = 10000

    result = run_simulation(variables, num_simulations)
    return jsonify(result)