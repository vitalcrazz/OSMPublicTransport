var RefView = Backbone.View.extend({
	el: '#left_panel_content',
	initialize: function() {
		this.listenTo(this.model, "change:RouteRef", this.routeRefChanged);
	},
	routeRefChanged: function() {
		if(this.model.get('RouteRef') !== '') {
			$('#left_panel').show();
			this.loadRouteInfo();
		}
	},
	showRouteInfo: function(data) {	
		var template = _.template($('#route_directions_template').html());
		this.$el.html(template(data));
	},
	loadRouteInfo: function() {
		$.ajax({
			type: "GET",
			url: "/ajax/get_route_info.php",
			data: {
				id: this.model.get('PlaceID'),
				ref: this.model.get('RouteRef'),
				type: this.model.get('RouteType')
			},
			dataType: "json",
			async: true,
			success: this.showRouteInfo,
			context: this
		});
	}
});