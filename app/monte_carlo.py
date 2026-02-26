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

    # ---- Interpretation Generation ----
    final_p10 = float(np.percentile(final_wealth, 10))
    final_p50 = float(np.median(final_wealth))
    final_p90 = float(np.percentile(final_wealth, 90))

    def format_currency(value):
        if value < 10000:
            return f"{int(value):,}"
        return f"{value/10000:,.1f} 万"

    interpretation = {
        "title": "结果解读",
        "success_rate": (
            f"您的退休计划成功率为 **{success_rate:.1f}%**。"
            f"这意味着在模拟的 {n_simulations} 种未来中，有"
            f" **{int(n_simulations * success_rate / 100)}** 种情况下，"
            f"您的财富可以支撑到生命周期结束（{life_expectancy}岁）而不会耗尽。"
        ),
        "final_wealth_range": (
            f"最终财富有很大的不确定性。在 **10% 的较差情况下**，您到期末时将剩下"
            f" **{format_currency(final_p10)}** 元或更少。"
            f"而在 **10% 的较好情况下**，您将拥有"
            f" **{format_currency(final_p90)}** 元或更多。"
            "这个范围揭示了投资风险带来的可能结果的巨大差异。"
        ),
        "final_wealth_median": (
            f"最可能的结果是，您在生命周期结束时将拥有约"
            f" **{format_currency(final_p50)}** 元。这可以看作是您退休计划的“中间路径”或基准情景。"
        ),
        "retire_wealth_median": (
            f"当您在 **{retire_age}** 岁退休时，最可能积累的财富约为"
            f" **{format_currency(retire_median)}** 元。"
            "这笔资金将是您退休生活开始时的“本金”。"
        )
    }
    if success_rate < 50:
        interpretation["advice"] = "**风险提示**：当前计划的成功率较低，意味着您的资金有较大可能在晚年耗尽。建议考虑增加储蓄、延迟退休或采取更优化的投资策略。"
    elif success_rate < 85:
        interpretation["advice"] = "**注意事项**：您的计划有中等程度的成功机会，但在一些不利的市场情况下仍有风险。建议审视您的退休后开支计划，并考虑建立额外的安全垫。"
    else:
        interpretation["advice"] = "**计划评估**：您的退休计划看起来相当稳健，有很高的概率能够成功实现财务目标。请继续保持良好的储蓄和投资习惯。"


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
        'final_median': round(final_p50, 0),
        'final_p10': round(final_p10, 0),
        'final_p90': round(final_p90, 0),
        'n_simulations': n_simulations,
        'interpretation': interpretation,
    }