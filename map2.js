"use strict";
/*globals $:false */
/*globals d3:false */
/*globals L:false */
/*globals window:false */

function getColorFormHeight(high) {
  if (high == 0) return "#000080";
  var color = d3.scaleSequential(d3.interpolateSpectral);
  //return color(Math.random());
  return color(1-high);
}

function pow2(x) {
  return Math.pow(2, x);
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

function recolorPolygonesFromHighs(polygonList, svg) {
  var jsvg = $(svg.node());
  polygonList.forEach(
      polyg => jsvg.find("#" + polyg.index).attr("fill", getColorFormHeight(polyg.high))
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
}

function getConfig() {
  return {
    imgSize: 256,
    size: 5000,
    high: 0.5,
    radius: 0.992,
    sharpness: 0.2
  };
}

function generate(coords) {
  var config = getConfig();
  var svg = d3.create("svg");
  svg.attr("width", config.imgSize);
  svg.attr("height", config.imgSize);
  var mapCells = svg.append("g").attr("class", "mapCells");
  var voronoi = d3.voronoi().extent([[0, 0],[config.imgSize, config.imgSize]]);
  var sites = cutPolygList(coords, polygCenters, config.imgSize);
  var diagram = voronoi(sites);
  var polygons = diagram.polygons();

  detectNeighbors(polygons, diagram);
  polygonAppendPath(polygons, mapCells);
  initHeight(diagram, polygons, sites);
  //createHill(getConfig(), [config.imgSize/2, config.imgSize/2], diagram, polygons, mapCells);
  recolorPolygonesFromHighs(polygons, svg);
  return svg.node();
}

function initHeight(diagram, polygons, sites) {
  sites.forEach(
    p => {
      var idx = diagram.find(p[0], p[1]).index;
      polygons[idx].high = p[2]
    }
  );
}

function isInBoundaries(point, boundaries) {
  return point[0] > boundaries.min.x
      && point[0] <= boundaries.max.x
      && point[1] > boundaries.min.y
      && point[1] <= boundaries.max.y;
}

function zoom(point, origin, coef) {
  return [
    (point[0] - origin.x) * coef,
    (point[1] - origin.y) * coef,
    point[2]
  ];
}

function cutPolygList(coords, centers, size) {
  if (coords.z == 0) return centers;
  var coef = pow2(coords.z);
  var dim = size / coef;
  var boundaries = {
    min: {
      x: dim * coords.x,
      y: dim * coords.y,
    },
    max: {
      x: dim * (coords.x + 1),
      y: dim * (coords.y + 1),
    },
  };
  return centers.filter(
    p => isInBoundaries(p, boundaries)
  ).map(
    p => zoom(p, boundaries.min, coef)
  );
}

function init() {
  var config = getConfig();
  var sites = d3.range(config.size).map(
    () => [Math.random() * config.imgSize, Math.random() * config.imgSize]
  );
  var voronoi = d3.voronoi().extent([[0, 0],[config.imgSize, config.imgSize]]);
  sites = voronoi(sites).polygons().map(d3.polygonCentroid);
  volcano(sites, [config.imgSize/2, config.imgSize/2]);
  return sites;
}

function distance(a, b) {
  return Math.sqrt( Math.pow((a[0]-b[0]), 2) + Math.pow((a[1]-b[1]), 2) );
}

function volcano(sites, middle) {
  sites.forEach(
    p => p[2] = 1 / Math.sqrt(distance(p, middle))
  );
}

var polygCenters = init();
var map = L.map('map', {
  center: [0, 0],
  zoom: 0
});

L.GridLayer.DebugCoords = L.GridLayer.extend({
  createTile: function (coords, done) {
    var tile = generate(coords);
    window.setTimeout(function () {
      // Syntax is 'done(error, tile)'
      done(null, tile);
    }, 50);
    return tile;
  }
});

L.gridLayer.debugCoords = function(opts) {
  return new L.GridLayer.DebugCoords(opts);
};

map.addLayer(L.gridLayer.debugCoords());
