// Setup chart container, dimensions, and margins for each chart
const margins = { top: 40, right: 40, bottom: 70, left: 75 };
const chartHeight = 400 - margins.top - margins.bottom;
let dataGlobal, filteredData;

function initializeDashboard(data, Tooltip) {
  console.log("Initializing dashboard with data:", data);
  dataGlobal = data;
  filteredData = data; 
  setupYearDropdown(dataGlobal, Tooltip);

  drawBarChart(Tooltip); 
  drawLineChart(Tooltip);         
  drawDayOfWeekChart(Tooltip);   
  drawScatterPlot(Tooltip);       

  // reset button
  const resetButton = document.getElementById("resetButton");
  if (resetButton) {
    resetButton.addEventListener("click", () => redrawDashboard(Tooltip));
  } else {
    console.error("Reset button not found!");
  }

  window.addEventListener('resize', () => {
    drawBarChart(Tooltip);    
    drawLineChart(Tooltip);  
    drawDayOfWeekChart(Tooltip); 
    drawScatterPlot(Tooltip);  
  });
};

// redraw the charts
function redrawDashboard(Tooltip, newData = dataGlobal) {
  filteredData = newData;

  drawBarChart(Tooltip);
  drawLineChart(Tooltip);
  drawDayOfWeekChart(Tooltip);
  drawScatterPlot(Tooltip);

  const select = document.getElementById("yearDropdown");
  if (select) select.value = "all";

  console.log("Dashboard reset to full data.");
}

// highlight selected year 
function highlightSelectedYear(year) {
  d3.selectAll(".yearBar")
    .transition()
    .duration(300)
    .ease(d3.easeCubicOut)
    .attr("fill", d => (d.key == year ? "#1f77b4" : "#8ab9df")) 
    .attr("stroke", d => (d.key == year ? "#000" : "none"))
    .attr("stroke-width", d => (d.key == year ? 1.5 : 0));
}

// Bar Chart: Total Incidents per Year 
function drawBarChart(Tooltip, selectedYear = null, dataForBars = dataGlobal) {
  d3.select("#year_barchart").select("svg").remove(); 

  const width = Math.min(650, window.innerWidth * 0.8) - margins.left - margins.right;
  const svg = d3.select("#year_barchart")
    .append("svg")
    .attr("width", width + margins.left + margins.right)
    .attr("height", chartHeight + margins.top + margins.bottom)
    .append("g")
    .attr("transform", `translate(${margins.left},${margins.top})`);

  const incidentsByYear = Array.from(
    d3.group(dataForBars, d => d.Year), 
    ([year, values]) => ({ key: year, value: d3.sum(values, d => d.Count) })
  );

  const x = d3.scaleBand()
    .domain(incidentsByYear.map(d => d.key))
    .range([0, width])
    .padding(0.3);

  const y = d3.scaleLinear()
    .domain([0, d3.max(incidentsByYear, d => d.value) * 1.1])
    .nice()
    .range([chartHeight, 0]);

  const xAxis = svg.append("g")
  .attr("transform", `translate(0, ${chartHeight})`)
  .call(d3.axisBottom(x).tickSize(0));

  // Rotate x-axis labels
  xAxis.selectAll("text")
    .attr("transform", "rotate(-45)")   
    .style("text-anchor", "end")      
    .style("font-size", "12px");    

  svg.append("g")
    .call(d3.axisLeft(y));

  svg.selectAll("rect")
    .data(incidentsByYear)
    .enter()
    .append("rect")
    .attr("class", "yearBar")
    .attr("x", d => x(d.key))
    .attr("y", d => y(d.value))
    .attr("width", x.bandwidth())
    .attr("height", d => chartHeight - y(d.value))
    .attr("fill", "#1f77b4")
    .on("mouseover", (event, d) => {
      Tooltip.show(
        event,
        `<strong>Year:</strong> ${d.key}<br><strong>Incidents:</strong> ${d.value}`
      );
    })
    .on("mousemove", event => Tooltip.move(event))
    .on("mouseout", () => Tooltip.hide())
    .on("click", (event, d) => { 
      const selectedYear = d.key;
      console.log("Year selected:", selectedYear);

      const filtered = dataGlobal.filter(d => d.Year === selectedYear);
      filteredData = filtered; 

      drawLineChart(Tooltip, filtered);
      drawDayOfWeekChart(Tooltip, filtered);
      drawScatterPlot(Tooltip, filtered);

      document.getElementById("yearDropdown").value = selectedYear;
      highlightSelectedYear(selectedYear);
    });

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", chartHeight + 50)
    .attr("text-anchor", "middle")
    .text("Year");

  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -chartHeight / 2)
    .attr("y", -60)
    .attr("text-anchor", "middle")
    .text("Total Incidents");

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", -10)  
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .style("font-weight", "bold")
    .text("Total Incidents Per Year (2000-2025)");

  if (selectedYear !== null) {
    highlightSelectedYear(selectedYear);
  }
}

