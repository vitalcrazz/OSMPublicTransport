var Router = Backbone.Router.extend({
	routes: {
		"map/:zoom/:lat/:lon(/layer/:layer)": "reload",
		"route/:route": "load_route"
	},
	reload: function(zoom, lat, lon, layer) {
		map.setView(L.latLng(lat, lon), zoom);
		
		if(layer) {
			mapData.set('baseLayer', layer);
		}
	},
	load_route: function(route) {
		if(route) {
			mapData.set('RouteID', route);
		}
	}
});

function clearRouteLayer() {
	RouteLayer.clearLayers();
	RoutePlatformLayer.clearLayers();
	RouteStopLayer.clearLayers();

	mapData.set('RouteID', '');

	//$('#left_panel').hide();
	map.invalidateSize();
	//setMapURL();

	//checkZoom();
}

var RouteLayer = new L.FeatureGroup();
var RoutePlatformLayer = new L.FeatureGroup();
var RouteStopLayer = new L.FeatureGroup();

function getRouteData(rID) {
	if (rID !== '') {
		RouteLayer.clearLayers();
		RoutePlatformLayer.clearLayers();
		RouteStopLayer.clearLayers();

		if (map.hasLayer(stopsGeoJsonTileLayer)) {
			map.removeLayer(stopsGeoJsonTileLayer);
		}
		if (map.hasLayer(platformsGeoJsonTileLayer)) {
			map.removeLayer(platformsGeoJsonTileLayer);
		}
		if (map.hasLayer(stationsGeoJsonTileLayer)) {
			map.removeLayer(stationsGeoJsonTileLayer);
		}

		$("#platform-list").empty();
		$("#stop-position-list").empty();
		$.ajax({
			type: "POST",
			url: "/ajax/get_route_data.php",
			data: {
				id: rID
			},
			dataType: "script",
			async: false,
			success: function(data){
				if (typeof geojsonRoute !== "undefined") {
					L.geoJson(geojsonRoute, {
						style: {
							"color": "#1E90FF",
							"weight": 6,
							"opacity": 0.6
						},
						onEachFeature: function (feature, layer) {
							bindRoutePopup(feature, layer);
							createRouteInfo(feature);
						}
					}).addTo(RouteLayer);
					delete geojsonRoute;
				}
				if (typeof geojsonStops !== "undefined") {
					L.geoJson(geojsonStops, {
						style: {
							"color": "#FFFFFF",
							"weight": 1,
							"opacity": 1
						},
						pointToLayer: function (feature, latlng) {
							return L.circleMarker(latlng, {
								radius: 6,
								fillColor: "#1E90FF",
								color: "#000",
								weight: 2,
								opacity: 1,
								fillOpacity: 1
							});
						},
						onEachFeature: function (feature, layer) {
							bindLabel(feature, layer);
							layer.on('click', function() {
								loadFeaturePopupData(feature, layer);
							});
							createListElements(feature, layer);
						}
					}).addTo(RouteStopLayer);
					delete geojsonStops;
				}
				if (typeof geojsonPlatforms !== "undefined") {
					L.geoJson(geojsonPlatforms, {
						style: {
							"color": "#1E90FF",
							"weight": 2,
							"opacity": 1
						},
						pointToLayer: function (feature, latlng) {
							return L.circleMarker(latlng, {
								radius: 6,
								fillColor: "#FFFFFF",
								color: "#000",
								weight: 1,
								opacity: 1,
								fillOpacity: 1
							});
						},
						onEachFeature: function (feature, layer) {
							bindLabel(feature, layer)
							layer.on('click', function() {
								loadFeaturePopupData(feature, layer);
							});
							createListElements(feature, layer);
						}
					}).addTo(RoutePlatformLayer);
					delete geojsonPlatforms;
				}

				map.addLayer(RouteLayer);
				map.addLayer(RouteStopLayer);
				map.addLayer(RoutePlatformLayer);

				if (document.getElementById('stop-position-list').childNodes.length > document.getElementById('platform-list').childNodes.length) {
					document.getElementById("SelectList").options[1].selected=true;
					document.getElementById('platform-list').style.display = 'none';
					document.getElementById('stop-position-list').style.display = 'block';
				}
				$('#left_panel').show();
				map.invalidateSize();
				map.fitBounds(RouteLayer.getBounds());
				
				mapData.set('RouteID', rID);
			}
		});
	}
}

