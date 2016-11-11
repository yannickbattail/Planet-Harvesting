'use strict';

$(document).ready(function() {
    function loadStorage(name, defaultValue) {
        if (window.localStorage.getItem(name)) {
            try {
                return JSON.parse(window.localStorage.getItem(name));
            } catch (err) {
                console.warn("could not load " + name + " from localStorage ", err);
            }
        }
        window.localStorage.setItem(name, JSON.stringify(defaultValue));
        return defaultValue;
    }

    var marker;
    var circlePos;
    var circle;
    var lastLocation = loadStorage('lastLocation', []);
    var ressourcesPoints = [];
    var pointsOfInterest = loadStorage('pointsOfInterest', []);
    var ressourceStock = loadStorage('ressourceStock', {});
    var moveMapToLocation = true;
    var map = L.map('map').fitWorld();

    var MyControl = L.Control.extend({
        options: {
            position: 'topright'
        },

        onAdd: function (map) {
            // create the control container with a particular class name
            var container = L.DomUtil.create('div', 'my-custom-control leaflet-bar leaflet-control');
            $(container).html('<div class="leaflet-bar">' +
                '<a id="asideBtn" class="leaflet-control-zoom-in" href="#" title="Zoom in">=</a>' +
                '<div id="aside" class="hidden">Ressources<div id="ressourcesStock">' +
                '<ul id="ressourcesList">' +
                '</ul>' +
                '</div>' +
                '<div id="mainBuilding">' +
                '<img src="img/mainBuilding.png" />Home' +
                '</div>' +
                '</div>' +
                '<div>');
            return container;
        },
        initialize: function (foo, options) {
            L.Util.setOptions(this, options);
        }
    });

    L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpandmbXliNDBjZWd2M2x6bDk3c2ZtOTkifQ._QA7i5Mpkd_m30IGElHziw', {
        maxZoom: 18,
        attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
        '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
        'Imagery &copy; <a href="http://mapbox.com">Mapbox</a>',
        id: 'mapbox.streets'
    }).addTo(map);

    map.addControl(new MyControl('bar', {position: 'topright'}));

    $('#asideBtn').on('click', function () {
        $('#aside').toggle();
    });
    $('#mainBuilding').on('click', function () {
        var mainBuld = findPoiByName('mainBuilding');
        if (mainBuld === null) {
            pointsOfInterest.push({
                'type' : 'building',
                'name' : 'mainBuilding',
                'latLng' : L.latLng(lastLocation[0].latlng)
            });
            console.log(lastLocation[0]);
        } else {
            console.log(mainBuld);
            map.panTo(L.latLng(mainBuld.latLng));
        }
        putPoisOnMap();
        moveMapToLocation = !moveMapToLocation;
    });


    function onLocationFound(evt) {
        if (moveMapToLocation) {
            map.setView(evt.latlng, 17);
        }
        //console.log(evt);
        var radius = evt.accuracy / 2;
        if (marker) {
            marker.setLatLng(evt.latlng);
        } else {
            marker = L.marker(evt.latlng);
        }
        marker.addTo(map);
        //.bindPopup("You are within " + Math.round(radius) + " meters from this point").openPopup();

        if (circlePos) {
            circlePos.setLatLng(evt.latlng).setRadius(radius);
        } else {
            circlePos = L.circle(evt.latlng, radius, {
                color: "yellow",
                opacity: 0.2,
                weight: 15,
                fillOpacity: 0.3
            });
        }
        circlePos.addTo(map);

        if (circle) {
            circle.setLatLng(evt.latlng);
        } else {
            circle = L.circle(evt.latlng, RULES.distanceCatchResource);
        }
        circle.addTo(map);

        addLastPosition(evt);
        //catchResource(evt);
    }

    function round(number, precision) {
        var factor = Math.pow(10, precision);
        var tempNumber = number * factor;
        var roundedTempNumber = Math.round(tempNumber);
        return roundedTempNumber / factor;
    }

    function findPoiByName(poiName) {
        for (var poiIndex = 0; poiIndex < pointsOfInterest.length; poiIndex++) {
            var poi = pointsOfInterest[poiIndex];
            if (poi.name == poiName) {
                return poi;
            }
        }
        return null;
    }

    function putPoisOnMap() {
        for (var poiIndex = 0; poiIndex < pointsOfInterest.length; poiIndex++) {
            var poi = pointsOfInterest[poiIndex];
            if (poi.name === 'mainBuilding') {
                var icon = L.icon({iconUrl: 'img/mainBuilding.png'});
                L.marker(poi.latLng, {icon: icon}).addTo(map)
                    .bindPopup('Main building')
                    /*.on('click', onClickRessourcesPoints).openPopup()*/;
            }
        }
    }

    function addLastPosition(position) {
        lastLocation.unshift(position);
        lastLocation = lastLocation.slice(0, 100);
        delete position.target;
        window.localStorage.setItem('lastLocation', JSON.stringify(lastLocation));
    }

    function onLocationError(e) {
        toastr.error("Geolocation error: " + e.message);
    }

    function updateRessourcesPoints() {
        //console.log("updateRessourcesPoints");
        for (var pointIndex = 0; pointIndex < ressourcesPoints.length; pointIndex++) {
            var point = ressourcesPoints[pointIndex];
            if ((new Date() - point.creation) > RULES.ressourcesPointDuration) {
                //console.log("rm rp", point);
                rmRessourcesPointsOnMap(point);
                ressourcesPoints.splice(pointIndex, 1);
            }
        }

        if (lastLocation.length !== 0) {
            for (var i = ressourcesPoints.length; i < RULES.ressourcesPointNumber; i++) {
                point = createRessourcesPoints();
                if (point) {
                    //console.log("add rp", point);
                    ressourcesPoints.push(point);
                }
            }
        }

        for (pointIndex = 0; pointIndex < ressourcesPoints.length; pointIndex++) {
            point = ressourcesPoints[pointIndex];
            putRessourcesPointsOnMap(point);
        }
    }

    function gessRessourceType() {
        for (var resType in RESSOUCES) {
            if (RESSOUCES[resType].spawnRate > Math.random()) {
                return resType;
            }
        }
        return "wood";
    }

    function createRessourcesPoints() {
        var point = {
            "lat": lastLocation[0].latitude + (Math.random() - 0.5) / 200,
            "lng": lastLocation[0].longitude + (Math.random() - 0.5) / 200,
            "type": gessRessourceType(),
            "quantity": Math.random(),
            "creation": new Date(),
            "marker": null
        };
        //console.log("new rp", point);
        return point;
    }

    function putRessourcesPointsOnMap(point) {
        if (point.marker === null) {
            var myIcon = L.icon({iconUrl: RESSOUCES[point.type].icon});
            point.marker = L.marker(L.latLng(point.lat, point.lng), {icon: myIcon}).addTo(map)
                .bindPopup(point.type + ": " + round(point.quantity, 3) + "Kg")
                .on('click', onClickRessourcesPoints)
            /*.openPopup()*/;
        }
    }

    function rmRessourcesPointsOnMap(point) {
        if (point.marker !== null) {
            map.removeLayer(point.marker);
        }
    }

    function onClickRessourcesPoints(evt) {
        console.log(evt);
        var pointIndex = getRessourcePointByLatlng(evt.latlng);
        if (pointIndex !== null) {
            var point = ressourcesPoints[pointIndex];
            var distance = evt.latlng.distanceTo(L.latLng(lastLocation[0].latitude, lastLocation[0].longitude));
            if (distance < RULES.distanceCatchResource) {
                resourceCaught(point, pointIndex);
            } else {
                toastr.options = {"timeOut": "1001"};
                toastr.warning("Resource too far. (" + Math.round(distance) + "m)");
            }
        }
    }

    function getRessourcePointByLatlng(latlng) {
        for (var pointIndex = 0; pointIndex < ressourcesPoints.length; pointIndex++) {
            var point = ressourcesPoints[pointIndex];
            if (latlng.lat === point.lat && latlng.lng === point.lng) {
                return pointIndex;
            }
        }
        return null;
    }

    function resourceCaught(point, pointIndex) {
        toastr.success("Resource caught " + point.type + " " + round(point.quantity, 3) + "Kg");
        if (!ressourceStock[point.type]) {
            ressourceStock[point.type] = 0;
        }
        ressourceStock[point.type] += point.quantity;
        updateRessourceStock();
        rmRessourcesPointsOnMap(point);
        ressourcesPoints.splice(pointIndex, 1);
        window.localStorage.setItem('ressourceStock', JSON.stringify(ressourceStock));
    }

    function updateRessourceStock() {
        var html = '';
        for (var ressourceType in ressourceStock) {
            if (ressourceStock.hasOwnProperty(ressourceType)) {
                var ressource = ressourceStock[ressourceType];
                html += '<li><img src="' + RESSOUCES[ressourceType].icon + '" title="' + ressourceType + '" /> ' + round(ressource, 3) + 'Kg</li>';
            }
        }
        $('#ressourcesList').html(html);
    }

    function isNear(p1, p2) {
        var dst = p1.distanceTo(p2);
        console.log(p1, p2, dst);
        return dst < RULES.distanceCatchResource;
    }

    map.on('locationfound', onLocationFound);
    map.on('locationerror', onLocationError);

    map.locate({
        setView: false,
        maxZoom: 18,
        watch: true,
        enableHighAccuracy: true
    });

    setInterval(updateRessourcesPoints, 3000);
});
