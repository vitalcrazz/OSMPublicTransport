var PlaceView = Backbone.View.extend({
	el: '#left_panel_content',
	initialize: function(options) {
		this.AppData = options.appdata;
		
		this.RouteLayer = new L.FeatureGroup();
		
		this.listenTo(this.model, "change", this.place_reload);
		this.listenTo(this.model, "redraw", this.place_redraw);
	},
	place_redraw: function() {
		$('#left_panel').show();
		this.showPlaceRoutes();
	},
	place_reload: function() {
		var ind = 0;
		_.each(this.model.get('transport'), function(transport_type, transport_index) {
			_.each(transport_type.routes, function(route) {
				route.color = randomColor({luminosity: 'dark'});
				route.visible = false;
			});
		});
		
		this.place_redraw();
	},
	showPlaceRoutes: function() {
		var template = _.template($('#route_list_template').html());
		this.$el.html(template(this.model.attributes));

		if(this.model.get('geometry') !== null) {
			var place_geom = L.geoJson(this.model.get('geometry'));
			var map = this.AppData.get('map');
			map.fitBounds(place_geom.getBounds());
		}
		
		var view = this;
		_.each(this.model.get('transport'), function(transport_type, transport_index) {
			_.each(transport_type.routes, function(route) {
				var iden = "#" + transport_index + route.ref;
				$(iden).click(function() {
					/*
					_.each(transport_type.routes, function(el) {
						var el_iden = "#" + transport_index + el.ref;
						$(el_iden).css('background', '#FFFFFF');
					});*/
					
					route.visible = ! route.visible;
					if(route.visible) {
						$(iden).css('background', 'linear-gradient(90deg, '+route.color+' 5%, #EEEEEE 5%)');
					}
					else {
						$(iden).css('background', '#FFFFFF');
					}
					view.buildRoute(transport_index);
				});
			});
		});
	},
	buildRoute: function(tr_type) {
		this.RouteLayer.clearLayers();
		
		var map = this.AppData.get('map');
		var routeLayer = this.RouteLayer;
		
		var tr_arr = this.model.get('transport')[tr_type].routes;
		_.each(tr_arr, function(tr_el) {
			if(tr_el.visible) {
				L.geoJson(tr_el.route, {
					style: {
						"color": tr_el.color,
						"weight": 8,
						"opacity": 0.4
					},
					onEachFeature: function (feature, layer) {
						//
					}
				}).addTo(routeLayer);
			}
		});
		
		map.addLayer(this.RouteLayer);
	}
});