function bindLabel(feature, layer) {
	if (feature.properties.name !== '') {
		layer.bindLabel(feature.properties.name, {
			direction: 'auto'
		});
	}
}

function loadFeaturePopupData(feature, layer) {
	var popupContent;
	$.ajax({
		type: "POST",
		url: "/ajax/get_detail_info.php",
		data: {
			id: feature.properties.id,
		},
		dataType: "text",
		async: false,
		success: function(data){
			var busRes = '';
			var trolleybusRes = '';
			var sharetaxiRes = '';
			var tramRes = '';
			var trainRes = '';
			if (data !== '') {
				routes = JSON.parse(data);
				for (var i = 0, length = routes.length; i < length; i++) {
					if (i in routes) {
						if (routes[i].from == null) {
							routes[i].from = 'Неизвестно';
						}
						if (routes[i].to == null) {
							routes[i].to = 'Неизвестно';
						}
						switch (routes[i].type) {
							case 'bus':
								busRes += '<a href="#" onclick="getRouteData('+routes[i].id+'); return false;">'+routes[i].ref+'</a> ('+routes[i].from+' ⇨ '+routes[i].to+')<br>';
								break;
							case 'trolleybus':
								trolleybusRes += '<a href="#" onclick="getRouteData('+routes[i].id+'); return false;">'+routes[i].ref+'</a> ('+routes[i].from+' ⇨ '+routes[i].to+')<br>';
								break;
							case 'share_taxi':
								sharetaxiRes += '<a href="#" onclick="getRouteData('+routes[i].id+'); return false;">'+routes[i].ref+'</a> ('+routes[i].from+' ⇨ '+routes[i].to+')<br>';
								break;
							case 'tram':
								tramRes += '<a href="#" onclick="getRouteData('+routes[i].id+'); return false;">'+routes[i].ref+'</a> ('+routes[i].from+' ⇨ '+routes[i].to+')<br>';
								break;
							case 'train':
								trainRes += '<a href="#" onclick="getRouteData('+routes[i].id+'); return false;">'+routes[i].ref+'</a> ('+routes[i].from+' ⇨ '+routes[i].to+')<br>';
								break;
						}
					}
				}
			}
			if (feature.properties) {
				switch (feature.properties.type) {
					case 'station':
						featureType = 'Станция';
						break;
					case 'platform':
						featureType = 'Остановка транспорта';
						break;
					case 'stop':
						featureType = 'Место остановки транспорта';
						break;
				}
				if (feature.properties.name == "") {
					feature.properties.name = "Без названия";
				}

				popupContent = "<span id='popup-title'>" + feature.properties.name + "</span>";
				popupContent += "<br>" + featureType + "<hr>";

				if (busRes !== '') {
					popupContent += '<b>Автобусы:</b><br>' + busRes;
				}
				if (trolleybusRes !== '') {
					popupContent += '<b>Троллейбусы:</b><br>' +trolleybusRes;
				}
				if (sharetaxiRes !== '') {
					popupContent += '<b>Маршрутные такси:</b><br>' +sharetaxiRes;
				}
				if (tramRes !== '') {
					popupContent += '<b>Трамваи:</b><br>' +tramRes;
				}
				if (trainRes !== '') {
					popupContent += '<b>Поезда:</b><br>' +trainRes;
				}
				if (feature.properties.description == '') {
					popupContent += feature.properties.description;
				}
			}

		}
	});
	layer.bindPopup(popupContent);
	layer.openPopup();
}

