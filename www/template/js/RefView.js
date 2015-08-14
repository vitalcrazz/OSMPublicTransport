var RefView = Backbone.View.extend({
	el: '#left_panel_content',
	initialize: function() {
		this.listenTo(this.model, "change", this.routeRefChanged);
	},
	routeRefChanged: function() {
		$('#left_panel').show();
		this.showRouteInfo();
	},
	showRouteInfo: function() {	
		var template = _.template($('#route_directions_template').html());
		this.$el.html(template(this.model.attributes));
	}
});