// Line Chart: Monthly Trends
function drawLineChart(Tooltip) {
  d3.select("#linechart").select("svg").remove();

  const width = Math.min(650, window.innerWidth * 0.8) - margins.left - margins.right;
  const svg = d3.select("#linechart")
    .append("svg")
    .attr("width", width + margins.left + margins.right)
    .attr("height", chartHeight + margins.top + margins.bottom)
    .append("g")
    .attr("transform", `translate(${margins.left},${margins.top})`);

  const incidentsByMonth = Array.from(
    d3.group(filteredData, d => d.Month), 
    ([month, values]) => ({ key: month, value: d3.sum(values, d => d.Count) })
  );

  const x = d3.scaleBand()
    .domain(incidentsByMonth.map(d => d.key))
    .range([0, width])
    .padding(0.3);

  const y = d3.scaleLinear()
    .domain([0, d3.max(incidentsByMonth, d => d.value) * 1.1])
    .nice()
    .range([chartHeight, 0]);

  svg.append("g")
    .attr("transform", `translate(0, ${chartHeight})`)
    .call(d3.axisBottom(x));

  svg.append("g")
    .call(d3.axisLeft(y));

  const line = d3.line()
    .x(d => x(d.key))
    .y(d => y(d.value));

  svg.append("path")
    .data([incidentsByMonth])
    .attr("fill", "none")
    .attr("stroke", "#ff7f0e")
    .attr("stroke-width", 2)
    .attr("d", line);

  svg.selectAll("circle")
  .data(incidentsByMonth)
  .enter()
  .append("circle")
  .attr("cx", d => x(d.key))
  .attr("cy", d => y(d.value))
  .attr("r", 3)
  .attr("fill", "#ff7f0e")
  .on("mouseover", (event, d) => {
    Tooltip.show(
      event,
      `<strong>Month:</strong> ${d.key}<br><strong>Incidents:</strong> ${d.value}`
    );
  })
  .on("mousemove", event => Tooltip.move(event))
  .on("mouseout", () => Tooltip.hide());

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", chartHeight + 50)
    .attr("text-anchor", "middle")
    .text("Month");

  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -chartHeight / 2)
    .attr("y", -60)
    .attr("text-anchor", "middle")
    .text("Total Incidents");

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", -10)  
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .style("font-weight", "bold")
    .text("Monthly Incident Trends");
}

