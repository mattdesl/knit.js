var Class = require('klasse');

var Constraint = new Class({

	initialize: function (p1, p2, restingDistance, stiffness, tearDistance) {
		this.p1 = p1;
		this.p2 = p2;
		this.stiffness = stiffness || 1.0;
		//optional -- a falsy value means no tear from distance
		this.tearDistance = tearDistance;
		
		if (typeof restingDistance === "undefined" || (restingDistance!==0 && !restingDistance)) {
			this.restingDistance = this.p1.position.distance(this.p2.position);
		} else {
			
			this.restingDistance = restingDistance;
		}
	},

	solve: function() {
		//distance formula
		var p1vec = this.p1.position;
		var p2vec = this.p2.position;

		var dx = p1vec.x - p2vec.x;
		var dy = p1vec.y - p2vec.y;
		var d = Math.sqrt(dx * dx + dy * dy);

		//tear the constraint 
		if (this.tearDistance && d > this.tearDistance) {
			this.p1.removeConstraint(this);
		}
		
		//ratio for resting distance
		var restingRatio = d===0 ? this.restingDistance : (this.restingDistance - d) / d;
		
		//invert mass quantities
		var im1 = 1.0 / this.p1.mass;
		var im2 = 1.0 / this.p2.mass;
		var scalarP1 = (im1 / (im1 + im2)) * this.stiffness;
		var scalarP2 = this.stiffness - scalarP1;
		
		//push/pull based on mass
		p1vec.x += dx * scalarP1 * restingRatio;
		p1vec.y += dy * scalarP1 * restingRatio;
		
		p2vec.x -= dx * scalarP2 * restingRatio;
		p2vec.y -= dy * scalarP2 * restingRatio;
	}

});

module.exports = Constraint;