function bindRoutePopup(feature, layer) {
	var popupContent;
	if (feature.properties) {
		with (feature.properties) {
			if ((from !== '') & (to !== '')) {
				var from_to = ": " + from + " ⇨ " + to;
			} else {
				from_to = '';
			}
			popupContent = "<b>" + type + " " + ref + from_to + "</b><hr>";
			popupContent += "Протяженность маршрута: " + length + " км.";
		}
		layer.bindPopup(popupContent);
	}
}

function createRouteInfo(feature) {
	var template = _.template($('#route_info_template').html());
	$('#left_panel_content').html(template({
		'type' : feature.properties.type,
		'ref': feature.properties.ref,
		'length': feature.properties.length
	}));
	$('#close_route').click(function() {
		clearRouteLayer();
		showPlaceRoutes(feature.properties.place_id)
	});
}

function showRouteInfo(route_ref, route_type, place_id) {
	$.ajax({
		type: "GET",
		url: "/ajax/get_route_info.php",
		data: {
			id: place_id,
			ref: route_ref,
			type: route_type
		},
		dataType: "json",
		async: true,
		success: function(data){
			var template = _.template($('#route_directions_template').html());
			$('#left_panel_content').html(template(data));
		}
	});
}

function showPlaceRoutes(place_id) {
	$.ajax({
		type: "GET",
		url: "/ajax/get_routes_list.php",
		data: {
			id: place_id
		},
		dataType: "json",
		async: true,
		success: function(data){
			var template = _.template($('#route_list_template').html());
			$('#left_panel_content').html(template(data));
		}
	});
}

function createListElements(feature, layer) {
	if (feature.properties) {
		if (feature.properties.name == "") {
			feature.properties.name = "Без названия";
		}

		if (feature.properties.type == 'platform') {
			var item = document.getElementById('platform-list').appendChild(document.createElement('li'));
			item.innerHTML = feature.properties.name;
			if (feature.geometry.type=='Point') {
				item.onmouseover = function() {
					layer.showLabel();
				};
				item.onmouseout = function() {
					layer.hideLabel();
				};
			}
			item.onclick = function() {
				loadFeaturePopupData(feature, layer);
			};
		}
		if (feature.properties.type == 'stop') {
			var item = document.getElementById('stop-position-list').appendChild(document.createElement('li'));
			item.innerHTML = feature.properties.name;
			if (feature.geometry.type=='Point') {
				item.onmouseover = function() {
					layer.showLabel();
				};
				item.onmouseout = function() {
					layer.hideLabel();
				};
			}
			item.onclick = function() {
				loadFeaturePopupData(feature, layer);
			};
		}
	}
}

function SetList() {
	var list_id = document.getElementById('SelectList').selectedIndex;
	if (list_id == 0) {
		document.getElementById('platform-list').style.display = 'block';
		document.getElementById('stop-position-list').style.display = 'none';
	}
	if (list_id == 1) {
		document.getElementById('platform-list').style.display = 'none';
		document.getElementById('stop-position-list').style.display = 'block';
	}
}

var OSMAttr = 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors',
	CCBYSAAttr = '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>';

var MapSurferAttr = OSMAttr+', ' + CCBYSAAttr + ', Rendering <a href="http://giscience.uni-hd.de/">GIScience Research Group @ Heidelberg University</a>',
	SputnikAttr = OSMAttr+', ' + CCBYSAAttr + ', Tiles <a href="http://www.sputnik.ru/">© Спутник</a>',
	MapnikAttr = OSMAttr+', ' + CCBYSAAttr,
	PTAttr = 'Маршруты © <a href="http://www.openmap.lt/">openmap.lt</a>';

var MapSurferUrl = 'http://129.206.74.245/tiles/roads/x={x}&y={y}&z={z}',
	SputnikUrl = 'http://tiles.maps.sputnik.ru/{z}/{x}/{y}.png',
	MapnikUrl = 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
	PTUrl = 'http://pt.openmap.lt/{z}/{x}/{y}.png';

