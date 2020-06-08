/*jslint browser: true*/
/*global d3*/

var margin = {
		top: 50,
		right: 50,
		bottom: 50,
		left: 50
	},
	width = 960 - margin.left - margin.right,
	height = 500 - margin.top - margin.bottom,
	total_width = 960,
	total_height = 500,
	// padding between nodes
	padding = 2,
	maxRadius = 1000,
	numberOfNodes = 50;

var x = d3.scaleLinear()
	.domain([0, 2000])
	.range([0, width]);

var xScale = d3.scaleLinear()
	.domain([0, 2000])
	.range([2, width + margin.left]);

var rad = d3.scaleLinear()
	.domain([0, 95000000])
	.range([5, 25]);

var color = ["#542788", "#998ec3", "#d8daeb", "#fee0b6", "#f1a340", "#a75206"];

var colorScale = d3.scaleQuantize()
	.domain([0, 1951])
	.range(color);

var nodes,
	simulation,
	svg,
	xAxis,
	legend,
	companies,
	all_nodes,
	div,
	parse,
	tooltip,
	info;

var ratios = {};
var industries = [];
var ceoPay = [];

/**
 * On a tick, apply custom gravity, collision detection, and node placement.
 */
function tick() {
	var i;
	for (i = 0; i < nodes.length; i++) {
		var node = nodes[i];
		//console.log("Before tick x of", node.Employer, "is", d.x);
		node.cx = node.x;
		node.cy = node.y;
	}
}

d3.csv("payratio.csv").then(function (data) {
	companies = data;
	console.log("Companies:", companies);
	companies.forEach(function (d) {
		d.Employer = d.Employer;
		d.CEO = d.CEO;
		d.CEO_Pay = +d.CEO_Pay;
		d.Worker_Pay = +d.Worker_Pay;
		d.Ratio = +d.Ratio;
		d.Rating = +d.Rating;
		d.CEO_Pay_TT = +d.CEO_Pay_TT;
		d.Industry = d.Industry;
	});

	nodes = companies.map(function (d) {
		ratios[d.Employer] = d.Ratio;
		ceoPay.push(d.CEO_Pay);
		if (!industries.includes(d.Industry)) {
			industries.push(d.Industry);
		}
		//console.log("d.Ratio of " + d.Employer + ":", d.Ratio);
		//console.log("Scaled ratio:", x(d.Ratio));
		return {
			radius: rad(d.CEO_Pay),
			color: colorScale(d.Ratio),
			x: x(d.Ratio),
			y: height / 2 + Math.random(),
			Employer: d.Employer,
			CEO: d.CEO,
			CEO_Pay: d.CEO_Pay,
			Worker_Pay: d.Worker_Pay,
			Ratio: d.Ratio,
			Rating: d.Rating,
			CEO_Pay_TT: d.CEO_Pay_TT,
			Industry: d.Industry
		};
	});

	all_nodes = nodes;

	console.log("Ratios:", ratios);
	console.log("Industries:", industries);
	console.log("Max CEO pay:", d3.max(ceoPay));

	/*---------- ADD OPTION FOR EACH INDUSTRY ------------------*/
	var select = document.getElementById('options');

	for (ind of industries) {
		var opt = document.createElement('option');
		opt.value = opt.text = ind;
		select.appendChild(opt);
	}

	console.log("Nodes:", nodes);

	simulation = d3.forceSimulation(nodes)
		.force('charge', d3.forceManyBody().strength(-8))
		.force('center', d3.forceCenter(width / 2 - 235, height / 3))
		.force('forceX', d3.forceX().x(function (d) {
			return d.x;
		}).strength(0.6))
		.force('forceY', d3.forceY().y(function (d) {
			return 0;
		}))
		.force('collide', d3.forceCollide(function (d) {
			return d.radius;
		}))
		.on("tick", tick)
		.stop();

	svg = d3.select("#svgcontainer")
		.append("svg")
		.attr("id", "svg")
		.attr("width", total_width)
		.attr("height", total_height)
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	// Use a timeout to allow the rest of the page to load first.
	setTimeout(renderGraph, 10);

});

/**
 * Run the force layout to compute where each node should be placed,
 * then replace the loading text with the graph.
 */
