import re
from flask import Blueprint, render_template, request, jsonify
from .monte_carlo import run_simulation, simulate_retirement

main = Blueprint('main', __name__)

VALID_NAME = re.compile(r'^[a-zA-Z\u4e00-\u9fa5][a-zA-Z0-9\u4e00-\u9fa5_\s]{0,29}$')
VALID_DISTS = {'triangular', 'normal', 'uniform', 'constant'}


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

        dist_type = str(var.get('dist_type', 'triangular')).strip()
        if dist_type not in VALID_DISTS:
            return jsonify({'error': f'变量"{name}"的分布类型无效'}), 400

        try:
            p = float(var['pessimistic'])
            b = float(var['base'])
            o = float(var['optimistic'])
        except (KeyError, ValueError, TypeError):
            return jsonify({'error': f'变量"{name}"的数值无效'}), 400

        if dist_type == 'triangular':
            if not (p <= b <= o):
                return jsonify({'error': f'变量"{name}"须满足：最差 ≤ 最可能 ≤ 最好'}), 400
        elif dist_type == 'normal':
            if o <= 0:
                return jsonify({'error': f'变量"{name}"的标准差须大于 0'}), 400
        elif dist_type == 'uniform':
            if p >= o:
                return jsonify({'error': f'变量"{name}"的均匀分布须满足：最小值 < 最大值'}), 400

        var['name'] = name
        var['dist_type'] = dist_type
        var['pessimistic'] = p
        var['base'] = b
        var['optimistic'] = o

    try:
        num_simulations = int(num_simulations)
    except (ValueError, TypeError):
        num_simulations = 10000

    result = run_simulation(variables, num_simulations)
    return jsonify(result)


@main.route('/simulate/retirement', methods=['POST'])
def retirement():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({'error': '请求数据无效'}), 400

    try:
        current_age = int(data.get('current_age', 30))
        retire_age = int(data.get('retire_age', 60))
        life_expectancy = int(data.get('life_expectancy', 85))
        current_savings = float(data.get('current_savings', 100000))
        monthly_savings = float(data.get('monthly_savings', 5000))
        monthly_expense_retire = float(data.get('monthly_expense_retire', 8000))
        return_mean = float(data.get('return_mean', 0.07))
        return_std = float(data.get('return_std', 0.15))
        inflation = float(data.get('inflation', 0.03))
        n = int(data.get('n', 2000))
    except (ValueError, TypeError) as e:
        return jsonify({'error': f'参数格式无效: {str(e)}'}), 400

    # Validation
    if not (18 <= current_age < retire_age < life_expectancy <= 120):
        return jsonify({'error': '年龄参数无效：需满足当前年龄 < 退休年龄 < 预期寿命'}), 400
    if current_savings < 0:
        return jsonify({'error': '当前存款不能为负'}), 400
    if monthly_savings < 0:
        return jsonify({'error': '月储蓄不能为负'}), 400
    if monthly_expense_retire < 0:
        return jsonify({'error': '月支出不能为负'}), 400
    if return_std <= 0:
        return jsonify({'error': '收益率标准差须大于 0'}), 400

    result = simulate_retirement(
        current_age, retire_age, life_expectancy,
        current_savings, monthly_savings, monthly_expense_retire,
        return_mean, return_std, inflation,
        n_simulations=n
    )
    return jsonify(result)