var MapData = Backbone.Model.extend({
	defaults: {
		'baseLayer': 'S',
		'RouteID': '',
		'minZoom': 14
	},
	initialize: function() {
		var baseLayers = this.mapLayerArray(this.get('baseLayers'));
		var overlays = this.mapLayerArray(this.get('overlays'));
		L.control.layers(baseLayers, overlays).addTo(this.get('map'));
		
		this.init_plugins();
		
		this.get('overlays').forEach(function(element, index, array) {
			element.on('loading', function() {
				if (this.get('map').getZoom() >= this.get('minZoom')) {
					this.trigger('tilesLoading');
				}
			}, this);
			element.on('load', function() {
				if (this.get('map').getZoom() >= this.get('minZoom')) {
					var is_completed = array.reduce(function(prev, cur) {
						var tilesToLoad = cur._tilesToLoad || 0;
						return prev && (tilesToLoad < 1);
					}, true);
					if(is_completed)
						this.trigger('tilesLoaded');
				}
			}, this);
		}, this);
		
		this.get('map').on('baselayerchange', this.onBaselayerChange, this);
		this.get('map').on('moveend', this.onMoveEnd, this);
		this.get('map').on('zoomend', this.onZoomEnd, this);
		this.get('map').on('overlayadd', this.onOverlayAdd, this);
	},
	mapLayerArray: function(layers) {
		return _.object(_.map(layers, function(val){
			return [val.options.title, val];
		}));
	},
	init_plugins: function() {
		var map = this.get('map');
		
		L.control.scale().addTo(map);

		L.control.fullscreen({
			position: 'topleft',
			title: 'Full Screen',
			forceSeparateButton: true,
			forcePseudoFullscreen: false
		}).addTo(map);

		L.control.locate({
			icon: 'fa fa-map-marker',
			iconLoading: 'fa fa-spinner fa-spin',
			onLocationError: function(err) {alert(err.message)},
			onLocationOutsideMapBounds:  function(context) {
					alert(context.options.strings.outsideMapBoundsMsg);
			},
			strings: {
				title: "Show me where I am",
				popup: "Вы находитесь в пределах {distance} м. от этой точки",
				outsideMapBoundsMsg: "You seem located outside the boundaries of the map"
			}
		}).addTo(map);

		var topMessage = L.Control.extend({
			options: {
				position: 'topleft'
			},
			onAdd: function (map) {
				var container = L.DomUtil.create('div', 'top-message');
				container.id = 'top-message-box';
				return container;
			}
		});

		map.addControl(new topMessage());
	},
	onBaselayerChange: function() {
		var layerIndex = this.get('baseLayer');
		_.find(this.get('baseLayers'), function(item, index) {
			if(this.get('map').hasLayer(item)) {
				layerIndex = index;
				return true;
			}
		}, this);
		
		this.set({'baseLayer': layerIndex},{'silent':true});
		this.trigger('mapStateChanged');
	},
	onMoveEnd: function() {
		this.trigger('mapStateChanged');
	},
	onZoomEnd: function() {
		if (this.get('map').getZoom() < this.get('minZoom')) {
			if(!this.get('RouteID')) {
				this.trigger('zoomInvalid');
			}
		}
		else {
			this.trigger('zoomValid');
		}
	},
	onOverlayAdd: function() {
		
	}
});