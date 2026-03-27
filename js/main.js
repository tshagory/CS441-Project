const mapMarkersBySchool = {};
const scatterDotsBySchool = {};
let lockedSchool = null;
let lockedData = null;
const defaultDetailsText = "Hover over a school's data point to display its data, and click a data point to keep it displayed";

const cityConfig = {
    "Los Angeles": {
        file: "data/la_schools.csv",
        mapTitle: "LA High Schools by Median Income",
        scatterTitle: "Median Income vs Average SAT Score"
    },
    "Atlanta": {
        file: "data/atl_schools.csv",
        mapTitle: "Atlanta High Schools by Median Income",
        scatterTitle: "Median Income vs Average SAT Score"
    },
    "Houston": {
        file: "data/hou_schools.csv",
        mapTitle: "Houston High Schools by Median Income",
        scatterTitle: "Median Income vs Average SAT Score"
    },
    "Chicago": {
        file: "data/chi_schools.csv",
        mapTitle: "Chicago High Schools by Median Income",
        scatterTitle: "Median Income vs Average SAT Score"
    }
};

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
    if (lockedSchool === schoolName) {
        return;
    }

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

function toggleLockSchool(d) {
    if (lockedSchool === d.school) {
        lockedSchool = null;
        lockedData = null;
        resetSchoolDetails();
        resetSchoolHighlight(d.school);
    } else {
        if (lockedSchool) {
            resetSchoolHighlight(lockedSchool);
        }

        lockedSchool = d.school;
        lockedData = d;
        highlightSchool(d.school);
        showSchoolDetails(d);
    }
}

function resetSchoolDetails() {
    d3.select("#details").text(defaultDetailsText);
}

// leaflet map setup
const map = L.map("heatmap", {
    zoomControl: true,
    scrollWheelZoom: false,
});

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
    minZoom: 9,
    maxZoom: 15
}).addTo(map);

let markerLayer = L.layerGroup().addTo(map);
let legendControl = null;

// scatterplot setup
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

// clear existing city data
function clearVisuals() {
    lockedSchool = null;
    lockedData = null;
    
    markerLayer.clearLayers();

    for (const key in mapMarkersBySchool) delete mapMarkersBySchool[key];
    for (const key in scatterDotsBySchool) delete scatterDotsBySchool[key];

    scatterGroup.selectAll("*").remove();
    scatterSVG.selectAll(".axis-label").remove();
    scatterSVG.selectAll(".chart-title").remove();

    if (legendControl) {
        map.removeControl(legendControl);
        legendControl = null;
    }

    resetSchoolDetails();
}

// render city when prompted
function loadCity(cityName) {
    const config = cityConfig[cityName];

    d3.select("#map-title").text(config.mapTitle);
    d3.select("#scatter-title").text(config.scatterTitle);

    d3.select(".vis-section h2").text(`City Analysis: ${cityName}`);

    clearVisuals();

    d3.csv(config.file, d => ({
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
        const validMapData = data.filter(d =>
            !isNaN(d.latitude) &&
            !isNaN(d.longitude) &&
            !isNaN(d.income)
        );

        const validScatterData = data.filter(d =>
            !isNaN(d.income) &&
            !isNaN(d.score)
        );

        // leaflet map
        const colorScale = d3.scaleSequential()
            .domain(d3.extent(validMapData, d => d.income))
            .interpolator(d3.interpolateYlOrRd);

        const bounds = [];

        validMapData.forEach(d => {
            const marker = L.circleMarker([d.latitude, d.longitude], {
                radius: 6,
                fillColor: colorScale(d.income),
                fillOpacity: 0.85,
                color: "#333",
                weight: 0.5
            }).addTo(markerLayer);

            mapMarkersBySchool[d.school] = marker;
            bounds.push([d.latitude, d.longitude]);

            marker.on("mouseover", function() {
                highlightSchool(d.school);
                showSchoolDetails(d);
            });

            marker.on("mouseout", function() {
                if (lockedSchool) {
                    showSchoolDetails(lockedData);
                } else {
                    resetSchoolDetails();
                }

                resetSchoolHighlight(d.school);
            });

            marker.on("click", function() {
                toggleLockSchool(d);
            });
        });

        if (bounds.length > 0) {
            map.fitBounds(bounds, { padding: [20, 20] });
            const fittedBounds = L.latLngBounds(bounds).pad(0.25);
            map.setMaxBounds(fittedBounds);
        }

        legendControl = L.control({ position: "bottomleft" });

        legendControl.onAdd = function () {
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
                    <span>${Math.round(d3.min(validMapData, d => d.income))}</span>
                    <span>${Math.round(d3.max(validMapData, d => d.income))}</span>
                </div>
            `;
            return div;
        };

        legendControl.addTo(map);

       // scatterplot
        const opacityScale = d3.scaleLinear()
            .domain(d3.extent(validScatterData, d => d.income))
            .range([0.2, 0.99]);

        const x = d3.scaleLinear()
            .domain(d3.extent(validScatterData, d => d.income))
            .nice()
            .range([0, innerWidth]);

        const y = d3.scaleLinear()
            .domain(d3.extent(validScatterData, d => d.score))
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
            .data(validScatterData)
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
                if (lockedSchool) {
                    showSchoolDetails(lockedData);
                } else {
                    resetSchoolDetails();
                }

                resetSchoolHighlight(d.school);
            })
            .on("click", function(event, d) {
                toggleLockSchool(d);
            });

        scatterSVG.append("text")
            .attr("class", "axis-label")
            .attr("x", scatterWidth / 2)
            .attr("y", scatterHeight - 10)
            .attr("text-anchor", "middle")
            .attr("font-size", 12)
            .text("Median Household Income ($)");

        scatterSVG.append("text")
            .attr("class", "axis-label")
            .attr("transform", "rotate(-90)")
            .attr("x", -scatterHeight / 2)
            .attr("y", 20)
            .attr("text-anchor", "middle")
            .attr("font-size", 12)
            .text("Average SAT Score");

        scatterSVG.append("text")
            .attr("class", "chart-title")
            .attr("x", scatterWidth / 2)
            .attr("y", 18)
            .attr("text-anchor", "middle")
            .attr("font-size", 14)
            .attr("font-weight", "bold")
            .text("Income vs Test Score");
    });
}

// button functionality
const buttons = document.querySelectorAll(".city-nav-btn");

buttons.forEach(button => {
    button.addEventListener("click", () => {
        buttons.forEach(btn => btn.classList.remove("active"));
        button.classList.add("active");

        const cityName = button.textContent.trim();
        loadCity(cityName);
    });
});

// initial load
loadCity("Los Angeles");