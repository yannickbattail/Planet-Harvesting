"use strict";
/*globals $:false */
/*globals d3:false */
/*globals L:false */
/*globals SimplexNoise:false */
/*globals window:false */

function getColorFormHeight(high) {
  if (high == 0) return "#245eff";
  //var color = d3.scaleSequential(d3.interpolateSpectral);
  // interpolateYlGnBu
  var color = d3.scaleSequential(d3.interpolateYlGn);
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
    tileSize: 256,
    mapSize: 512,
    size: 50000,
    high: 0.5,
    radius: 0.992,
    sharpness: 0.2
  };
}

function generate(coords) {
  var config = getConfig();
  var svg = d3.create("svg");
  svg.attr("width", config.tileSize);
  svg.attr("height", config.tileSize);
  var mapCells = svg.append("g").attr("class", "mapCells");
  var voronoi = d3.voronoi().extent([[0, 0],[config.tileSize, config.tileSize]]);
  //log('cut tile in polygon list');
  var sites = cutPolygList(coords, polygCenters, config.tileSize);
  //log('create polygons of tile');
  var diagram = voronoi(sites);
  var polygons = diagram.polygons();

  detectNeighbors(polygons, diagram);
  polygonAppendPath(polygons, mapCells);
  log('set height');
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

function zoomCoords(point, origin, coef) {
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
    p => zoomCoords(p, boundaries.min, coef)
  );
}

function init() {
  var config = getConfig();
  log('create base polygons');
  var sites = d3.range(config.size).map(
    () => [Math.random() * (config.mapSize-1), Math.random() * (config.mapSize-1)]
  );
  var voronoi = d3.voronoi().extent([[0, 0],[config.mapSize-1, config.mapSize-1]]);
  log('smooth polygons');
  sites = voronoi(sites).polygons().map(d3.polygonCentroid);
  elevation(sites, config.mapSize);
  log('init end');
  return sites;
}

function elevation(sites, mapSize) {
  var simplex = new SimplexNoise();
  var pts = [];
  log('random elevation map');
  for (var x = 0; x < mapSize; x++) {
    pts.push([]);
    for (var y = 0; y < mapSize; y++) {
      var ran = simplex.noise2D(x / 32, y / 32);
      ran = (ran/2)+0.5;
      pts[x].push(ran<=0.3?0:ran);
    }
  }
  log('set elevation to polygones');
  sites.forEach(
    p => {
      p[2] = pts[Math.round(p[0])][Math.round(p[1])];
    }
  );
}

function log(message) {
  document.getElementById('log').innerHTML += ''+(new Date().toString())+' '+message+'<br />';
}

function defineMaps() {
  L.GridLayer.Zoomap = L.GridLayer.extend({
    createTile: function (coords, done) {
      var tile = generate(coords);
      window.setTimeout(function () {
        // Syntax is 'done(error, tile)'
        done(null, tile);
      }, 50);
      return tile;
    }
  });

  L.gridLayer.zoomap = function(opts) {
    return new L.GridLayer.Zoomap(opts);
  };

  var zoomap = L.gridLayer.zoomap();

  L.GridLayer.DebugCoords = L.GridLayer.extend({
    createTile: function (coords) {
        var tile = document.createElement('div');
        tile.innerHTML = [coords.x, coords.y, coords.z].join(', ');
        tile.style.outline = '1px solid red';
        return tile;
    }
  });

  L.gridLayer.debugCoords = function(opts) {
    return new L.GridLayer.DebugCoords(opts);
  };
  var debugCoords = L.gridLayer.debugCoords();

  //OSM
  const o_osm = new L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
  });

  const mff = new L.tileLayer('https://maps-for-free.com/layer/relief/z{z}/row{y}/{z}_{x}-{y}.jpg', {
      attribution: '&copy; <a href="https://maps-for-free.com">maps-for-free</a> contributors'
  });

  var map = L.map('map', {
    center: [0, 0],
    zoom: 3,
    layers: [zoomap]
  });

  //BaseLayer
  const Map_BaseLayer = {
    "zoomap": zoomap
  };

  //AddLayer
  const Map_AddLayer = {
    "OSM": o_osm,
    "relief": mff,
    "debugCoords": debugCoords
  };

  //LayerControl
  L.control.layers(
    Map_BaseLayer,
    Map_AddLayer,
    {
      collapsed: false
    }
  ).addTo(map);

  //OpacityControl
  L.control.opacity(
    Map_AddLayer,
    {
      label: "Layers Opacity"
    }
  ).addTo(map);
}

var polygCenters = init();
defineMaps();
