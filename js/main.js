// Heatmap
const heatmapWidth = 420;
const heatmapHeight = 300;
const heatmapMargin = 20;

const heatmapSVG = d3.select("#heatmap")
    .append("svg")
    .attr("width", heatmapWidth)
    .attr("height", heatmapHeight);

Promise.all([
    d3.json("data/la.geojson"),
    d3.csv("data/la_schools.csv", d => ({
        school: d.school,
        latitude: +d.latitude,
        longitude: +d.longitude,
        score: +d.score,
        income: +d.income,
        funding: +d.funding,
        enrollment: +d.enrollment,
        white: +d.white,
        asian: +d.asian,
        black: +d.black,
        hispanic: +d.hispanic,
        other: +d.other,
        minority: +d.minority
    }))
]).then(([geoData, data]) => {
    const validData = data.filter(d =>
        !isNaN(d.latitude) && !isNaN(d.longitude)
    );

    console.log("validData count:", validData.length);
    console.log("first valid row:", validData[0]);

    // Build a GeoJSON from school points so projection definitely fits the data
    const schoolPointsGeoJSON = {
        type: "FeatureCollection",
        features: validData.map(d => ({
            type: "Feature",
            geometry: {
                type: "Point",
                coordinates: [d.longitude, d.latitude]
            },
            properties: d
        }))
    };

    const projection = d3.geoMercator()
        .fitExtent(
            [[heatmapMargin, heatmapMargin], [heatmapWidth - heatmapMargin, heatmapHeight - heatmapMargin]],
            schoolPointsGeoJSON
        );

    const path = d3.geoPath().projection(projection);

    // Draw county boundary
    heatmapSVG.selectAll("path")
        .data(geoData.features)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("fill", "#bebebe")     // light gray fill
        .attr("opacity", 0.25)       // keep it subtle
        .attr("stroke", "#888")      // keep your border
        .attr("stroke-width", 1.2);

    // Color scale
    const colorScale = d3.scaleSequential()
        .domain(d3.extent(validData, d => d.income))
        .interpolator(d3.interpolateYlOrRd);

    // Draw schools
    heatmapSVG.selectAll("circle")
        .data(validData)
        .enter()
        .append("circle")
        .attr("cx", d => projection([d.longitude, d.latitude])[0])
        .attr("cy", d => projection([d.longitude, d.latitude])[1])
        .attr("r", 6)
        .attr("fill", d => colorScale(d.income))
        .attr("opacity", 0.85)
        .attr("stroke", "#333")
        .attr("stroke-width", 0.5)
        .attr("stroke", "none")
        .on("mouseover", function(event, d) {
            d3.select(this)
                .attr("stroke", "black")
                .attr("stroke-width", 1.5);

            d3.select("#details").text(
                `${d.school} | Median Income: $${d.income.toLocaleString()} | Avg SAT: ${d.score}`
            );
        })
        .on("mouseout", function() {
            d3.select(this)
                .attr("stroke", "none");

            d3.select("#details")
                .text("Hover over a data point to see school details");
        });

    // Legend
    const legendWidth = 120;
    const legendHeight = 10;

    const legend = heatmapSVG.append("g")
        .attr("transform", `translate(20, ${heatmapHeight - 40})`)

    const gradient = heatmapSVG.append("defs")
        .append("linearGradient")
        .attr("id", "legend-gradient");

    gradient.selectAll("stop")
        .data(d3.range(0, 1.01, 0.1))
        .enter()
        .append("stop")
        .attr("offset", d => `${d * 100}%`)
        .attr("stop-color", d => colorScale(
            d3.interpolate(
                d3.min(validData, d => d.income),
                d3.max(validData, d => d.income)
            )(d)
        ));

    legend.append("rect")
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#legend-gradient)");

    legend.append("text")
        .attr("x", 0)
        .attr("y", -5)
        .attr("font-size", 10)
        .text("Median Income ($)");

    legend.append("text")
        .attr("x", 0)
        .attr("y", 25)
        .attr("font-size", 10)
        .text(Math.round(d3.min(validData, d => d.income)));

    legend.append("text")
        .attr("x", legendWidth)
        .attr("y", 25)
        .attr("text-anchor", "end")
        .attr("font-size", 10)
        .text(Math.round(d3.max(validData, d => d.income)));

    // Title
    heatmapSVG.append("text")
        .attr("x", heatmapWidth / 2)
        .attr("y", 10)
        .attr("text-anchor", "middle")
        .attr("font-size", 12)
        .attr("font-weight", "bold")
        .text("LA High Schools by Median Income");

}).catch(err => console.error("Map error:", err));


