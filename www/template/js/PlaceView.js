var PlaceView = Backbone.View.extend({
	el: '#left_panel_content',
	initialize: function() {
		this.listenTo(this.model, "change:PlaceID", this.placeIdChanged);
		this.listenTo(this.model, "change:RouteRef", this.placeIdChanged);
	},
	placeIdChanged: function() {
		if(this.model.get('PlaceID') > 0 && this.model.get('RouteRef') === '') {
			$('#left_panel').show();
			this.loadPlaceRoutes();
		}
	},
	showPlaceRoutes: function(data) {
		var template = _.template($('#route_list_template').html());
		this.$el.html(template(data));

		if(data.geometry !== null) {
			var place_geom = L.geoJson(data.geometry);
			var map = this.model.get('map');
			map.fitBounds(place_geom.getBounds());
		}
	},
	loadPlaceRoutes: function() {
		$.ajax({
			type: "GET",
			url: "/ajax/get_routes_list.php",
			data: {
				id: this.model.get('PlaceID')
			},
			dataType: "json",
			async: true,
			success: this.showPlaceRoutes,
			context: this
		});
	}
});