// Bar Chart: Day of the Week Distribution
function drawDayOfWeekChart(Tooltip) {
  d3.select("#dayofweekchart").select("svg").remove();

  const width = Math.min(650, window.innerWidth * 0.8) - margins.left - margins.right;
  const svg = d3.select("#dayofweekchart")
    .append("svg")
    .attr("width", width + margins.left + margins.right)
    .attr("height", chartHeight + margins.top + margins.bottom)
    .append("g")
    .attr("transform", `translate(${margins.left},${margins.top})`);

  const incidentsByDay = Array.from(
    d3.group(filteredData, d => d.Day), 
    ([day, values]) => ({ key: day, value: d3.sum(values, d => d.Count) })
  );

  const x = d3.scaleLinear()
    .domain([0, d3.max(incidentsByDay, d => d.value) * 1.1])
    .nice()
    .range([0, width]);

  const y = d3.scaleBand()
    .domain(incidentsByDay.map(d => d.key))
    .range([0, chartHeight])
    .padding(0.3);

  svg.append("g")
    .call(d3.axisLeft(y));

  svg.append("g")
    .attr("transform", `translate(0, ${chartHeight})`)
    .call(d3.axisBottom(x));

  svg.selectAll("rect")
    .data(incidentsByDay)
    .enter()
    .append("rect")
    .attr("x", 0)
    .attr("y", d => y(d.key))
    .attr("width", d => x(d.value))
    .attr("height", y.bandwidth())
    .attr("fill", "#2ca02c")
    .on("mouseover", (event, d) => {
      Tooltip.show(
        event,
        `<strong>Day:</strong> ${d.key}<br><strong>Incidents:</strong> ${d.value}`
      );
    })
    .on("mousemove", event => Tooltip.move(event))
    .on("mouseout", () => Tooltip.hide());

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", chartHeight + 50)
    .attr("text-anchor", "middle")
    .text("Total Incidents");

  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -chartHeight / 2)
    .attr("y", -60)
    .attr("text-anchor", "middle")
    .text("Day of the Week");

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", -10)  
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .style("font-weight", "bold")
    .text("Incidents by Day of the Week");
}

// Scatter Plot: Time of Day 
function drawScatterPlot(Tooltip) {
  d3.select("#scatterplot").select("svg").remove();

  const width = Math.min(650, window.innerWidth * 0.8) - margins.left - margins.right;
  const svg = d3.select("#scatterplot")
    .append("svg")
    .attr("width", width + margins.left + margins.right)
    .attr("height", chartHeight + margins.top + margins.bottom)
    .append("g")
    .attr("transform", `translate(${margins.left},${margins.top})`);

  // Converting and aggregating by Time of Day
  const incidentsByTime = Array.from(
    d3.group(filteredData, d => {
      const timeParts = d.Time.split(":");
      return +timeParts[0] * 60 + +timeParts[1];
    }), 
    ([time, values]) => ({ time: time, count: d3.sum(values, d => d.Count) })
  );

  const x = d3.scaleLinear()
    .domain([0, 24 * 60]) 
    .range([0, width]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(incidentsByTime, d => d.count) * 1.1])
    .nice()
    .range([chartHeight, 0]);

  svg.selectAll("circle")
    .data(incidentsByTime)
    .enter()
    .append("circle")
    .attr("cx", d => x(d.time))
    .attr("cy", d => y(d.count))
    .attr("r", 3)
    .attr("fill", "#d62728")
    .on("mouseover", (event, d) => {
      const hh = String(Math.floor(d.time / 60)).padStart(2, "0");
      const mm = String(d.time % 60).padStart(2, "0");
      Tooltip.show(
        event,
        `<strong>Time:</strong> ${hh}:${mm}<br><strong>Incidents:</strong> ${d.count}`
      );
    })
    .on("mousemove", event => Tooltip.move(event))
    .on("mouseout", () => Tooltip.hide());

  svg.append("g")
    .attr("transform", `translate(0, ${chartHeight})`)
    .call(d3.axisBottom(x).ticks(5).tickFormat(d => {
      const hours = Math.floor(d / 60);
      const minutes = d % 60;
      return `${hours}:${minutes < 10 ? '0' : ''}${minutes}`;
    }));

  svg.append("g")
    .call(d3.axisLeft(y));

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", chartHeight + 50)
    .attr("text-anchor", "middle")
    .text("Time of Day");

  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -chartHeight / 2)
    .attr("y", -60)
    .attr("text-anchor", "middle")
    .text("Total Incidents");

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", -10)  
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .style("font-weight", "bold")
    .text("Incidents by Time of Day");
}
