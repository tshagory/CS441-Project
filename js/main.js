const mapMarkersBySchool = {};
const scatterDotsBySchool = {};
const scatterOpacityBySchool = {};
let lockedSchool = null;
let lockedData = null;
const defaultDetailsText = "Hover over a school's data point to display its data, and click a data point to keep it displayed";
const GLOBAL_INCOME_DOMAIN = [40000, 250000];
const costOfLivingIndex = {
    "Los Angeles": 81.8,
    "Chicago": 75.4,
    "Atlanta": 75.1,
    "Houston": 64.8
}
let activePoemGroup = null;

function highlightIncomeGroup(data, type) {
    const incomes = data.map(d => d.income).sort(d3.ascending);
    const q1 = d3.quantile(incomes, 0.25);
    const q3 = d3.quantile(incomes, 0.75);

    let selectedSchools;

    if (type === "high") {
        selectedSchools = data.filter(d => d.income >= q3).map(d => d.school);
    } else if (type === "low") {
        selectedSchools = data.filter(d => d.income <= q1).map(d => d.school);
    } else {
        selectedSchools = [];
    }

    Object.keys(mapMarkersBySchool).forEach(school => {
        const marker = mapMarkersBySchool[school];
        if (!marker) return;

        if (selectedSchools.includes(school)) {
            marker.setStyle({
                radius: 6,          // keep normal size
                color: "black",
                weight: 1.5,
                fillOpacity: 0.85   // keep normal fill opacity
            });
        } else {
            marker.setStyle({
                radius: 6,          // keep normal size
                color: "#999",
                weight: 0.5,
                fillOpacity: 0.2
            });
        }
    });

    Object.keys(scatterDotsBySchool).forEach(school => {
        const dot = scatterDotsBySchool[school];
        if (!dot) return;

        if (selectedSchools.includes(school)) {
            dot
                .attr("fill", "crimson")
                .attr("r", 7) // same as regular highlight
                .attr("opacity", scatterOpacityBySchool[school]); // preserve original opacity
        } else {
            dot
                .attr("fill", "steelblue")
                .attr("r", 5)
                .attr("opacity", 0.15);
        }
    });
}

function resetIncomeGroupView() {
    Object.keys(mapMarkersBySchool).forEach(school => {
        const marker = mapMarkersBySchool[school];
        if (!marker) return;

        marker.setStyle({
            radius: 6,
            color: "#333",
            weight: 0.5,
            fillOpacity: 0.85
        });
    });

    Object.keys(scatterDotsBySchool).forEach(school => {
        const dot = scatterDotsBySchool[school];
        if (!dot) return;

        dot
            .attr("fill", "steelblue")
            .attr("r", 5)
            .attr("opacity", scatterOpacityBySchool[school]);
    });
}

