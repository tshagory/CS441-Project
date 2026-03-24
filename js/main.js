const mapMarkersBySchool = {};
const scatterDotsBySchool = {};

function highlightSchool(schoolName) {
    const mapMarker = mapMarkersBySchool[schoolName];
    const scatterDot = scatterDotsBySchool[schoolName];

    if (mapMarker) {
        mapMarker.setStyle({
            color: "black",
            weight: 1.5
        });
    }

    if (scatterDot) {
        scatterDot
            .attr("fill", "red")
            .attr("r", 7);
    }
}

function resetSchoolHighlight(schoolName) {
    const mapMarker = mapMarkersBySchool[schoolName];
    const scatterDot = scatterDotsBySchool[schoolName];

    if (mapMarker) {
        mapMarker.setStyle({
            color: "#333",
            weight: 0.5
        });
    }

    if (scatterDot) {
        scatterDot
            .attr("fill", "steelblue")
            .attr("r", 5);
    }
}

function showSchoolDetails(d) {
    d3.select("#details").text(
        `${d.school} | Median Income: $${d.income.toLocaleString()} | Avg SAT: ${d.score}`
    );
}

function resetSchoolDetails() {
    d3.select("#details")
        .text("Hover over a data point to see school details");
}

// LEAFLET MAP (replaces D3 heatmap)

const map = L.map("heatmap", {
    zoomControl: true,
    scrollWheelZoom: false,
});

// Add basemap
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
    minZoom: 9,
    maxZoom: 15
}).addTo(map);

// Load data
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

    const validData = data.filter(d =>
        !isNaN(d.latitude) &&
        !isNaN(d.longitude) &&
        !isNaN(d.income)
    );

    const colorScale = d3.scaleSequential()
        .domain(d3.extent(validData, d => d.income))
        .interpolator(d3.interpolateYlOrRd);

    const bounds = [];

    validData.forEach(d => {
        const marker = L.circleMarker([d.latitude, d.longitude], {
            radius: 6,
            fillColor: colorScale(d.income),
            fillOpacity: 0.85,
            color: "#333",
            weight: 0.5
        }).addTo(map);

        mapMarkersBySchool[d.school] = marker;

        bounds.push([d.latitude, d.longitude]);

        // Hover interaction (same as your D3 logic)
        marker.on("mouseover", function() {
            highlightSchool(d.school);
            showSchoolDetails(d);
        });

        marker.on("mouseout", function() {
            resetSchoolHighlight(d.school);
        });
    });

    // Fit map to data
    if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [20, 20] });

        const fittedBounds = L.latLngBounds(bounds).pad(0.25);
        map.setMaxBounds(fittedBounds);
    }

    // Simple legend (replaces your SVG legend)
    const legend = L.control({ position: "bottomleft" });

    legend.onAdd = function () {
        const div = L.DomUtil.create("div");
        div.style.background = "white";
        div.style.padding = "8px";
        div.style.borderRadius = "6px";
        div.style.boxShadow = "0 1px 4px rgba(0,0,0,0.2)";
        div.innerHTML = `
            <div style="font-size:12px; margin-bottom:6px;">Median Income ($)</div>
            <div style="width:120px; height:10px;
                 background: linear-gradient(to right, #ffffcc, #fd8d3c, #bd0026);">
            </div>
            <div style="display:flex; justify-content:space-between; font-size:11px; margin-top:4px;">
                <span>${Math.round(d3.min(validData, d => d.income))}</span>
                <span>${Math.round(d3.max(validData, d => d.income))}</span>
            </div>
        `;
        return div;
    };

    legend.addTo(map);

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
        .each(function(d) {
            scatterDotsBySchool[d.school] = d3.select(this);
        })
        .on("mouseover", function(event, d) {
            highlightSchool(d.school);
            showSchoolDetails(d);
        })
        .on("mouseout", function(event, d) {
            resetSchoolHighlight(d.school);
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