var MapSurferLayer   = L.tileLayer(MapSurferUrl, {attribution: MapSurferAttr, title: "MapSurfer"}),
	SputnikRuLayer  = L.tileLayer(SputnikUrl, {attribution: SputnikAttr, title: "sputnik.ru"}),
	MapnikLayer  = L.tileLayer(MapnikUrl, {attribution: MapnikAttr, title: "Mapnik"}),
	PTLayer = L.tileLayer(PTUrl, {attribution: PTAttr, title: "Слой маршрутов"});

var platformsGeoJsonTileLayer = new L.TileLayer.GeoJSON('/platform/{z}/{x}/{y}.geojson', {
		clipTiles: false,
		unique: function (feature) {
			return feature.properties.id;
		},
		minZoom: 14,
		title: "Остановки / платформы"
	}, {
		style: {
			"color": "#1E90FF",
			"weight": 2,
			"opacity": 1
		},
		pointToLayer: function (feature, latlng) {
			var cMarker = L.circleMarker(latlng, {
				radius: 6,
				fillColor: "#FFFFFF",
				color: "#000",
				weight: 1,
				opacity: 1,
				fillOpacity: 1
			});
			return cMarker;
		},
		onEachFeature: function (feature, layer) {
			bindLabel(feature, layer);
			layer.on('click', function() {
				loadFeaturePopupData(feature, layer);
			});
		}
	}
);

var stationsGeoJsonTileLayer = new L.TileLayer.GeoJSON('/station/{z}/{x}/{y}.geojson', {
		clipTiles: false,
		unique: function (feature) {
			return feature.properties.id;
		},
		minZoom: 14,
		title: "Станции"
	}, {
		style: {
			"color": "#008000",
			"weight": 3,
			"opacity": 1
		},
		pointToLayer: function (feature, latlng) {
			var cMarker = L.circleMarker(latlng, {
				radius: 8,
				fillColor: "#FFFFFF",
				color: "#000",
				weight: 1,
				opacity: 1,
				fillOpacity: 1
			});
			return cMarker;
		},
		onEachFeature: function (feature, layer) {
			bindLabel(feature, layer);
			layer.on('click', function() {
				loadFeaturePopupData(feature, layer);
			});
		}
	}
);

var stopsGeoJsonTileLayer = new L.TileLayer.GeoJSON('/stop_pos/{z}/{x}/{y}.geojson', {
		clipTiles: false,
		unique: function (feature) {
			return feature.properties.id;
		},
		minZoom: 14,
		title: "Места остановок"
	}, {
		style: {
			"color": "#FFFFFF",
			"weight": 1,
			"opacity": 1
		},
		pointToLayer: function (feature, latlng) {
			var cMarker = L.circleMarker(latlng, {
				radius: 6,
				fillColor: "#1E90FF",
				color: "#000",
				weight: 2,
				opacity: 1,
				fillOpacity: 1
			});

			bindLabel(feature, cMarker);
			cMarker.on('click', function() {
				loadFeaturePopupData(feature, cMarker);
			});
			cMarker.on('add', function() {
				cMarker.bringToBack();
			});
			return cMarker;
		}
	}
);

var map = L.map('map', {
	closePopupOnClick: false
});

var mapData = new MapData({
	'map': map,
	'baseLayers': {
		'S': MapSurferLayer,
		'K': SputnikRuLayer,
		'M': MapnikLayer
	},
	'overlays': [
		PTLayer,
		stationsGeoJsonTileLayer,
		platformsGeoJsonTileLayer,
		stopsGeoJsonTileLayer
	]
});

var router = new Router();
var mapView = new MapView({'model': mapData, 'router': router});

if(!Backbone.history.start()) {
	router.navigate("map/3/60.50/107.50", {trigger: true});
}

map.addLayer(platformsGeoJsonTileLayer);

//getRouteData(RouteID);