function renderGraph() {
	// Run the layout a fixed number of times.
	// The ideal number of times scales with graph complexity.
	// Of course, don't run too long—you'll hang the page!

	var loading = svg.append("text")
		.attr("x", (width + margin.left + margin.right) / 2)
		.attr("y", (height + margin.top + margin.bottom) / 2)
		.attr("dy", ".35em")
		.style("text-anchor", "middle")
		.text("Simulating. One moment please…");

	var median = d3.median(d3.values(ratios));
	var diff = 1000000;
	var closest;
	for (key of d3.keys(ratios)) {
		if (Math.abs(ratios[key] - median) < diff) {
			diff = Math.abs(ratios[key] - median);
			closest = key;
		}
	}
	console.log("Closest is", closest, "with a diff of", diff);


	var num = 100;
	simulation.tick(100);
	simulation.stop();

	svg.append("line")
		.attr("x1", 0)
		.attr("y1", height + 30)
		.attr("x2", total_width)
		.attr("y2", height + 30)
		.style("stroke-width", 0.5)
		.style("stroke", "grey")
		.style("fill", "none");

	/*------------- COLOR AND SIZE LEGENDS --------------------*/

	legend = svg.append("g");
	var offset = 270;

	legend.append("text")
		.attr("x", offset - 200)
		.attr("y", height - 6)
		.style("text-anchor", "start")
		.style("font-family", "sans-serif")
		.style("font-size", "9px")
		.style("font-weight", "bold")
		.text("CHART KEY");

	legend.append("text")
		.attr("x", offset - 5)
		.attr("y", height - 6)
		.style("text-anchor", "end")
		.style("font-family", "sans-serif")
		.style("font-size", "9px")
		.text("Color shows pay ratio");

	legend.selectAll("rect")
		.data(color)
		.enter()
		.append("rect")
		.attr("fill", function (d) {
			//console.log("d in fill:", d);
			return d;
		})
		.attr("x", function (d, i) {
			return i * 40 + offset;
		})
		.attr("y", height - 15)
		.attr("width", 40)
		.attr("height", 10);

	legend.selectAll("line")
		.data(color)
		.enter()
		.append("line")
		.attr("class", "legend ticks")
		.attr("x1", function (d, i) {
			return (i * 40) + offset;
		})
		.attr("y1", height - 20)
		.attr("x2", function (d, i) {
			return (i * 40) + offset;
		})
		.attr("y2", height)
		.style("stroke-width", 0.5)
		.style("stroke", function (d, i) {
			if (i == 0) {
				return "none";
			} else {
				return "black";
			}
		})
		.style("fill", "none");

	var thresholds = colorScale.thresholds();

	console.log("Thresholds:", thresholds);

	legend.selectAll("text.legend")
		.data(thresholds)
		.enter()
		.append("text")
		.attr("x", function (d, i) {
			return ((i + 1) * 40) + offset;
		})
		.attr("y", height + 8)
		.style("text-anchor", "middle")
		.style("font-family", "sans-serif")
		.style("font-size", "8px")
		.text(function (d) {
			return Math.round(d) + ":1";
		});

	var new_start = offset + (7 * 40);

	/*---------------- DRAW LEGEND CIRCLES -----------------------*/

	legend.append("text")
		.attr("x", new_start)
		.attr("y", height - 6)
		.style("text-anchor", "start")
		.style("font-family", "sans-serif")
		.style("font-size", "9px")
		.text("Size shows CEO pay");

	var circle_sizes = [95000000 / 4, 95000000 / 2, 95000000 * 3 / 4, 95000000];

	var end_prev = new_start + 100;

	legend.selectAll("circle.legend")
		.data(circle_sizes)
		.enter()
		.append("circle")
		.style("fill", "#D3D3D3")
		.style("stroke", "#66646d")
		.attr("stroke-width", "0.5")
		.attr("cx", function (d, i) {
			if (i > 0) {
				end_prev = end_prev + 10 + 2 * rad(circle_sizes[i - 1]);
			}
			return end_prev + 10;
		})
		.attr("cy", height - 10)
		.attr("r", function (d) {
			return rad(d);
		});

	end_prev = new_start + 100;

	legend.selectAll("text.circle_leg")
		.data(circle_sizes)
		.enter()
		.append("text")
		.attr("x", function (d, i) {
			if (i > 0) {
				end_prev = end_prev + 10 + 2 * rad(circle_sizes[i - 1]);
			}
			return end_prev + 10;
		})
		.attr("y", function (d, i) {
			if(i==1){
				return (height - 10 - rad(d) - 5)
			}else{return (height - 10 - rad(d) - 3);}
		})
		.style("text-anchor", "middle")
		.style("font-family", "sans-serif")
		.style("font-size", "8px")
		.text(function (d, i) {
			//console.log("d in circle legend:", d);
			if (i == 3) {
				return "$" + 156 + " M";
			} else {
				return "$" + d / 1000000 + " M";
			}
		})

	/*---------- DRAW THE CIRCLES AND STORE NEEDED VALUES -------*/

	var x_median;
	var y_median;

	var mid_height;

	var x_0, x_300, x_630, x_930, x_1190, x_1500, x_1900;

	var mid_line = svg
		.append("line")
		.transition()
		.duration(1000)
		.attr("class", "x axis");


	info = svg.append("g");

	var info_line = info.append("line")
		.transition()
		.duration(1000)
		.attr("class", "x axis");

	var circle = svg.selectAll("circle.chart")
		.data(nodes)
		.enter()
		.append("circle")
		.transition()
		.duration(2000)
		.ease(d3.easeCircle)
		.style("fill", function (d) {
			return d.color;
		})
		.style("stroke", "#66646d").attr("stroke-width", "0.5")
		.attr("cx", function (d) {
			if (d.Employer == "Caterpillar") {
				x_median = d.x;
			} else if (d.Employer == "Google") {
				x_0 = d.x;
			} else if (d.Employer == "ExxonMobil") {
				x_300 = d.x;
			} else if (d.Employer == "Time Warner Cable") {
				x_630 = d.x;
			} else if (d.Employer == "Target") {
				x_930 = d.x;
			} else if (d.Employer == "CVS Health") {
				x_1190 = d.x;
			} else if (d.Employer == "Chipotle") {
				x_1500 = d.x;
			} else if (d.Employer == "Discovery Comm.") {
				x_1900 = d.x;
			}
			return d.x;
		})
		.attr("cy", function (d) {
			if (d.Employer == "Caterpillar") {
				y_median = d.y;
			} else if (d.Employer == "Discovery Comm.") {
				mid_height = d.y;
			}
			return d.y;
		})
		.attr("r", function (d) {
			return d.radius;
		});

	/*--------------------------- INFO ----------------------------*/

	//Each circle represents a company, sized by its market capitalization. The largest is Apple, at more than $400 billion, with an effective tax rate of 14 percent.

	info_line
		.attr("x1", x_1900)
		.attr("y1", height - 150)
		.attr("x2", x_1900)
		.attr("y2", mid_height)
		.style("stroke-width", 1)
		.style("stroke-dasharray", ("1, 1"))
		.style("stroke", "grey")
		.style("fill", "none");

	info
		.append("text")
		.attr("class", "node")
		.attr("x", width)
		.attr("y", height - 140)
		.style("text-anchor", "right")
		.style("font-family", "sans-serif")
		.style("font-size", "8px")
		.text("Each circle represents a company, sized by its CEO pay. The largest is Discover Comm., at more than $156 million, with a CEO employee ratio of 1951:1.")
		.call(wrap, 100);

	/*--------------------------- X-Axis --------------------------*/

	var ticks = [x_0, x_300, x_630, x_930, x_1190, x_1500, x_1900];
	console.log("ticks:", ticks);
	var vals = [0, 300, 630, 930, 1190, 1500, 1900];
	var counter = 0;

	for (tick of ticks) {
		svg.append("line").transition().duration(1000)
			.attr("class", "x axis")
			.attr("x1", tick)
			.attr("y1", 20)
			.attr("x2", tick)
			.attr("y2", 10)
			.style("stroke-width", 1)
			.style("stroke", "black")
			.style("fill", "none");

		svg.append("text").transition().duration(1000)
			.attr("class", "label")
			.attr("x", tick)
			.attr("y", 6)
			.style("text-anchor", "middle")
			.style("font-family", "sans-serif")
			.style("font-size", "8px")
			.text(vals[counter] + ":1");

		counter = counter + 1;
	}

	svg.append("text").transition().duration(1000)
		.attr("class", "label")
		.attr("x", 0)
		.attr("y", 6)
		.style("text-anchor", "start")
		.style("font-family", "sans-serif")
		.style("font-size", "8px")
		.style("font-weight", "bold")
		.text("Pay Ratio");

	svg.append("text").transition().duration(1000)
		.attr("class", "label")
		.attr("x", 0)
		.attr("y", 14)
		.style("text-anchor", "start")
		.style("font-family", "sans-serif")
		.style("font-size", "7px")
		.text("2014");

	/*------------------ MID LINES/TEXT ----------------------*/

	mid_line
		.attr("x1", 25)
		.attr("y1", mid_height)
		.attr("x2", total_width - 25)
		.attr("y2", mid_height)
		.style("stroke-width", 1)
		.style("stroke-dasharray", ("1, 1"))
		.style("stroke", "grey")
		.style("fill", "none");

	//https://stackoverflow.com/questions/15615552/get-div-height-with-plain-javascript
	var clientHeight = (document.getElementById('svgcontainer').clientHeight * ((mid_height + margin.top) / total_height)) + document.getElementById('top').clientHeight + document.getElementById('h2').clientHeight + document.getElementById('h1').clientHeight + 35;

	//https://stackoverflow.com/questions/442404/retrieve-the-position-x-y-of-an-html-element-relative-to-the-browser-window
	var svgRect = document.getElementById('svg').getBoundingClientRect();

	console.log("bodyRect:", svgRect);

	d3.select("#blurb")
		.style("top", clientHeight + "px")
		.style("left", (svgRect.x - 46) + "px");

	/*--------------------- MEDIAN LINE/TEXT ---------------------*/


	svg.append("line").transition().duration(1000)
		.attr("class", "y axis")
		.attr("x1", x_median)
		.attr("y1", height - 100)
		.attr("x2", x_median)
		.attr("y2", 20)
		.style("stroke-width", 1)
		.style("stroke", "black")
		.style("fill", "none");

	svg.append("text").transition().duration(1000)
		.attr("class", "label")
		.attr("x", x_median)
		.attr("y", height - 90)
		.style("text-anchor", "middle")
		.style("font-family", "sans-serif")
		.style("font-size", "6px")
		.text("OVERALL");

	svg.append("text").transition().duration(1000)
		.attr("class", "label")
		.attr("x", x_median)
		.attr("y", height - 78)
		.style("text-anchor", "middle")
		.style("font-family", "sans-serif")
		.style("font-size", "12px")
		.text(Math.round(median) + ":1");

	/*------------------------ TOOLTIP ----------------------------*/
	tooltip = d3.select("body")
		.append("div")
		.style("position", "absolute")
		.style("z-index", "7")
		.style("visibility", "hidden")
		.style("width", "1000px")
		.style("height", "30px")
		.style("background", "aliceblue")
		.style("border", "0px")
		.style("border-radius", "8px")
		.style("font-family", "sans-serif");

	// Adding mouseover functions to the tooltip
	div = d3.select("body")
		.append("div")
		.attr("class", "tooltip")
		.style("opacity", 0);

	parse = d3.format(",");

	svg.selectAll("circle")
		.on("mouseover", function (d) {
			console.log("Mousing over! d:", d);
			console.log("d.Employer:", d.Employer);
			if (d.Employer != undefined) {
				div.transition()
					.duration(200)
					.style("opacity", 1.0)

				div.html("<center>-" + d.Employer + "-</center>" + " <center> CEO: " + d.CEO + "</center><br/>" + "Worker Pay: <span class=\"right\">" + "$" + parse(d.Worker_Pay) + "</span><br />" + "CEO Pay: <span class=\"right\">" + "$" + parse(d.CEO_Pay_TT) + "</span><br />" + "CEO/Worker Pay Ratio: <span class=\"right\">" + parse(d.Ratio) + ":1" + "</span><br />" + "------------------------------------------------" + "<br/>" + "Glassdoor Rating: <span class=\"right\">" + parse(d.Rating) + "</span><br/>" + "Industry: <span class=\"right\">" + d.Industry + "</span>")
					.style("left", (d3.event.pageX) + "px")
					.style("top", (d3.event.pageY) + "px");

				d3.select(this)
					.style("stroke", "black")
					.attr("stroke-width", "2")
			}

		})
		.on("mousemove", function () {
			return tooltip
				.style("top", (d3.event.pageY - 10) + "px")
				.style("left", (d3.event.pageX + 10) + "px");
		})
		.on("mouseout", function () {
			div.transition()
				.duration(500)
				.style("opacity", 0)
			d3.select(this)
				.style("stroke", "#66646d")
				.attr("stroke-width", "0.5")
		});

	loading.remove();
}


