import numpy as np
import pandas as pd
from scipy import stats
import re

def get_distribution(dist_type, params, size=1):
    if dist_type == 'normal':
        return np.random.normal(params.get('mean', 0), params.get('std', 1), size)
    elif dist_type == 'uniform':
        return np.random.uniform(params.get('min', 0), params.get('max', 1), size)
    elif dist_type == 'triangular':
        return np.random.triangular(params.get('min', 0), params.get('mode', 0.5), params.get('max', 1), size)
    elif dist_type == 'lognormal':
        return np.random.lognormal(params.get('mean', 0), params.get('sigma', 1), size)
    elif dist_type == 'beta':
        return np.random.beta(params.get('alpha', 1), params.get('beta', 1), size)
    elif dist_type == 'constant':
        return np.full(size, params.get('value', 0))
    else:
        raise ValueError(f"Unknown distribution type: {dist_type}")

def run_simulation(variables, formulas, num_simulations=1000):
    # Initialize DataFrame to hold all variable values
    df = pd.DataFrame(index=range(num_simulations))
    
    # Generate random values for each variable
    for var in variables:
        var_name = var['name']
        dist_type = var['distribution']['type']
        params = var['distribution']['params']
        
        df[var_name] = get_distribution(dist_type, params, num_simulations)
    
    # Evaluate formulas
    for formula in formulas:
        output_name = formula['output']
        expression = formula['expression']
        
        # Replace variable names with df column references
        for var_name in df.columns:
            pattern = r'(?<![a-zA-Z0-9_])' + re.escape(var_name) + r'(?![a-zA-Z0-9_])'
            expression = re.sub(pattern, f"df['{var_name}']", expression)
        
        # Evaluate the expression
        try:
            df[output_name] = eval(expression)
        except Exception as e:
            return {"error": f"Error evaluating formula {output_name}: {str(e)}"}
    
    # Calculate statistics for all variables and output formulas
    results = {}
    for col in df.columns:
        values = df[col].values
        
        # Basic statistics
        stats_data = {
            'mean': float(np.mean(values)),
            'median': float(np.median(values)),
            'std': float(np.std(values)),
            'min': float(np.min(values)),
            'max': float(np.max(values)),
            'histogram': np.histogram(values, bins=20)[0].tolist(),
            'bin_edges': np.histogram(values, bins=20)[1].tolist(),
            'percentiles': {
                '1%': float(np.percentile(values, 1)),
                '5%': float(np.percentile(values, 5)),
                '10%': float(np.percentile(values, 10)),
                '25%': float(np.percentile(values, 25)),
                '50%': float(np.percentile(values, 50)),
                '75%': float(np.percentile(values, 75)),
                '90%': float(np.percentile(values, 90)),
                '95%': float(np.percentile(values, 95)),
                '99%': float(np.percentile(values, 99))
            }
        }
        
        results[col] = stats_data
    
    # If there are multiple output formulas, calculate sensitivity
    output_cols = [formula['output'] for formula in formulas]
    if output_cols and len(variables) > 0:
        primary_output = output_cols[0]
        sensitivity = {}
        
        for var in variables:
            var_name = var['name']
            corr = np.corrcoef(df[var_name], df[primary_output])[0, 1]
            sensitivity[var_name] = float(corr)
        
        results['sensitivity'] = sensitivity
    
    # Sample data for scatter plots (limit to 1000 points for performance)
    sample_indices = np.random.choice(num_simulations, min(1000, num_simulations), replace=False)
    samples = {col: df.iloc[sample_indices][col].tolist() for col in df.columns}
    results['samples'] = samples
    
    return results