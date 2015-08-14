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
	}
});