var Class = require('klasse');
var Vector2 = require('vecmath').Vector2;

//Influence, inherits from PointMass
var Influence = new Class({
	initialize: function(x, y, distance, scalar, maxDist) {
		this.position = new Vector2(x, y);
		this.lastPosition = new Vector2();
		this.distance = distance || 0;
		this.scalar = scalar || 1.0;
		this.maxDist = maxDist || 0;
		this.tears = false;
		this.moves = true;
	}
});

module.exports = Influence;
