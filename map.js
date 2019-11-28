generate();

function generate() {
  d3.select(".mapCells").remove();
  var svg = d3.select("svg");
  var mapCells = svg.append("g").attr("class", "mapCells")
        .on("touchmove mousemove", drawMouseCircle)
        .on("click", createHill);
  var width = parseInt(svg.attr("width"));
  var height = parseInt(svg.attr("height"));
  var sites = d3.range(sizeInput.valueAsNumber).map(
      () => [Math.random() * width, Math.random() * height]
    );
  var voronoi = d3.voronoi().extent([[0, 0],[width, height]]);
  sites = voronoi(sites).polygons().map(d3.polygonCentroid);
  var diagram = voronoi(sites);
  var polygons = diagram.polygons();
  var color = d3.scaleSequential(d3.interpolateSpectral);

  // change options to defaults for hills
  highInput.value = 0.5;
  highOutput.value = 0.5;
  radiusInput.value = 0.99;
  radiusOutput.value = 0.99;

  detectNeighbors(polygons, diagram);
  polygonAppendPath(polygons, mapCells);

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
                .attr("fill", color(1-polyg.high))
    );
  }

  function add(polygonList, start, high, radius, sharpness) {
    var queue = [];
    polygonList[start].high += high;
    polygonList[start].used = 1;
    queue.push(start);
    for (let i = 0; i < queue.length && high > 0.01; i++) {
      high = high * radius;
      polygonList[queue[i]].neighbors
        .filter(e => !polygonList[e].used)
        .forEach(e => {
          var mod = Math.random() * sharpness + 1.1-sharpness;
          if (sharpness == 0) {
            mod = 1;
          }
          polygonList[e].high += high * mod;
          if (polygonList[e].high > 1) {
            polygonList[e].high = 1;
          }
          polygonList[e].used = true;
          queue.push(e);
        });
    }
    polygonList.forEach(polyg => polyg.used = false);
  }

  function recolorPolygonesFromHighs(polygonList) {
    polygonList.forEach(
        polyg => $("#" + polyg.index).attr("fill", color(1-polyg.high))
      );
  }

  function createHill(e) {
    var point = d3.mouse(this);
    var nearest = diagram.find(point[0], point[1]).index;
    mapCells.append("circle")
      .attr("r", 3)
      .attr("cx", point[0])
      .attr("cy", point[1])
      .attr("fill", color(1 - highInput.valueAsNumber))
      .attr("class", "circle");
    add(polygons, nearest, highInput.valueAsNumber, radiusInput.valueAsNumber, sharpnessInput.valueAsNumber);
    recolorPolygonesFromHighs(polygons);
  }

  function drawMouseCircle() {
    var point = d3.mouse(this);
    var nearest = diagram.find(point[0], point[1]).index;
    var radius = radiusInput.valueAsNumber * 50;
    $("#cell").text(nearest);
    $("#high").text((polygons[nearest].high).toFixed(2));
    svg.select(".radius").remove();
    svg.append("circle")
      .attr("r", radius)
      .attr("cx", point[0])
      .attr("cy", point[1])
      .attr("class", "radius");
  }
}
