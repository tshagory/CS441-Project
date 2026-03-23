// Heatmap
const heatmapWidth = 420;
const heatmapHeight = 300;

const heatmapSVG = d3.select("#heatmap")
    .append("svg")
    .attr("width", heatmapWidth)
    .attr("height", heatmapHeight);

// Temporary heatmap data
const heatData = [10, 30, 50, 80];

heatmapSVG.selectAll("rect")
    .data(heatData)
    .enter()
    .append("rect")
    .attr("x", (d, i) => 20 + i * 100)
    .attr("y", 50)
    .attr("width", 70)
    .attr("height", 180)
    .attr("fill", d => d3.interpolateBlues(d / 100));

// Optional label
heatmapSVG.append("text")
    .attr("x", 20)
    .attr("y", 30)
    .text("Income Heatmap Placeholder")
    .attr("font-size", 16)
    .attr("font-weight", "bold");


// Scatterplot
const scatterWidth = 420;
const scatterHeight = 300;
const margin = { top: 20, right: 20, bottom: 50, left: 60 };

const innerWidth = scatterWidth - margin.left - margin.right;
const innerHeight = scatterHeight - margin.top - margin.bottom;

const scatterSVG = d3.select("#scatter")
    .append("svg")
    .attr("width", scatterWidth)
    .attr("height", scatterHeight);

const scatterGroup = scatterSVG.append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

const scatterData = [
    { income: 40, score: 60, school: "School A" },
    { income: 80, score: 90, school: "School B" },
    { income: 20, score: 50, school: "School C" }
];

const x = d3.scaleLinear()
    .domain([0, 100])
    .range([0, innerWidth]);

const y = d3.scaleLinear()
    .domain([0, 100])
    .range([innerHeight, 0]);

scatterGroup.append("g")
    .attr("transform", `translate(0, ${innerHeight})`)
    .call(d3.axisBottom(x));

scatterGroup.append("g")
    .call(d3.axisLeft(y));

scatterGroup.selectAll("circle")
    .data(scatterData)
    .enter()
    .append("circle")
    .attr("cx", d => x(d.income))
    .attr("cy", d => y(d.score))
    .attr("r", 6)
    .attr("fill", "steelblue")
    .on("mouseover", (event, d) => {
        d3.select("#details")
            .text(`${d.school} | Income: ${d.income} | Score: ${d.score}`);
    });

scatterSVG.append("text")
    .attr("x", scatterWidth / 2)
    .attr("y", scatterHeight - 10)
    .attr("text-anchor", "middle")
    .text("Median Income");

scatterSVG.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -scatterHeight / 2)
    .attr("y", 18)
    .attr("text-anchor", "middle")
    .text("Test Score");