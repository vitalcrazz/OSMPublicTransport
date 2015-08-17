var PlaceView = Backbone.View.extend({
	el: '#left_panel_content',
	initialize: function(options) {
		this.AppData = options.appdata;
		
		this.listenTo(this.model, "change", this.placeIdChanged);
		this.listenTo(this.model, "redraw", this.placeIdChanged);
	},
	placeIdChanged: function() {
		$('#left_panel').show();
		this.showPlaceRoutes();
	},
	showPlaceRoutes: function() {
		var template = _.template($('#route_list_template').html());
		this.$el.html(template(this.model.attributes));

		if(this.model.get('geometry') !== null) {
			var place_geom = L.geoJson(this.model.get('geometry'));
			var map = this.AppData.get('map');
			map.fitBounds(place_geom.getBounds());
		}
		
		_.each(this.model.get('transport'), function(transport_type, transport_index) {
			_.each(transport_type.routes, function(route) {
				var iden = "#" + transport_index + route.ref;
				$(iden).hover(function() {
					_.each(transport_type.routes, function(el) {
						var el_iden = "#" + transport_index + el.ref;
						$(el_iden).css('background', '#FFFFFF');
					});
					$(iden).css('background', 'linear-gradient(90deg, #1E90FF 5%, #EEEEEE 5%)');
				});
			});
		});
	}
});