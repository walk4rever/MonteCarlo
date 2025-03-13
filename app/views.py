from flask import Blueprint, render_template, request, jsonify
import json
from .monte_carlo import run_simulation, get_distribution

main = Blueprint('main', __name__)

@main.route('/')
def index():
    return render_template('index.html')

@main.route('/simulate', methods=['POST'])
def simulate():
    data = request.get_json()
    
    variables = data.get('variables', [])
    formulas = data.get('formulas', [])
    num_simulations = data.get('num_simulations', 1000)
    
    result = run_simulation(variables, formulas, num_simulations)
    return jsonify(result)

@main.route('/distribution_preview', methods=['POST'])
def distribution_preview():
    data = request.get_json()
    dist_type = data.get('type')
    params = data.get('params', {})
    samples = get_distribution(dist_type, params, 1000)
    
    return jsonify({
        'samples': samples.tolist()
    })