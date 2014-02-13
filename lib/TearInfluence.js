
//TearInfluence, inherits from PointMass
var Class = require('klasse');
var Vector2 = require('vecmath').Vector2;
var Influence = require('./Influence');

var TearInfluence = new Class({
	
	Extends: Influence,

	initialize: function(x, y, distance) {
		Influence.call(this, x, y, distance);
		this.position = new Vector2(x, y);
		this.distance = distance;
		this.tears = true;
	}
});

module.exports = TearInfluence;