'use strict';
var map = L.map('map').fitWorld();
var marker;
var circlePos;
var circle;
var lastLocation = [];
var ressourcesPoints = [];
var ressourceStock = {};
var RULES = {
    "ressourcesPointDuration": 60 * 1000, // in ms
    "ressourcesPointNumber": 50,
    "distanceCatchResource": 100 // in m
};

var RESSOUCES = {
    "gold": {
        "icon": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAFGElEQVRYw+2WXYxdVRXHf3ufc+45c++dmXtnevlooTAtQoskxZZJkUZ8wBDTxEBIjEQTHkzQGEijKD74SFWMKdFGAxiiiT5g6pM+yYuQBjRigNo21gINxFo6/ZiZ3o/zffZey4cxxESDVvtiMr+n/bL3/5+svf5rwTrrrHMl6f/IPvuzt6LLuWKuhO7zz/+497Gdbn+vFz+KlvjKeXH6Z3HyZlmmx8apeXOYzpy465OPHr+iBg6/8MTWbVuvf3JmLvx0Egs0Y/AViAEV0AqkgGZCXZTkrkcTLLD83rvfuPUT333yvzbw2m9+uHjjls6B2V5ydzq5QBhP4coxs/EIIx7Erz3tC9RV+KCH6WyjUaVYOsrovfMs7P25uWwDbxz+/t4bFuYOxom/qaxSVCyJHUM5pJNUlGlObgcYrZlrraKta6H7Ybwa3PIbuPEZyqxhMnKsNBseXHzguUPhfyJ84g/PPDR/VevAzExrUAzP0zRdOianqS+QJCGjKiOz12Cyk/R6Zwhbc9C7B8wUfuV1fHoa8TWuVqpSKAtBq0sPAx9s4NTR5x6fG7T392aj+K8n/0gUDNB6lcgvga1wtsf5s0t0upZo9TAzg+ugfydq2vjhUUx+DvGCiMNXUJWeIhfyUnF1ec/F6szUP5Xg8X1740e+9OC3+/O9x2ZmQqgvgE9BC2hGa+e6AJngyhGBVMjUgGDDxxEbw8qrUC6BRIhENGJwjVJljnQsDMc1ea448bSS3r73Dbx06HtzN+0YfGdu0H+4PT0FLod6iDYr4JcxPoUmQ/0E3ASVAhNvwszvQYnR1Rcx2TtgWojGiER4CREfUhSGdOwYTRx5KjivNEASxyfeL8H2nfGx+esGm0zUAQMqNWoNqiW2XIFmGfwEpEaTjdi5+1BrkZWXMdlbWDWIKqo1IgavHi8BZR6SpoZ0AkXmaRw4FaJWTJTEmw3Akd8+e9uW6d8fDzBooJhWl6DdJ0iuwcQ9iPsgDlsNMcFG1ALnforJ3sXgUV1re+8VFUU0pPF/F88gywKyFJrG4k1A0p2h1ekf+Mj9T389BLg6OfWV0DjUWoIgxGgF1UXEX8KWAUEYQhygyTSmtR0uvoxN30awqBhEBHGCiOKdp3GOvLDkWUBRGLLMUDUBrU6PZHrDL65e2PHI5l1fXoZnCAESO/q8MQIYjHowBlAsCoAag8FitQF9Dd9y0CgejxfBO8U7oa6FqlDq2lGVUBSWNIcwnKV91fVHtLvls4t7v3nyHz99eOp3+x9qt46tiRpQq1gceAMEGFNjJAE1oA2YEWHvFlZShxVwImvilVLmSlV5mlppSo8zEVO9m1eZ3fy5xU8dfOFftXrYby/tsz5HfLWW3SgSRphWDCbGaBvFYjUEFYyvEVaQ9i2Mz/4J13jqSqkroSiEplK8QHtmU9MebP/qrvuf/sEHZU1IfmanRmex1qImwtoQNYI1ijGKwQEOaIAGdQ3izhH1bmV0/HXy2tKUQlUJdQXd/oDpwbandn/mJ1+Dl/5tyoav2l91tqRP3DsdX7yzFSzfEYSyOyKbnsJhjYBRUMWoQ12Dlxzva6a6Gyl9izovyVJHPDVgsHDDof7tj31h220fHf9P+8Avj2hr6/DgXdOdv9zRTfyeIC5vj6LoxijxYCzOBzRNl9PHTnHp9Nsk8zcftRs+9MDivd9653In62VNw1d+/dSOa/vDPVHL70Kqu4uRMEyDL+6+78CL6+vgOuv83/I3QEK8aTeC8jYAAAAASUVORK5CYII=",
        "spawnRate": 0.05
    },
    "iron": {
        "icon": "data:image/png;base64,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",
        "spawnRate": 0.1
    },
    "wood": {
        "icon": "data:image/png;base64,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",
        "spawnRate": 0.5
    }
};
var MyControl = L.Control.extend({
    options: {
        position: 'topright'
    },

    onAdd: function (map) {
        // create the control container with a particular class name
        var container = L.DomUtil.create('div', 'my-custom-control leaflet-bar leaflet-control');
        $(container).html('<div class="leaflet-bar"><a class="leaflet-control-zoom-in" href="#" title="Zoom in">=</a><div>');
        $('#aside').appendTo(container);
        //$('#aside').show();
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

$('.my-custom-control').on('click', function () {
    $('#aside').appendTo('.my-custom-control');
    $('#aside').show();
});

function onLocationFound(evt) {
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

function addLastPosition(position) {
    lastLocation.unshift(position);
    lastLocation = lastLocation.slice(0, 100);
}

function onLocationError(e) {
    toastr.error("Geolocation error: " + e.message);
}

function updateRessourcesPoints() {
    //console.log("updateRessourcesPoints");
    for (var pointIndex = 0; pointIndex < ressourcesPoints.length; pointIndex++) {
        var point = ressourcesPoints[pointIndex];
        if ((new Date() - point.creation) > RULES.ressourcesPointDuration) {
            console.log("rm rp", point);
            rmRessourcesPointsOnMap(point);
            ressourcesPoints.splice(pointIndex, 1);
        }
    }

    if (lastLocation.length !== 0) {
        for (var i = ressourcesPoints.length; i < RULES.ressourcesPointNumber; i++) {
            point = createRessourcesPoints();
            if (point) {
                console.log("add rp", point);
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
}

function updateRessourceStock() {
    var html = '';
    for (var ressourceType in ressourceStock) {
        if (ressourceStock.hasOwnProperty(ressourceType)) {
            var ressource = ressourceStock[ressourceType];
            html += '<li><img src="' + RESSOUCES[ressourceType].icon + '" /> ' + round(ressource, 3) + 'Kg</li>';
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
    setView: true,
    maxZoom: 17,
    watch: true,
    enableHighAccuracy: true
});

setInterval(updateRessourcesPoints, 3000);
