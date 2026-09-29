// Sunburst Chart Setup
const sunburstMargin = { top: 70, right: 40, bottom: 120, left: 40 };
let sunburstDataGlobal;
let currentZoomedNode = null; 
const aggregationThreshold = 0.05; 

// Initialization Function
function initialiseSunburst(data, Tooltip) {
  console.log("Initializing sunburst with data:", data);
  sunburstDataGlobal = data;
  
  d3.selectAll(".filterCheck").on("change", () => {
    drawSunburstChart(false, false, Tooltip); 
  });
  
  d3.select("#aggregateToggle").on("change", () => {
    drawSunburstChart(true, true, Tooltip); 
  });
  
  drawSunburstChart(false, false, Tooltip);
  
  window.addEventListener("resize", () => drawSunburstChart(false, false, Tooltip));
}


// Draw Sunburst Chart
function drawSunburstChart(enableTransition = false, maintainZoom = false, Tooltip) {
  console.log("Drawing sunburst chart... Transition:", enableTransition, "Maintain zoom:", maintainZoom);
  
  if (!sunburstDataGlobal || sunburstDataGlobal.length === 0) {
    console.error("No data available for sunburst chart");
    d3.select("#sunburst").select("svg").remove();
    d3.select("#sunburst").append("p").text("No data available");
    return;
  }
  
  // Determine Selected Filters
  const selectedFilters = [];
  d3.selectAll(".filterCheck").each(function () {
    const cb = d3.select(this);
    if (cb.property("checked")) selectedFilters.push(cb.property("value"));
  });
  
  console.log("Selected filters:", selectedFilters);

  const shouldAggregate = d3.select("#aggregateToggle").property("checked");
  
  // Store zoom path before rebuilding
  let zoomPath = [];
  if (maintainZoom && currentZoomedNode && currentZoomedNode.data) {
    let node = currentZoomedNode;
    while (node && node.data) {
      zoomPath.unshift(node.data.name);
      node = node.parent;
    }
    console.log("Zoom path to maintain:", zoomPath);
  }
  
  // Setup SVG with Responsive Dimensions
  const containerWidth = Math.min(document.getElementById("sunburst").clientWidth, 800) || 800;
  const containerHeight = containerWidth;
  const width = containerWidth - sunburstMargin.left - sunburstMargin.right;
  const height = containerHeight - sunburstMargin.top - sunburstMargin.bottom;
  const numLayers = selectedFilters.length + 1; 

  // Keep chart roughly same size regardless of layers
  const maxAvailableRadius = (width / 2) * 0.7;
  const radius = maxAvailableRadius / (numLayers + 0.7);

  console.log(`Chart dimensions: width=${width}, height=${height}, radius=${radius}, layers=${numLayers}`);
  
  const existingSvg = d3.select("#sunburst").select("svg");
  const isFirstDraw = existingSvg.empty();
  
  let svg;
  if (isFirstDraw || !enableTransition || maintainZoom) {
    // Clear and create new
    d3.select("#sunburst").select("svg").remove();
    svg = d3.select("#sunburst")
      .append("svg")
      .attr("width", width + sunburstMargin.left + sunburstMargin.right)
      .attr("height", height + sunburstMargin.top + sunburstMargin.bottom)
      .append("g")
      .attr("transform", `translate(${width / 2 + sunburstMargin.left}, ${height / 2 + sunburstMargin.top})`);
  } else {
    svg = existingSvg.select("g");
  }
  
  // Aggregate Small Categories
  function aggregateSmallCategories(items) {
    if (!shouldAggregate || items.length <= 3) return items;
    
    const total = d3.sum(items, d => d.value);
    const VALUE_THRESHOLD = total * aggregationThreshold;
    const major = [];
    const small = [];
    
    items.forEach(d => {
      if (d.value < VALUE_THRESHOLD) {
        small.push(d);
      } else {
        major.push(d);
      }
    });
    
    if (small.length > 0) {
      major.push({
        name: "Other",
        value: d3.sum(small, d => d.value),
        isAggregated: true,
        details: small.map(d => `${d.name}: ${d.value.toLocaleString()}`)
      });
    }
    
    return major;
  }
  
  let hierarchyData;
  
  if (selectedFilters.length === 0) {
    // 1 layer
    const aggregated = d3.rollups(
      sunburstDataGlobal,
      v => d3.sum(v, d => d.hospitalisation),
      d => d.roaduser || "unknown"
    ).map(([roaduser, value]) => ({ name: roaduser, value }));
    
    hierarchyData = { 
      name: "Total", 
      children: aggregateSmallCategories(aggregated) 
    };

  } else if (selectedFilters.length === 1) {
    // 2 layers
    const rolled = d3.rollups(
      sunburstDataGlobal,
      v => d3.sum(v, d => d.hospitalisation),
      d => d[selectedFilters[0]] || "unknown",
      d => d.roaduser || "unknown"
    );
    
    hierarchyData = {
      name: "Total",
      children: rolled.map(([filterVal, sub]) => {
        const children = sub.map(([roaduser, value]) => ({
          name: roaduser,
          value
        }));
        return {
          name: filterVal,
          children: aggregateSmallCategories(children)
        };
      })
    };

  } else if (selectedFilters.length === 2) {
    // 3 layers
    const rolled = d3.rollups(
      sunburstDataGlobal,
      v => d3.sum(v, d => d.hospitalisation),
      d => d[selectedFilters[0]] || "unknown",
      d => d[selectedFilters[1]] || "unknown",
      d => d.roaduser || "unknown"
    );
    
    hierarchyData = {
      name: "Total",
      children: rolled.map(([filter1Val, filter2Arr]) => ({
        name: filter1Val,
        children: filter2Arr.map(([filter2Val, roaduserArr]) => {
          const children = roaduserArr.map(([roaduser, value]) => ({
            name: roaduser,
            value
          }));
          return {
            name: filter2Val,
            children: aggregateSmallCategories(children)
          };
        })
      }))
    };
  }
  
  console.log("Hierarchy data:", hierarchyData);
  
  // Create Hierarchy and Partition
  const hierarchy = d3.hierarchy(hierarchyData)
    .sum(d => d.value)
    .sort((a, b) => b.value - a.value);
  
  const root = d3.partition()
    .size([2 * Math.PI, hierarchy.height + 1])
    (hierarchy);

  root.each(d => {
    d.uid = (d.parent ? d.parent.uid + "-" : "") + d.data.name;
  });
  
  root.each(d => {
    d.current = {
      x0: d.x0,
      x1: d.x1,
      y0: d.y0,
      y1: d.y1
    };
  });
  
  console.log("Root hierarchy height:", hierarchy.height, "Visible layers:", hierarchy.height);
  
  // Restore zoom if maintaining
  let nodeToZoom = root;
  if (maintainZoom && zoomPath.length > 1) {
    let tempNode = root;
    for (let i = 1; i < zoomPath.length; i++) {
      const found = (tempNode.children || []).find(c => c.data.name === zoomPath[i]);
      if (found) {
        tempNode = found;        
      } else {
        console.log(`Node "${zoomPath[i]}" not found, stopping at "${tempNode.data.name}"`);
        break;
      }
    }
    nodeToZoom = tempNode;
    console.log("Restored zoom to:", nodeToZoom.data.name);
  } 
  
  // Calculate zoom state
  if (nodeToZoom !== root) {
    root.each(d => {
      const p = nodeToZoom;
      d.current = {
        x0: Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
        x1: Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
        y0: Math.max(0, d.y0 - p.depth),
        y1: Math.max(0, d.y1 - p.depth)
      };
    });
  }
  
  currentZoomedNode = nodeToZoom;
  

  // Color Scale 
  const colorSchemes = {
    categorical: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', 
                  '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf',
                  '#aec7e8', '#ffbb78', '#98df8a', '#ff9896', '#c5b0d5']
  };

  function getColorScale(node) {
    const children = node.children || [];
    return d3.scaleOrdinal()
      .domain(children.map(d => d.data.name))
      .range(colorSchemes.categorical);
  }

  // Initialize colorScale for the current zoom level
  let colorScale = getColorScale(nodeToZoom);
    
  // Arc Generator
  const arc = d3.arc()
    .startAngle(d => d.x0)
    .endAngle(d => d.x1)
    .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005))
    .padRadius(radius * 1.5)
    .innerRadius(d => d.y0 * radius)
    .outerRadius(d => Math.max(d.y0 * radius, d.y1 * radius - 1));
  
  // Draw Arcs
  const pathGroup = svg.selectAll("g.arc-group").data([null]).join("g").attr("class", "arc-group");
  
  const path = pathGroup
    .selectAll("path")
    .data(root.descendants().slice(1), d => d.uid)    
    .join(
      enter => enter.append("path")
        .attr("fill", d => {
          while (d.depth > nodeToZoom.depth + 1) d = d.parent;
          return colorScale(d.data.name);
        })
        .attr("fill-opacity", d => arcVisible(d.current) ? (d.children ? 0.7 : 0.9) : 0)
        .attr("pointer-events", d => arcVisible(d.current) ? "auto" : "none")
        .attr("d", d => arc(d.current))
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5),
      update => update,
      exit => exit.remove()
    );
  
  // Make clickable if they have children
  path.filter(d => d.children)
    .style("cursor", "pointer")
    .on("click", clicked);
  
  // Highlight on Hover
  let isTransitioning = false;

  path.on("mouseenter", function(event, d) {
    if (isTransitioning) return;
    
    const currentColor = d3.select(this).attr("fill");
    
    d3.select(this)
      .raise() 
      .transition()
      .duration(150)
      .attr("fill-opacity", 1)
      .attr("stroke", "#000")
      .attr("stroke-width", 3)
      .attr("fill", d3.color(currentColor).brighter(0.3));
    
    const pathArray = d.ancestors().map(a => a.data.name).reverse().slice(1);
    let txt = `<strong>${pathArray.join(" → ")}</strong><br>${d.value.toLocaleString()} hospitalisations`;
    
    if (d.data.isAggregated && d.data.details) {
      txt += `<br><br><em>Includes:</em><br>${d.data.details.join("<br>")}`;
    }
    
    Tooltip.show(event, txt);
    highlightLegendItem(d);
  })
  .on("mousemove", event => {
    if (isTransitioning) return;
    Tooltip.move(event);
  })
  .on("mouseleave", function(event, d) {
    if (isTransitioning) return;
    
    const originalColor = (() => {
      let node = d;
      while (node.depth > currentZoomedNode.depth + 1) node = node.parent;
      return colorScale(node.data.name);
    })();
    
    d3.select(this)
      .transition()
      .duration(150)
      .attr("fill-opacity", arcVisible(d.current) ? (d.children ? 0.7 : 0.9) : 0)
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .attr("fill", originalColor);
    
    Tooltip.hide();
    resetLegend();
  });
  
  // Labels
  const labelGroup = svg.selectAll("g.label-group").data([null]).join("g")
    .attr("class", "label-group")
    .attr("pointer-events", "none")
    .attr("text-anchor", "middle")
    .style("user-select", "none");
  
  const label = labelGroup
    .selectAll("text")
    .data(root.descendants().slice(1), d => d.uid)
    .join("text")
    .attr("dy", "0.35em")
    .attr("fill-opacity", d => +labelVisible(d.current))
    .attr("transform", d => labelTransform(d.current))
    .style("font-size", "9px")
    .style("font-weight", "500")
    .style("fill", "#222")
    .text(d => d.data.name);
  
  // Center Circle for Zoom Out
  const parent = svg.selectAll("circle.center-circle").data([null]).join("circle")
    .attr("class", "center-circle")
    .datum(nodeToZoom)
    .attr("r", radius)
    .attr("fill", "none")
    .attr("pointer-events", "all")
    .style("cursor", "pointer")
    .on("click", (event, d) => {
    if (currentZoomedNode !== root) {
      clicked(event, d);
    }
  });
  
  // Center Label
  const centerLabel = svg.selectAll("text.center-label").data([null]).join("text")
    .attr("class", "center-label")
    .datum(nodeToZoom)
    .attr("text-anchor", "middle")
    .attr("dy", "0.35em")
    .style("font-size", "13px")
    .style("font-weight", "600")
    .style("fill", "#555")
    .style("pointer-events", "none")
    .text(nodeToZoom === root ? "Click to explore" : nodeToZoom.data.name);
  
  // Chart Title
  svg.selectAll("text.chart-title").data([null]).join("text")
    .attr("class", "chart-title")
    .attr("text-anchor", "middle")
    .attr("y", -height / 2 - 10)
    .style("font-size", "18px")
    .style("font-weight", "bold")
    .style("fill", "#333")
    .text("Hospitalisations by Road User");
  
  // Legend 
  const legendG = svg.selectAll("g.legend-group").data([null]).join("g")
    .attr("class", "legend-group")
    .attr("transform", `translate(-${width / 2 - 20}, ${height / 2 + 40})`);
  
  function updateLegend(node) {
    const legendData = node.children || [];
    const maxItemsPerRow = 5;
    const minItemWidth = 120;
    const availableWidth = width - 40;
    const legendItemsPerRow = Math.min(maxItemsPerRow, Math.max(1, Math.floor(availableWidth / minItemWidth)));
    const legendItemWidth = Math.floor(availableWidth / legendItemsPerRow);
    const legendItemHeight = 25;
    
    console.log(`Legend: ${legendData.length} items, ${legendItemsPerRow} per row, ${legendItemWidth}px width`);
    
    // Clear existing legend
    legendG.selectAll("*").remove();
    
    // Update color scale for current level
    colorScale = getColorScale(node);
    
    const legendItems = legendG.selectAll(".legend-item")
      .data(legendData)
      .join("g")
      .attr("class", "legend-item")
      .attr("transform", (d, i) => {
        const row = Math.floor(i / legendItemsPerRow);
        const col = i % legendItemsPerRow;
        return `translate(${col * legendItemWidth}, ${row * legendItemHeight})`;
      })
      .style("cursor", d => d.children ? "pointer" : "default")
      .on("mouseover", function(event, d) {
        if (isTransitioning) return;
        
        path.transition()
          .duration(200)
          .attr("fill-opacity", p => {
            let compareNode = p;
            while (compareNode.depth > node.depth + 1) compareNode = compareNode.parent;
            if (compareNode.depth === node.depth + 1) {
              return compareNode.data.name === d.data.name ? 1 : 0.2;
            }
            return arcVisible(p.current) ? (p.children ? 0.7 : 0.9) : 0;
          });
        
        d3.select(this).select("rect")
          .transition()
          .duration(200)
          .attr("stroke", "#333")
          .attr("stroke-width", 2);
      })
      .on("mouseout", function() {
        if (isTransitioning) return;
        
        path.transition()
          .duration(200)
          .attr("fill-opacity", d => arcVisible(d.current) ? (d.children ? 0.7 : 0.9) : 0);
        
        d3.select(this).select("rect")
          .transition()
          .duration(200)
          .attr("stroke", "none");
      })
      .on("click", function(event, d) {
        if (d.children) {
          clicked(event, d);
        }
      });
    
    legendItems.append("rect")
      .attr("width", 16)
      .attr("height", 16)
      .attr("fill", d => colorScale(d.data.name))
      .attr("rx", 3);
    
    legendItems.append("text")
      .attr("x", 22)
      .attr("y", 12)
      .text(d => {
        const maxLength = Math.floor((legendItemWidth - 30) / 7);
        return d.data.name.length > maxLength 
          ? d.data.name.substring(0, maxLength - 3) + "..." 
          : d.data.name;
      })
      .style("font-size", "11px")
      .style("fill", "#333")
      .attr("alignment-baseline", "middle");
  }
  
  updateLegend(nodeToZoom);
  
  // Zoom Handler
  function clicked(event, p) {
    isTransitioning = true;
    Tooltip.hide();
    
    parent.datum(p.parent || root);
    currentZoomedNode = p;
    
    root.each(d => d.target = {
      x0: Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
      x1: Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
      y0: Math.max(0, d.y0 - p.depth),
      y1: Math.max(0, d.y1 - p.depth)
    });
    
    // Update colors based on new root
    colorScale = getColorScale(p);

    const t = svg.transition().duration(750);
    
    // Transition the arcs
    path.transition(t)
      .tween("data", d => {
        const i = d3.interpolate(d.current, d.target);
        return t => d.current = i(t);
      })
      .filter(function(d) {
        return +this.getAttribute("fill-opacity") || arcVisible(d.target);
      })
      .attr("fill", d => {
        let node = d;
        while (node.depth > p.depth + 1) node = node.parent;
        if (node.depth === p.depth + 1) {
          return colorScale(node.data.name);
        }
        return colorScale(d.data.name);
      })
      .attr("fill-opacity", d => arcVisible(d.target) ? (d.children ? 0.7 : 0.9) : 0)
      .attr("pointer-events", d => arcVisible(d.target) ? "auto" : "none")
      .attrTween("d", d => () => arc(d.current))
      .on("end", function() {
        isTransitioning = false;
      });
    
    // Transition the labels
    label.filter(function(d) {
      return +this.getAttribute("fill-opacity") || labelVisible(d.target);
    })
    .transition(t)
      .attr("fill-opacity", d => +labelVisible(d.target))
      .attrTween("transform", d => () => labelTransform(d.current));
    
    // Update center label
    centerLabel
      .transition(t)
      .text(p === root ? "Click to explore" : p.data.name);
    
    // Update legend for new level
    t.on("end", function() {
      updateLegend(p);
    });
  }

  // Visibility Helper Functions
  function arcVisible(d) {
    return d.y1 <=  root.height + 1 && d.y0 >= 1 && d.x1 > d.x0;
  }
  
  function labelVisible(d) {
    return d.y1 <=  root.height + 1 && d.y0 >= 1 && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.03;
  }
  
  function labelTransform(d) {
    const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
    const y = (d.y0 + d.y1) / 2 * radius;
    return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
  }
  
  // legend interaction
  function highlightLegendItem(d) {
    let topNode = d;
    while (topNode.depth > currentZoomedNode.depth + 1) topNode = topNode.parent;
    
    legendG.selectAll(".legend-item")
      .transition()
      .duration(200)
      .style("opacity", function() {
        const legendData = d3.select(this).datum();
        return legendData && legendData.data.name === topNode.data.name ? 1 : 0.3;
      });
  }
  
  function resetLegend() {
    legendG.selectAll(".legend-item")
      .transition()
      .duration(200)
      .style("opacity", 1);
  }
  
  console.log("Sunburst chart drawn successfully");
  console.log("Number of visible layers:", hierarchy.height);
  console.log("Current zoom level:", currentZoomedNode.data.name);
}