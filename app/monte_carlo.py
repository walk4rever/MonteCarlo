import numpy as np
import pandas as pd

def get_distribution(dist_type, params, size=1):
    if dist_type == 'triangular':
        return np.random.triangular(
            params.get('min', 0),
            params.get('mode', 0.5),
            params.get('max', 1),
            size
        )
    elif dist_type == 'normal':
        return np.random.normal(params.get('mean', 0), params.get('std', 1), size)
    elif dist_type == 'uniform':
        return np.random.uniform(params.get('min', 0), params.get('max', 1), size)
    elif dist_type == 'constant':
        return np.full(size, params.get('value', 0))
    else:
        raise ValueError(f"Unknown distribution type: {dist_type}")


def run_simulation(variables, num_simulations=10000):
    num_simulations = min(max(int(num_simulations), 100), 50000)

    df = pd.DataFrame(index=range(num_simulations))

    for var in variables:
        var_name = var['name']
        pessimistic = float(var['pessimistic'])
        base = float(var['base'])
        optimistic = float(var['optimistic'])
        df[var_name] = np.random.triangular(pessimistic, base, optimistic, num_simulations)

    # Sum of all variables as the output
    output_col = 'total'
    df[output_col] = df.sum(axis=1)

    values = df[output_col].values

    p10 = float(np.percentile(values, 10))
    p50 = float(np.percentile(values, 50))
    p90 = float(np.percentile(values, 90))

    hist_counts, bin_edges = np.histogram(values, bins=30)

    # Sensitivity: Spearman correlation of each variable vs total
    sensitivity = {}
    for var in variables:
        var_name = var['name']
        corr = float(pd.Series(df[var_name]).corr(pd.Series(df[output_col]), method='spearman'))
        sensitivity[var_name] = round(corr, 4)

    return {
        'summary': {
            'p10': round(p10, 2),
            'p50': round(p50, 2),
            'p90': round(p90, 2),
        },
        'histogram': {
            'counts': hist_counts.tolist(),
            'bin_edges': bin_edges.tolist(),
        },
        'sensitivity': sensitivity,
        'num_simulations': num_simulations,
    }