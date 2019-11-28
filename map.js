
generate();

function generate() {
	d3.select(".mapCells").remove();
  var svg = d3.select("svg"),
      mapCells = svg.append("g").attr("class", "mapCells")
        .on("touchmove mousemove", moved)
        .on("click", clicked),
      width = +svg.attr("width"),
      height = +svg.attr("height"),
      sites = d3.range(sizeInput.valueAsNumber).map(function(d) {
        return [Math.random() * width,
          Math.random() * height];}),
      voronoi = d3.voronoi().extent([[0, 0],[width, height]]),
      sites = voronoi(sites).polygons().map(d3.polygonCentroid),
      diagram = voronoi(sites),
      polygons = diagram.polygons(),
      color = d3.scaleSequential(d3.interpolateSpectral),
      queue = [];

  detectNeighbors();

  function detectNeighbors() {
    // push neighbors indexes to each polygons element
    polygons.map(function(i, d) {
      i.index = d; // index of this element
      i.high = 0;
      var neighbors = [];
      diagram.cells[d].halfedges.forEach(function(e) {
        var edge = diagram.edges[e], ea;
        if (edge.left && edge.right) {
          ea = edge.left.index;
          if (ea === d) {
            ea = edge.right.index;
          }
          neighbors.push(ea);
        }
      })
      i.neighbors = neighbors;
      mapCells.append("path")
        .attr("d", "M" + i.join("L") + "Z")
        .attr("id", d)
        .attr("class", "mapCell")
        .attr("fill", color(1-i.high));
    });
  }

  function add(start, type) {    
    // get options
    var high = highInput.valueAsNumber,
        radius = radiusInput.valueAsNumber,
        sharpness = sharpnessInput.valueAsNumber,
        queue = []; // new queue
    polygons[start].high += high;
    polygons[start].used = 1;
    queue.push(start);
    for (i = 0; i < queue.length && high > 0.01; i++) {
      if (type == "island") {
      	 high = polygons[queue[i]].high * radius;
      } else {
      	high = high * radius;
      }
      polygons[queue[i]].neighbors.forEach(function(e) {
        if (!polygons[e].used) {
          var mod = Math.random() * sharpness + 1.1-sharpness;
          if (sharpness == 0) {mod = 1;}
          polygons[e].high += high * mod;
          if (polygons[e].high > 1) {polygons[e].high = 1;}
          polygons[e].used = 1;
          queue.push(e);
        }
      });
    }
    // re-color the polygons based on new highs
    polygons.map(function(i) {
      $("#" + i.index).attr("fill", color(1-i.high));
      i.used = undefined; // remove used attribute
    });
  }

	function clicked(e) {
    // draw circle based on options on mousemove
    var point = d3.mouse(this),
        nearest = diagram.find(point[0], point[1]).index;
		mapCells.append("circle")
      .attr("r", 3)
      .attr("cx", point[0])
      .attr("cy", point[1])
      .attr("fill", color(1 - highInput.valueAsNumber))
      .attr("class", "circle");
    if ($(".circle").length == 1) {
			add(nearest, "island");
			// change options to defaults for hills
			highInput.value = 0.2;
      highOutput.value = 0.2;
      radiusInput.value = 0.99;
      radiusOutput.value = 0.99;
    } else {
    	add(nearest, "hill");
      // let's make high random for hills
      var height = Math.random() * 0.4 + 0.1;
      highInput.value = height;
      highInput.value = height;
    }   
  }

	function moved() {
    // draw circle based on options on mousemove
    var point = d3.mouse(this),
        nearest = diagram.find(point[0], point[1]).index,
        radius = (radiusInput.valueAsNumber)*50;
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
