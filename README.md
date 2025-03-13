# Monte Carlo Simulator

A web-based Monte Carlo simulation tool that allows users to define variables with different probability distributions, create formulas, and analyze simulation results with visualizations.

## Features

- Define multiple random variables with various distribution types:
  - Normal distribution
  - Uniform distribution
  - Triangular distribution
  - Log-normal distribution
  - Beta distribution
  - Constant values
  
- Create formulas using defined variables
- Run Monte Carlo simulations with configurable number of iterations
- Visualize results with:
  - Probability distribution histograms
  - Cumulative distribution function (CDF) curves
  - Sensitivity analysis
  - Scatter plots to explore variable relationships
  - Statistical summaries
  
- Save and load simulation scenarios

## Installation

1. Clone the repository:
```
git clone https://github.com/yourusername/monte-carlo-simulator.git
cd monte-carlo-simulator
```

2. Create and activate a virtual environment (optional but recommended):
```
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```
pip install -r requirements.txt
```

4. Run the application:
```
python app.py
```

5. Open your browser and navigate to:
```
http://127.0.0.1:5000/
```

## Usage

1. **Define Variables**: Click "Add Variable" to create random variables with different distribution types
2. **Create Formulas**: Define mathematical formulas using your variables
3. **Set Simulation Parameters**: Choose the number of simulation iterations
4. **Run Simulation**: Click "Run Simulation" to execute the Monte Carlo analysis
5. **View Results**: Explore the generated visualizations and statistical data
6. **Save/Load Scenarios**: Save your configurations for later use

## Example Use Cases

- Project cost estimation with uncertainty
- Risk analysis for financial investments
- Engineering reliability assessments
- Supply chain optimization
- Portfolio risk management
- Sales forecasting with multiple variables

## Technologies Used

- Backend: Python, Flask, NumPy, SciPy, Pandas
- Frontend: HTML, CSS, JavaScript, Bootstrap, Plotly.js, Chart.js

## License

This project is licensed under the MIT License - see the LICENSE file for details.