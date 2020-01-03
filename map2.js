"use strict";
/*globals $:false */
/*globals d3:false */
/*globals L:false */
/*globals SimplexNoise:false */
/*globals window:false */

function getColorFormHeight(high) {
  if (high == 0) return "#245eff";
  var color = d3.scaleSequential(d3.interpolateSpectral);
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
    () => [Math.random() * (config.imgSize-1), Math.random() * (config.imgSize-1)]
  );
  var voronoi = d3.voronoi().extent([[0, 0],[config.imgSize, config.imgSize]]);
  sites = voronoi(sites).polygons().map(d3.polygonCentroid);
  volcano(sites, config.imgSize);
  return sites;
}

function volcano(sites, imgSize) {
  var simplex = new SimplexNoise();
  var pts = [];
  for (var x = 0; x < imgSize; x++) {
    pts.push([]);
    for (var y = 0; y < imgSize; y++) {
      var ran = simplex.noise2D(x / 64, y / 64);
      ran = (ran/2)+0.5;
      pts[x].push(ran<=0.3?0:ran);
    }
  }
  sites.forEach(
    p => {
      p[2] = pts[Math.round(p[0])][Math.round(p[1])];
    }
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