function key_up() {
	let input = document.getElementById('search').value
	input = input.toLowerCase();
	console.log("Inputed:", input);
	if (input != "") {
		svg.selectAll("circle")
			.style("fill-opacity", function (d) {
				//console.log("d in key_up:", d);
				if (d.Employer != undefined) {
					if ((d.Employer.toLowerCase()).includes(input)) {
						return 1;
					} else {
						return 0.1;
					}
				}
			})
			.attr("stroke-width", function (d) {
				if (d.Employer != undefined) {
					if ((d.Employer.toLowerCase()).includes(input)) {
						return 1;
					} else {
						return 0.5;
					}
				}
			});
	} else {
		svg.selectAll("circle")
			.style("fill-opacity", "1").attr("stroke-width", 0.5);
	}
}

function update(nodes) {
	console.log("Nodes is now:", nodes);
	console.log("Updating to", industry);

	svg.selectAll("circle")
		.style("opacity", function (d) {
			console.log("d in update is:", d);
			if (d.Employer != undefined && !nodes.includes(d.Employer)) {
				return "0";
			} else {
				return "1";
			}
		})
		.on("mouseover", function (d) {
			console.log("Mousing over! d:", d);
			console.log("d.Employer:", d.Employer);
			if (d.Employer != undefined && nodes.includes(d.Employer)) {
				console.log("Should be visible");
				div.transition()
					.duration(200)
					.style("opacity", 1.0)

				div.html("<center>-" + d.Employer + "-</center>" + " <center> CEO: " + d.CEO + "</center><br/>" + "Worker Pay: <span class=\"right\">" + "$" + parse(d.Worker_Pay) + "</span><br />" + "CEO Pay: <span class=\"right\">" + "$" + parse(d.CEO_Pay_TT) + "</span><br />" + "CEO/Worker Pay Ratio: <span class=\"right\">" + parse(d.Ratio) + ":1" + "</span><br />" + "------------------------------------------------" + "<br/>" + "Glassdoor Rating: <span class=\"right\">" + parse(d.Rating) + "</span><br/>" + "Industry: <span class=\"right\">" + d.Industry + "</span>")
					.style("left", (d3.event.pageX) + "px")
					.style("top", (d3.event.pageY) + "px");

				d3.select(this)
					.style("stroke", "black")
					.attr("stroke-width", "2")
			} else {
				div.style("opacity", 0)
			}
		})
		.on("mousemove", function () {
			return tooltip
				.style("top", (d3.event.pageY - 10) + "px")
				.style("left", (d3.event.pageX + 10) + "px");
		})
		.on("mouseout", function () {
			div.transition()
				.duration(500)
				.style("opacity", 0)
			d3.select(this)
				.style("stroke", "#66646d")
				.attr("stroke-width", "0.5")
		});;

}