const cityConfig = {
    "Los Angeles": {
        file: "data/la_schools.csv",
        mapTitle: "LA High Schools by Adjusted Income",
        scatterTitle: "Adjusted Income vs Average SAT Score"
    },
    "Atlanta": {
        file: "data/atl_schools.csv",
        mapTitle: "Atlanta High Schools by Adjusted Income",
        scatterTitle: "Adjusted Income vs Average SAT Score"
    },
    "Houston": {
        file: "data/hou_schools.csv",
        mapTitle: "Houston High Schools by Adjusted Income",
        scatterTitle: "Adjusted Income vs Average SAT Score"
    },
    "Chicago": {
        file: "data/chi_schools.csv",
        mapTitle: "Chicago High Schools by Adjusted Income",
        scatterTitle: "Adjusted Income vs Average SAT Score"
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

    // If a poem group is active, don't let normal hover-out remove that poem highlight
    if (activePoemGroup) {
        const allSchools = Object.keys(scatterDotsBySchool);
        const incomes = allSchools
            .map(name => {
                const dot = scatterDotsBySchool[name];
                return dot && dot.datum ? dot.datum().income : null;
            })
            .filter(v => v !== null)
            .sort(d3.ascending);

        const q1 = d3.quantile(incomes, 0.25);
        const q3 = d3.quantile(incomes, 0.75);

        const thisData = scatterDot ? scatterDot.datum() : null;
        const inHighlightedGroup =
            thisData &&
            (
                (activePoemGroup === "high" && thisData.income >= q3) ||
                (activePoemGroup === "low" && thisData.income <= q1)
            );

        if (mapMarker) {
            if (inHighlightedGroup) {
                mapMarker.setStyle({
                    radius: 6,
                    color: "black",
                    weight: 1.5,
                    fillOpacity: 0.85
                });
            } else {
                mapMarker.setStyle({
                    radius: 6,
                    color: "#999",
                    weight: 0.5,
                    fillOpacity: 0.2
                });
            }
        }

        if (scatterDot) {
            if (inHighlightedGroup) {
                scatterDot
                    .attr("fill", "crimson")
                    .attr("r", 7)
                    .attr("opacity", scatterOpacityBySchool[schoolName]);
            } else {
                scatterDot
                    .attr("fill", "steelblue")
                    .attr("r", 5)
                    .attr("opacity", 0.15);
            }
        }

        return;
    }

    if (mapMarker) {
        mapMarker.setStyle({
            color: "#333",
            weight: 0.5,
            radius: 6,
            fillOpacity: 0.85
        });
    }

    if (scatterDot) {
        scatterDot
            .attr("fill", "steelblue")
            .attr("r", 5)
            .attr("opacity", scatterOpacityBySchool[schoolName]);
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
    for (const key in scatterOpacityBySchool) delete scatterOpacityBySchool[key];

    scatterGroup.selectAll("*").remove();
    scatterSVG.selectAll(".axis-label").remove();
    scatterSVG.selectAll(".chart-title").remove();

    if (legendControl) {
        map.removeControl(legendControl);
        legendControl = null;
    }

    resetSchoolDetails();

    activePoemGroup = null;
    d3.selectAll(".poem").classed("active-poem", false);
}

// render city when prompted
function loadCity(cityName) {
    const config = cityConfig[cityName];
    const colIndex = costOfLivingIndex[cityName] || 100;

    d3.select("#map-title").text(config.mapTitle);
    d3.select("#scatter-title").text(config.scatterTitle);

    d3.select(".vis-section h2").text(`City Analysis: ${cityName}`);

    clearVisuals();

    d3.csv(config.file, d => ({
        school: d.school,
        latitude: +d.latitude,
        longitude: +d.longitude,
        score: +d.score,
        income: +d.income / (colIndex / 100),
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
            .domain(GLOBAL_INCOME_DOMAIN)
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
                <div style="font-size:12px; margin-bottom:6px;">Adjusted Income ($)</div>
                <div style="width:120px; height:10px;
                    background: linear-gradient(to right, #ffffcc, #fd8d3c, #bd0026);">
                </div>
                <div style="display:flex; justify-content:space-between; font-size:11px; margin-top:4px;">
                    <span>${GLOBAL_INCOME_DOMAIN[0]}</span>
                    <span>${GLOBAL_INCOME_DOMAIN[1]}</span>
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
                    scatterOpacityBySchool[d.school] = opacityScale(d.income);
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
            .text("Adjusted Median Household Income ($)");

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
            .text("Adjusted Income vs Test Score");

        d3.select("#poem-high").on("click", () => {
            const alreadyActive = activePoemGroup === "high";

            // clear previous selection
            d3.selectAll(".poem").classed("active-poem", false);

            // reset locked school so interactions don’t conflict
            lockedSchool = null;
            lockedData = null;
            resetSchoolDetails();

            if (alreadyActive) {
                activePoemGroup = null;
                resetIncomeGroupView();
                return;
            }

            activePoemGroup = "high";
            d3.select("#poem-high").classed("active-poem", true);

            highlightIncomeGroup(validScatterData, "high");
        });

        d3.select("#poem-low").on("click", () => {
            const alreadyActive = activePoemGroup === "low";

            d3.selectAll(".poem").classed("active-poem", false);

            lockedSchool = null;
            lockedData = null;
            resetSchoolDetails();

            if (alreadyActive) {
                activePoemGroup = null;
                resetIncomeGroupView();
                return;
            }

            activePoemGroup = "low";
            d3.select("#poem-low").classed("active-poem", true);

            highlightIncomeGroup(validScatterData, "low");
        });
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

document.querySelectorAll(".info-btn").forEach(button => {
    button.addEventListener("click", function(event) {
        event.stopPropagation();

        const popupId = this.getAttribute("data-info");
        const popup = document.getElementById(popupId);

        document.querySelectorAll(".info-popup").forEach(p => {
            if (p !== popup) {
                p.classList.remove("show");
            }
        });

        popup.classList.toggle("show");
    });
});

document.addEventListener("click", function() {
    document.querySelectorAll(".info-popup").forEach(popup => {
        popup.classList.remove("show");
    });
});

const welcomeModal = document.getElementById("welcome-modal");
const closeModalBtn = document.getElementById("close-modal");
const startExploringBtn = document.getElementById("start-exploring");

function closeWelcomeModal() {
    welcomeModal.classList.add("modal-hidden");
}

closeModalBtn.addEventListener("click", closeWelcomeModal);
startExploringBtn.addEventListener("click", closeWelcomeModal);

welcomeModal.addEventListener("click", function(event) {
    if (event.target === welcomeModal) {
        closeWelcomeModal();
    }
});

// initial load
loadCity("Los Angeles");