document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const addVariableBtn = document.getElementById('add-variable-btn');
    const addFormulaBtn = document.getElementById('add-formula-btn');
    const runSimulationBtn = document.getElementById('run-simulation-btn');
    const saveScenarioBtn = document.getElementById('save-scenario-btn');
    const loadScenarioBtn = document.getElementById('load-scenario-btn');
    const variablesContainer = document.getElementById('variables-container');
    const formulasContainer = document.getElementById('formulas-container');
    const resultsContainer = document.getElementById('results-container');
    const noResults = document.getElementById('no-results');
    const loadingIndicator = document.getElementById('loading-indicator');
    const outputSelector = document.getElementById('output-selector');
    const xVariableSelect = document.getElementById('x-variable');
    const yVariableSelect = document.getElementById('y-variable');
    
    // Templates
    const variableTemplate = document.getElementById('variable-template');
    const formulaTemplate = document.getElementById('formula-template');
    const normalParamsTemplate = document.getElementById('normal-params-template');
    const uniformParamsTemplate = document.getElementById('uniform-params-template');
    const triangularParamsTemplate = document.getElementById('triangular-params-template');
    const lognormalParamsTemplate = document.getElementById('lognormal-params-template');
    const betaParamsTemplate = document.getElementById('beta-params-template');
    const constantParamsTemplate = document.getElementById('constant-params-template');
    
    // Current simulation results
    let currentResults = null;
    let currentSelectedOutput = null;
    
    // Add event listeners
    addVariableBtn.addEventListener('click', addVariable);
    addFormulaBtn.addEventListener('click', addFormula);
    runSimulationBtn.addEventListener('click', runSimulation);
    saveScenarioBtn.addEventListener('click', saveScenario);
    loadScenarioBtn.addEventListener('click', loadScenario);
    
    // Add a variable panel
    function addVariable() {
        const variableElement = variableTemplate.content.cloneNode(true);
        const variableItem = variableElement.querySelector('.variable-item');
        
        // Setup distribution type change event
        const distTypeSelect = variableElement.querySelector('.distribution-type');
        const paramsContainer = variableElement.querySelector('.distribution-params');
        
        // Set default distribution parameters
        updateDistributionParams(distTypeSelect.value, paramsContainer);
        
        distTypeSelect.addEventListener('change', function() {
            updateDistributionParams(this.value, paramsContainer);
        });
        
        // Setup remove button
        const removeBtn = variableElement.querySelector('.remove-variable');
        removeBtn.addEventListener('click', function() {
            variableItem.remove();
        });
        
        // Setup preview button
        const previewBtn = variableElement.querySelector('.preview-distribution');
        const previewChart = variableElement.querySelector('.preview-chart');
        
        previewBtn.addEventListener('click', function() {
            const varData = getVariableData(variableItem);
            if (varData) {
                previewDistribution(varData.distribution, previewChart);
            }
        });
        
        variablesContainer.appendChild(variableElement);
    }
    
    // Update distribution parameters UI based on selected distribution type
    function updateDistributionParams(distType, container) {
        container.innerHTML = '';
        
        let template;
        switch (distType) {
            case 'normal':
                template = normalParamsTemplate.content.cloneNode(true);
                break;
            case 'uniform':
                template = uniformParamsTemplate.content.cloneNode(true);
                break;
            case 'triangular':
                template = triangularParamsTemplate.content.cloneNode(true);
                break;
            case 'lognormal':
                template = lognormalParamsTemplate.content.cloneNode(true);
                break;
            case 'beta':
                template = betaParamsTemplate.content.cloneNode(true);
                break;
            case 'constant':
                template = constantParamsTemplate.content.cloneNode(true);
                break;
        }
        
        container.appendChild(template);
    }
    
    // Add a formula panel
    function addFormula() {
        const formulaElement = formulaTemplate.content.cloneNode(true);
        const formulaItem = formulaElement.querySelector('.formula-item');
        
        // Setup remove button
        const removeBtn = formulaElement.querySelector('.remove-formula');
        removeBtn.addEventListener('click', function() {
            formulaItem.remove();
        });
        
        formulasContainer.appendChild(formulaElement);
    }
    
    // Collect variable data from the UI
    function getVariableData(variableItem) {
        const nameInput = variableItem.querySelector('.variable-name');
        const distTypeSelect = variableItem.querySelector('.distribution-type');
        const name = nameInput.value.trim();
        
        if (!name) {
            nameInput.classList.add('is-invalid');
            return null;
        }
        
        const distType = distTypeSelect.value;
        const params = {};
        
        switch (distType) {
            case 'normal':
                params.mean = parseFloat(variableItem.querySelector('.param-mean').value);
                params.std = parseFloat(variableItem.querySelector('.param-std').value);
                break;
            case 'uniform':
                params.min = parseFloat(variableItem.querySelector('.param-min').value);
                params.max = parseFloat(variableItem.querySelector('.param-max').value);
                break;
            case 'triangular':
                params.min = parseFloat(variableItem.querySelector('.param-min').value);
                params.mode = parseFloat(variableItem.querySelector('.param-mode').value);
                params.max = parseFloat(variableItem.querySelector('.param-max').value);
                break;
            case 'lognormal':
                params.mean = parseFloat(variableItem.querySelector('.param-mean').value);
                params.sigma = parseFloat(variableItem.querySelector('.param-sigma').value);
                break;
            case 'beta':
                params.alpha = parseFloat(variableItem.querySelector('.param-alpha').value);
                params.beta = parseFloat(variableItem.querySelector('.param-beta').value);
                break;
            case 'constant':
                params.value = parseFloat(variableItem.querySelector('.param-value').value);
                break;
        }
        
        return {
            name,
            distribution: {
                type: distType,
                params
            }
        };
    }
    
    // Collect formula data from the UI
    function getFormulaData(formulaItem) {
        const outputNameInput = formulaItem.querySelector('.output-name');
        const expressionInput = formulaItem.querySelector('.formula-expression');
        
        const output = outputNameInput.value.trim();
        const expression = expressionInput.value.trim();
        
        if (!output) {
            outputNameInput.classList.add('is-invalid');
            return null;
        }
        
        if (!expression) {
            expressionInput.classList.add('is-invalid');
            return null;
        }
        
        return {
            output,
            expression
        };
    }
    
    // Preview a distribution
    function previewDistribution(distribution, container) {
        container.style.display = 'block';
        
        fetch('/distribution_preview', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(distribution)
        })
        .then(response => response.json())
        .then(data => {
            const samples = data.samples;
            
            // Create a histogram using Plotly
            const trace = {
                x: samples,
                type: 'histogram',
                nbinsx: 20,
                marker: {
                    color: 'rgba(0, 123, 255, 0.6)',
                    line: {
                        color: 'rgba(0, 123, 255, 1)',
                        width: 1
                    }
                }
            };
            
            const layout = {
                margin: { t: 10, r: 10, l: 30, b: 30 },
                xaxis: { title: '' },
                yaxis: { title: '' }
            };
            
            Plotly.newPlot(container, [trace], layout, { displayModeBar: false });
        })
        .catch(error => {
            console.error('Error previewing distribution:', error);
            container.innerHTML = 'Error generating preview';
        });
    }
    
    // Run the simulation
    function runSimulation() {
        // Collect all variable data
        const variables = Array.from(variablesContainer.querySelectorAll('.variable-item'))
            .map(getVariableData)
            .filter(Boolean);
        
        if (variables.length === 0) {
            alert('Please add at least one variable');
            return;
        }
        
        // Collect all formula data
        const formulas = Array.from(formulasContainer.querySelectorAll('.formula-item'))
            .map(getFormulaData)
            .filter(Boolean);
        
        // Check for duplicate variable/output names
        const allNames = new Set();
        let hasDuplicates = false;
        
        variables.forEach(variable => {
            if (allNames.has(variable.name)) {
                hasDuplicates = true;
            }
            allNames.add(variable.name);
        });
        
        formulas.forEach(formula => {
            if (allNames.has(formula.output)) {
                hasDuplicates = true;
            }
            allNames.add(formula.output);
        });
        
        if (hasDuplicates) {
            alert('Variable and output names must be unique');
            return;
        }
        
        // Get simulation count
        const numSimulations = parseInt(document.getElementById('num-simulations').value);
        
        // Show loading indicator
        noResults.style.display = 'none';
        resultsContainer.style.display = 'none';
        loadingIndicator.style.display = 'block';
        
        // Run the simulation
        fetch('/simulate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                variables,
                formulas,
                num_simulations: numSimulations
            })
        })
        .then(response => response.json())
        .then(results => {
            // Hide loading indicator
            loadingIndicator.style.display = 'none';
            
            if (results.error) {
                alert('Simulation Error: ' + results.error);
                return;
            }
            
            // Store results and update UI
            currentResults = results;
            updateResultsUI(results);
        })
        .catch(error => {
            console.error('Error running simulation:', error);
            loadingIndicator.style.display = 'none';
            alert('Error running simulation. See console for details.');
        });
    }
    
    // Update the results UI with simulation results
    function updateResultsUI(results) {
        // Show results container
        resultsContainer.style.display = 'block';
        
        // Generate output selector buttons
        outputSelector.innerHTML = '';
        
        const outputNames = Object.keys(results).filter(key => key !== 'sensitivity' && key !== 'samples');
        
        outputNames.forEach((name, index) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'btn ' + (index === 0 ? 'active' : '');
            btn.textContent = name;
            btn.addEventListener('click', function() {
                // Set active state
                outputSelector.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                
                // Update visualizations
                displayOutputResults(name, results);
            });
            
            outputSelector.appendChild(btn);
        });
        
        // Update the scatter plot dropdown options
        xVariableSelect.innerHTML = '';
        yVariableSelect.innerHTML = '';
        
        outputNames.forEach(name => {
            const xOption = document.createElement('option');
            xOption.value = name;
            xOption.textContent = name;
            
            const yOption = document.createElement('option');
            yOption.value = name;
            yOption.textContent = name;
            
            xVariableSelect.appendChild(xOption);
            yVariableSelect.appendChild(yOption);
        });
        
        if (outputNames.length >= 2) {
            yVariableSelect.selectedIndex = 1;
        }
        
        // Add event listeners for scatter plot selection changes
        xVariableSelect.addEventListener('change', updateScatterPlot);
        yVariableSelect.addEventListener('change', updateScatterPlot);
        
        // Show the first output by default
        if (outputNames.length > 0) {
            currentSelectedOutput = outputNames[0];
            displayOutputResults(outputNames[0], results);
            updateScatterPlot();
        }
    }
    
    // Display results for a specific output variable
    function displayOutputResults(outputName, results) {
        currentSelectedOutput = outputName;
        const outputData = results[outputName];
        
        // Update histogram
        updateHistogram(outputName, outputData);
        
        // Update CDF
        updateCDF(outputName, outputData);
        
        // Update sensitivity chart if available
        if (results.sensitivity && outputName === Object.keys(results).filter(key => key !== 'sensitivity' && key !== 'samples')[0]) {
            updateSensitivityChart(results.sensitivity);
        } else {
            document.getElementById('sensitivity-container').innerHTML = 
                '<div class="text-center text-muted p-5">Sensitivity analysis only available for primary output</div>';
        }
        
        // Update stats table
        updateStatsTable(outputData);
    }
    
    // Update the histogram visualization
    function updateHistogram(outputName, outputData) {
        const histogramContainer = document.getElementById('histogram-container');
        
        const trace = {
            x: outputData.bin_edges.slice(0, -1).map((val, i) => (val + outputData.bin_edges[i+1]) / 2),
            y: outputData.histogram,
            type: 'bar',
            marker: {
                color: 'rgba(0, 123, 255, 0.6)',
                line: {
                    color: 'rgba(0, 123, 255, 1)',
                    width: 1
                }
            },
            name: 'Frequency'
        };
        
        const layout = {
            title: `Distribution of ${outputName}`,
            xaxis: { title: outputName },
            yaxis: { title: 'Frequency' },
            bargap: 0.05
        };
        
        Plotly.newPlot(histogramContainer, [trace], layout);
    }
    
    // Update the CDF visualization
    function updateCDF(outputName, outputData) {
        const cdfContainer = document.getElementById('cdf-container');
        
        // Calculate CDF points from histogram data
        const binCenters = outputData.bin_edges.slice(0, -1).map((val, i) => (val + outputData.bin_edges[i+1]) / 2);
        let cdfY = [];
        let sum = 0;
        
        for (const count of outputData.histogram) {
            sum += count;
            cdfY.push(sum);
        }
        
        // Normalize CDF to be between 0 and 1
        const totalSum = cdfY[cdfY.length - 1];
        cdfY = cdfY.map(val => val / totalSum);
        
        // Add endpoints
        const xValues = [outputData.bin_edges[0], ...binCenters, outputData.bin_edges[outputData.bin_edges.length - 1]];
        const yValues = [0, ...cdfY, 1];
        
        const trace = {
            x: xValues,
            y: yValues,
            type: 'scatter',
            mode: 'lines',
            line: {
                color: 'rgba(0, 123, 255, 1)',
                width: 2
            },
            name: 'CDF'
        };
        
        const layout = {
            title: `Cumulative Distribution of ${outputName}`,
            xaxis: { title: outputName },
            yaxis: { 
                title: 'Probability',
                range: [0, 1]
            }
        };
        
        Plotly.newPlot(cdfContainer, [trace], layout);
    }
    
    // Update the sensitivity chart
    function updateSensitivityChart(sensitivity) {
        const sensitivityContainer = document.getElementById('sensitivity-container');
        
        // Sort variables by absolute sensitivity value
        const sortedVars = Object.keys(sensitivity).sort((a, b) => 
            Math.abs(sensitivity[b]) - Math.abs(sensitivity[a])
        );
        
        const trace = {
            y: sortedVars,
            x: sortedVars.map(varName => sensitivity[varName]),
            type: 'bar',
            orientation: 'h',
            marker: {
                color: sortedVars.map(varName => 
                    sensitivity[varName] >= 0 ? 'rgba(0, 123, 255, 0.6)' : 'rgba(220, 53, 69, 0.6)'
                ),
                line: {
                    color: sortedVars.map(varName => 
                        sensitivity[varName] >= 0 ? 'rgba(0, 123, 255, 1)' : 'rgba(220, 53, 69, 1)'
                    ),
                    width: 1
                }
            }
        };
        
        const layout = {
            title: 'Sensitivity Analysis (Correlation)',
            xaxis: { 
                title: 'Correlation Coefficient',
                range: [-1, 1]
            },
            yaxis: {
                title: ''
            }
        };
        
        Plotly.newPlot(sensitivityContainer, [trace], layout);
    }
    
    // Update the statistics table
    function updateStatsTable(outputData) {
        const statsTable = document.getElementById('stats-table');
        statsTable.innerHTML = '';
        
        const stats = [
            { name: 'Mean', value: outputData.mean.toFixed(4) },
            { name: 'Median', value: outputData.median.toFixed(4) },
            { name: 'Standard Deviation', value: outputData.std.toFixed(4) },
            { name: 'Minimum', value: outputData.min.toFixed(4) },
            { name: 'Maximum', value: outputData.max.toFixed(4) },
            { name: '1% Percentile', value: outputData.percentiles['1%'].toFixed(4) },
            { name: '5% Percentile', value: outputData.percentiles['5%'].toFixed(4) },
            { name: '10% Percentile', value: outputData.percentiles['10%'].toFixed(4) },
            { name: '25% Percentile', value: outputData.percentiles['25%'].toFixed(4) },
            { name: '75% Percentile', value: outputData.percentiles['75%'].toFixed(4) },
            { name: '90% Percentile', value: outputData.percentiles['90%'].toFixed(4) },
            { name: '95% Percentile', value: outputData.percentiles['95%'].toFixed(4) },
            { name: '99% Percentile', value: outputData.percentiles['99%'].toFixed(4) }
        ];
        
        stats.forEach(stat => {
            const row = document.createElement('tr');
            
            const nameCell = document.createElement('th');
            nameCell.textContent = stat.name;
            
            const valueCell = document.createElement('td');
            valueCell.textContent = stat.value;
            
            row.appendChild(nameCell);
            row.appendChild(valueCell);
            statsTable.appendChild(row);
        });
    }
    
    // Update the scatter plot
    function updateScatterPlot() {
        if (!currentResults || !currentResults.samples) return;
        
        const xVar = xVariableSelect.value;
        const yVar = yVariableSelect.value;
        
        if (!xVar || !yVar) return;
        
        const scatterContainer = document.getElementById('scatter-container');
        
        const trace = {
            x: currentResults.samples[xVar],
            y: currentResults.samples[yVar],
            mode: 'markers',
            type: 'scatter',
            marker: {
                color: 'rgba(0, 123, 255, 0.5)',
                size: 6
            }
        };
        
        const layout = {
            title: `Scatter Plot: ${yVar} vs ${xVar}`,
            xaxis: { title: xVar },
            yaxis: { title: yVar }
        };
        
        Plotly.newPlot(scatterContainer, [trace], layout);
    }
    
    // Save current scenario to localStorage
    function saveScenario() {
        const scenarioName = prompt('Enter a name for this scenario:');
        if (!scenarioName) return;
        
        // Collect all variable data
        const variables = Array.from(variablesContainer.querySelectorAll('.variable-item'))
            .map(getVariableData)
            .filter(Boolean);
        
        // Collect all formula data
        const formulas = Array.from(formulasContainer.querySelectorAll('.formula-item'))
            .map(getFormulaData)
            .filter(Boolean);
        
        // Get simulation count
        const numSimulations = parseInt(document.getElementById('num-simulations').value);
        
        // Create scenario object
        const scenario = {
            name: scenarioName,
            variables,
            formulas,
            numSimulations
        };
        
        // Save to localStorage
        let savedScenarios = JSON.parse(localStorage.getItem('monte-carlo-scenarios') || '{}');
        savedScenarios[scenarioName] = scenario;
        localStorage.setItem('monte-carlo-scenarios', JSON.stringify(savedScenarios));
        
        alert('Scenario saved successfully!');
    }
    
    // Load a saved scenario
    function loadScenario() {
        const savedScenarios = JSON.parse(localStorage.getItem('monte-carlo-scenarios') || '{}');
        const scenarioNames = Object.keys(savedScenarios);
        
        if (scenarioNames.length === 0) {
            alert('No saved scenarios found');
            return;
        }
        
        const scenarioName = prompt('Enter the name of the scenario to load:\n\nAvailable scenarios: ' + scenarioNames.join(', '));
        if (!scenarioName || !savedScenarios[scenarioName]) {
            if (scenarioName) alert('Scenario not found');
            return;
        }
        
        const scenario = savedScenarios[scenarioName];
        
        // Clear current setup
        variablesContainer.innerHTML = '';
        formulasContainer.innerHTML = '';
        
        // Load variables
        scenario.variables.forEach(variableData => {
            const variableElement = variableTemplate.content.cloneNode(true);
            const variableItem = variableElement.querySelector('.variable-item');
            
            variableItem.querySelector('.variable-name').value = variableData.name;
            
            const distTypeSelect = variableItem.querySelector('.distribution-type');
            distTypeSelect.value = variableData.distribution.type;
            
            const paramsContainer = variableItem.querySelector('.distribution-params');
            updateDistributionParams(variableData.distribution.type, paramsContainer);
            
            // Set parameter values
            const params = variableData.distribution.params;
            switch (variableData.distribution.type) {
                case 'normal':
                    variableItem.querySelector('.param-mean').value = params.mean;
                    variableItem.querySelector('.param-std').value = params.std;
                    break;
                case 'uniform':
                    variableItem.querySelector('.param-min').value = params.min;
                    variableItem.querySelector('.param-max').value = params.max;
                    break;
                case 'triangular':
                    variableItem.querySelector('.param-min').value = params.min;
                    variableItem.querySelector('.param-mode').value = params.mode;
                    variableItem.querySelector('.param-max').value = params.max;
                    break;
                case 'lognormal':
                    variableItem.querySelector('.param-mean').value = params.mean;
                    variableItem.querySelector('.param-sigma').value = params.sigma;
                    break;
                case 'beta':
                    variableItem.querySelector('.param-alpha').value = params.alpha;
                    variableItem.querySelector('.param-beta').value = params.beta;
                    break;
                case 'constant':
                    variableItem.querySelector('.param-value').value = params.value;
                    break;
            }
            
            // Setup distribution type change event
            distTypeSelect.addEventListener('change', function() {
                updateDistributionParams(this.value, paramsContainer);
            });
            
            // Setup remove button
            const removeBtn = variableItem.querySelector('.remove-variable');
            removeBtn.addEventListener('click', function() {
                variableItem.remove();
            });
            
            // Setup preview button
            const previewBtn = variableItem.querySelector('.preview-distribution');
            const previewChart = variableItem.querySelector('.preview-chart');
            
            previewBtn.addEventListener('click', function() {
                const varData = getVariableData(variableItem);
                if (varData) {
                    previewDistribution(varData.distribution, previewChart);
                }
            });
            
            variablesContainer.appendChild(variableElement);
        });
        
        // Load formulas
        scenario.formulas.forEach(formulaData => {
            const formulaElement = formulaTemplate.content.cloneNode(true);
            const formulaItem = formulaElement.querySelector('.formula-item');
            
            formulaItem.querySelector('.output-name').value = formulaData.output;
            formulaItem.querySelector('.formula-expression').value = formulaData.expression;
            
            // Setup remove button
            const removeBtn = formulaElement.querySelector('.remove-formula');
            removeBtn.addEventListener('click', function() {
                formulaItem.remove();
            });
            
            formulasContainer.appendChild(formulaElement);
        });
        
        // Set simulation count
        document.getElementById('num-simulations').value = scenario.numSimulations || 10000;
        
        alert('Scenario loaded successfully!');
    }
    
    // Add initial variable and formula
    addVariable();
    addFormula();
});