d3.select("#options").on("change", function (d) {
	// this.value is the current value of the select element
	industry = this.value;
	console.log("Selected group:", industry);

	if (industry != "All Industries") {
		info.style("opacity", 0);
	} else {
		info.style("opacity", 1);
	}

	var selected_companies = [];

	for (company of companies) {
		//console.log("In loop:", company.Industry);
		if (company.Industry == industry || industry == "All Industries") {
			//selected_companies.push(company);
			selected_companies.push(company.Employer);
		}
	}

	console.log("Selected companies:", selected_companies);

	nodes = selected_companies.map(function (d) {
		ratios[d.Employer] = d.Ratio;
		ceoPay.push(d.CEO_Pay);
		if (!industries.includes(d.Industry)) {
			industries.push(d.Industry);
		}
		//console.log("d.Ratio of " + d.Employer + ":", d.Ratio);
		//console.log("Scaled ratio:", x(d.Ratio));
		return {
			radius: rad(d.CEO_Pay),
			color: colorScale(d.Ratio),
			x: x(d.Ratio),
			y: height / 2 + Math.random(),
			Employer: d.Employer,
			CEO: d.CEO,
			CEO_Pay: d.CEO_Pay,
			Worker_Pay: d.Worker_Pay,
			Ratio: d.Ratio,
			Rating: d.Rating,
			CEO_Pay_TT: d.CEO_Pay_TT,
			Industry: d.Industry
		};
	});

	update(selected_companies);
});

// Code from: https://stackoverflow.com/questions/24784302/wrapping-text-in-d3
function wrap(text, width) {
	text.each(function () {
		var text = d3.select(this),
			words = text.text().split(/\s+/).reverse(),
			word,
			line = [],
			lineNumber = 0,
			lineHeight = 1.1, // ems
			x = text.attr("x"),
			y = text.attr("y"),
			dy = 0, //parseFloat(text.attr("dy")),
			tspan = text.text(null)
			.append("tspan")
			.attr("x", x)
			.attr("y", y)
			.attr("dy", dy + "em");
		while (word = words.pop()) {
			line.push(word);
			tspan.text(line.join(" "));
			if (tspan.node().getComputedTextLength() > width) {
				line.pop();
				tspan.text(line.join(" "));
				line = [word];
				tspan = text.append("tspan")
					.attr("x", x)
					.attr("y", y)
					.attr("dy", ++lineNumber * lineHeight + dy + "em")
					.text(word);
			}
		}
	});
}