// Scatterplot
const scatterWidth = 420;
const scatterHeight = 300;
const margin = { top: 35, right: 20, bottom: 60, left: 70 };

const innerWidth = scatterWidth - margin.left - margin.right;
const innerHeight = scatterHeight - margin.top - margin.bottom;

const scatterSVG = d3.select("#scatter")
    .append("svg")
    .attr("width", scatterWidth)
    .attr("height", scatterHeight);

const scatterGroup = scatterSVG.append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

d3.csv("data/la_schools.csv", d => ({
    school: d.school,
    latitude: +d.latitude,
    longitude: +d.longitude,
    score: +d.score,
    income: +d.income,
    funding: +d.funding,
    enrollment: +d.enrollment,
    white: +d.white,
    asian: +d.asian,
    black: +d.black,
    hispanic: +d.hispanic,
    other: +d.other,
    minority: +d.minority
})).then(data => {
    const validData = data.filter(d => !isNaN(d.income) && !isNaN(d.score));

    const opacityScale = d3.scaleLinear()
        .domain(d3.extent(validData, d => d.income))
        .range([0.2, 0.99]);

    const x = d3.scaleLinear()
        .domain(d3.extent(validData, d => d.income))
        .nice()
        .range([0, innerWidth]);

    const y = d3.scaleLinear()
        .domain(d3.extent(validData, d => d.score))
        .nice()
        .range([innerHeight, 0]);

    const xAxis = d3.axisBottom(x)
        .ticks(5)
        .tickFormat(d3.format("$.2s"));

    const yAxis = d3.axisLeft(y)
        .ticks(6);

    scatterGroup.append("g")
        .attr("transform", `translate(0, ${innerHeight})`)
        .call(xAxis);

    scatterGroup.append("g")
        .call(yAxis);

    scatterGroup.selectAll("circle")
        .data(validData)
        .enter()
        .append("circle")
        .attr("cx", d => x(d.income))
        .attr("cy", d => y(d.score))
        .attr("r", 5)
        .attr("fill", "steelblue")
        .attr("opacity", d => opacityScale(d.income))
        .on("mouseover", function(event, d) {
            d3.select(this)
                .attr("fill", "red")
                .attr("r", 7);

            d3.select("#details")
                .text(`${d.school} | Median Income: $${d.income.toLocaleString()} | Avg SAT: ${d.score}`);
        })
        .on("mouseout", function() {
            d3.select(this)
                .attr("fill", "steelblue")
                .attr("r", 5);

            d3.select("#details")
                .text("Hover over a data point to see school details");
        });

    // x-axis label
    scatterSVG.append("text")
        .attr("x", scatterWidth / 2)
        .attr("y", scatterHeight - 10)
        .attr("text-anchor", "middle")
        .attr("font-size", 12)
        .text("Median Household Income ($)");

    // y-axis label
    scatterSVG.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -scatterHeight / 2)
        .attr("y", 20)
        .attr("text-anchor", "middle")
        .attr("font-size", 12)
        .text("Average SAT Score");

    // title
    scatterSVG.append("text")
        .attr("x", scatterWidth / 2)
        .attr("y", 18)
        .attr("text-anchor", "middle")
        .attr("font-size", 14)
        .attr("font-weight", "bold")
        .text("Income vs Test Score");
});