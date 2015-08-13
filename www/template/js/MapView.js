var MapView = Backbone.View.extend({
	router: null,
	initialize: function(options) {
		this.router = options.router;
		
		this.listenTo(this.model, "change:position", this.setView);
		this.listenTo(this.model, "change:zoom", this.setView);
		this.listenTo(this.model, "change:baseLayer", this.setBaselayer);
		this.listenTo(this.model, "mapStateChanged", this.setMapURL);
		this.listenTo(this.model, "zoomValid", this.zoomValid);
		this.listenTo(this.model, "zoomInvalid", this.zoomInvalid);
		this.listenTo(this.model, "tilesLoading", this.tilesLoading);
		this.listenTo(this.model, "tilesLoaded", this.tilesLoaded);
		
		this.model.trigger("change:baseLayer");
	},
	setBaselayer: function() {
		this.model.removeBaseLayers();
		this.model.addBaselayer();
	},
	setView: function() {		
		this.model.resetView();
	},
	setMapURL: function() {
		var MapUrl;
		if (this.model.get('RouteID') !== '') {
			MapUrl = 'route/'+this.model.get('RouteID');
		}
		else {
			var MapBaseLayer = this.model.get('baseLayer');
			var pos = this.model.get('position');
			var zoom = this.model.get('zoom');
			MapUrl= 'map/'+zoom+'/'+pos.lat.toFixed(4)+'/'+pos.lng.toFixed(4)+'/layer/'+MapBaseLayer;
		}
		this.router.navigate(MapUrl, {trigger: false});

		var date = new Date(new Date().getTime() + 3600 * 1000 * 24 * 365);
		document.cookie = "OSMPublicTransport=#"+MapUrl+"; path=/; expires=" + date.toUTCString() + ";";
	},
	zoomValid: function() {
		if($("#top-message-box").text()==="Приблизьте карту") {
			$('#top-message-box').fadeOut();
		}
	},
	zoomInvalid: function() {
		document.getElementById("top-message-box").innerHTML = "Приблизьте карту";
		$('#top-message-box').fadeIn();
	},
	tilesLoading: function() {
		document.getElementById("top-message-box").innerHTML = "Загрузка";
		$('#top-message-box').fadeIn();
	},
	tilesLoaded: function() {
		$('#top-message-box').fadeOut();
	}
});