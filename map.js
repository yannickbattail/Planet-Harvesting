"use strict";
/*globals $:false */
/*globals d3:false */

function getColorFormHeight(high) {
  var color = d3.scaleSequential(d3.interpolateSpectral);
  return color(1-high);
}

function detectNeighbors(polygonList, diagramme) {
  // push neighbors indexes to each polygons element
  polygonList.forEach((polyg, polygIndex) => {
    polyg.index = polygIndex;
    polyg.high = 0;
    polyg.neighbors = diagramme.cells[polygIndex].halfedges
      .map(e => diagramme.edges[e])
      .filter(e => e.left && e.right)
      .map(e => e.left.index === polygIndex?e.right.index:e.left.index);
  });
}

function polygonAppendPath(polygonList, cells) {
  polygonList.forEach(
    polyg => cells.append("path")
              .attr("d", "M" + polyg.join("L") + "Z")
              .attr("id", polyg.index)
              .attr("class", "mapCell")
              .attr("fill", getColorFormHeight(polyg.high))
  );
}

function recolorPolygonesFromHighs(polygonList) {
  polygonList.forEach(
      polyg => $("#" + polyg.index).attr("fill", getColorFormHeight(polyg.high))
    );
}

function addhill(polygonList, start, config) {
  var queue = [];
  var high = config.high;
  polygonList[start].high += high;
  polygonList[start].used = 1;
  queue.push(start);
  for (let i = 0; i < queue.length && high > 0.01; i++) {
    high = high * config.radius;
    polygonList[queue[i]].neighbors
      .filter(e => !polygonList[e].used)
      .forEach(e => {
        polygonList[e].high = computeNewHeight(polygonList[e].high, high, config.sharpness);
        polygonList[e].used = true;
        queue.push(e);
      });
  }
  polygonList.forEach(polyg => polyg.used = false);
}

function computeNewHeight(previousHeight, height, sharpness) {
  var mod = Math.random() * sharpness + 1.1-sharpness;
  if (sharpness == 0) {
    mod = 1;
  }
  var newHeight = previousHeight + height * mod;
  if (newHeight > 1) {
    return 1;
  }
  return newHeight;
}

function createHill(config, point, diagram, polygons, mapCells) {
  var nearest = diagram.find(point[0], point[1]).index;
  mapCells.append("circle")
    .attr("r", 3)
    .attr("cx", point[0])
    .attr("cy", point[1])
    .attr("fill", getColorFormHeight(config.high))
    .attr("class", "circle");
  addhill(polygons, nearest, config);
  recolorPolygonesFromHighs(polygons);
}

function drawMouseCircle(config, point, diagram, polygons, svg) {
  var nearest = diagram.find(point[0], point[1]).index;
  var radius = config.radius * 50;
  $("#cell").text(nearest);
  $("#high").text((polygons[nearest].high).toFixed(2));
  svg.select(".radius").remove();
  svg.append("circle")
    .attr("r", radius)
    .attr("cx", point[0])
    .attr("cy", point[1])
    .attr("class", "radius");
}

function getConfig() {
  return {
    size: parseInt(sizeInput.valueAsNumber),
    high: parseFloat(highInput.valueAsNumber),
    radius: parseFloat(radiusInput.valueAsNumber),
    sharpness: parseFloat(sharpnessInput.valueAsNumber)
  };
}

function generate() {
  var config = getConfig();
  d3.select(".mapCells").remove();
  var svg = d3.select("svg");
  var mapCells = svg.append("g")
                    .attr("class", "mapCells")
                    .on("touchmove mousemove", eventDdrawMouseCircle)
                    .on("click", eventCreateHill);
  var imgWidth = parseInt(svg.attr("width"));
  var imgHeight = parseInt(svg.attr("height"));
  var sites = d3.range(config.size).map(
      () => [Math.random() * imgWidth, Math.random() * imgHeight]
    );
  var voronoi = d3.voronoi().extent([[0, 0],[imgWidth, imgHeight]]);
  sites = voronoi(sites).polygons().map(d3.polygonCentroid);
  var diagram = voronoi(sites);
  var polygons = diagram.polygons();

  function eventCreateHill() {
    createHill(getConfig(), d3.mouse(this), diagram, polygons, mapCells);
  }
  
  function eventDdrawMouseCircle() {
    drawMouseCircle(getConfig(), d3.mouse(this), diagram, polygons, svg);
  }
  
  detectNeighbors(polygons, diagram);
  polygonAppendPath(polygons, mapCells);
}

generate();
