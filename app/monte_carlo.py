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
        dist_type = var.get('dist_type', 'triangular')
        p = float(var['pessimistic'])
        b = float(var['base'])
        o = float(var['optimistic'])

        # Map three user-facing fields to distribution-specific params
        if dist_type == 'normal':
            params = {'mean': b, 'std': o}
        elif dist_type == 'uniform':
            params = {'min': p, 'max': o}
        elif dist_type == 'constant':
            params = {'value': b}
        else:  # triangular (default)
            dist_type = 'triangular'
            params = {'min': p, 'mode': b, 'max': o}

        df[var_name] = get_distribution(dist_type, params, num_simulations)

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


def simulate_retirement(
    current_age, retire_age, life_expectancy,
    current_savings, monthly_savings, monthly_expense_retire,
    return_mean, return_std, inflation,
    n_simulations=2000
):
    """Monte Carlo retirement simulation.

    Simulates wealth trajectories from current_age to life_expectancy.
    - Accumulation phase (current_age → retire_age): monthly savings + returns
    - Drawdown phase (retire_age → life_expectancy): monthly expenses + returns
    Returns sampled paths, percentile envelopes, success rate, and final distribution.
    """
    n_simulations = min(max(int(n_simulations), 100), 10000)

    total_months = (life_expectancy - current_age) * 12
    retire_month = (retire_age - current_age) * 12

    # Monthly return parameters (convert annual to monthly)
    monthly_mean = return_mean / 12
    monthly_std = return_std / np.sqrt(12)
    monthly_inflation = inflation / 12

    # Simulate all paths at once: (n_simulations, total_months) matrix of monthly returns
    monthly_returns = np.random.normal(monthly_mean, monthly_std, (n_simulations, total_months))

    # Build wealth trajectories month by month
    wealth = np.zeros((n_simulations, total_months + 1))
    wealth[:, 0] = current_savings

    for m in range(total_months):
        # Inflation-adjusted expense/savings
        inflation_factor = (1 + monthly_inflation) ** m

        if m < retire_month:
            # Accumulation: save money
            net_flow = monthly_savings / inflation_factor  # real terms
        else:
            # Drawdown: spend money (expense grows with inflation)
            net_flow = -monthly_expense_retire * inflation_factor

        # Apply return and net flow; floor at 0 (can't go negative in wealth)
        wealth[:, m + 1] = np.maximum(
            wealth[:, m] * (1 + monthly_returns[:, m]) + net_flow,
            0
        )

    # Percentiles at each time step (for fan chart)
    time_years = np.arange(total_months + 1) / 12 + current_age
    p5 = np.percentile(wealth, 5, axis=0).tolist()
    p10 = np.percentile(wealth, 10, axis=0).tolist()
    p25 = np.percentile(wealth, 25, axis=0).tolist()
    p50 = np.percentile(wealth, 50, axis=0).tolist()
    p75 = np.percentile(wealth, 75, axis=0).tolist()
    p90 = np.percentile(wealth, 90, axis=0).tolist()
    p95 = np.percentile(wealth, 95, axis=0).tolist()

    # Sample a few paths for individual trajectory display
    sample_idx = np.random.choice(n_simulations, size=min(30, n_simulations), replace=False)
    sample_paths = wealth[sample_idx, :].tolist()

    # Success rate: wealth > 0 at the end
    final_wealth = wealth[:, -1]
    success_rate = float(np.mean(final_wealth > 0) * 100)

    # Final wealth distribution histogram
    # Cap at 99th percentile for readability
    cap = float(np.percentile(final_wealth, 99)) if np.any(final_wealth > 0) else 1
    capped = final_wealth[final_wealth <= cap]
    if len(capped) == 0:
        capped = final_wealth
    hist_counts, hist_edges = np.histogram(capped, bins=30)

    # Wealth at retirement
    retire_wealth = wealth[:, retire_month]
    retire_median = float(np.median(retire_wealth))

    return {
        'time_years': time_years.tolist(),
        'percentiles': {
            'p5': p5, 'p10': p10, 'p25': p25,
            'p50': p50,
            'p75': p75, 'p90': p90, 'p95': p95,
        },
        'sample_paths': sample_paths,
        'success_rate': round(success_rate, 1),
        'retire_month': retire_month,
        'retire_age': retire_age,
        'retire_wealth_median': round(retire_median, 0),
        'final_distribution': {
            'counts': hist_counts.tolist(),
            'edges': hist_edges.tolist(),
        },
        'final_median': round(float(np.median(final_wealth)), 0),
        'final_p10': round(float(np.percentile(final_wealth, 10)), 0),
        'final_p90': round(float(np.percentile(final_wealth, 90)), 0),
        'n_simulations': n_simulations,
    }