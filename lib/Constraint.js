var Class = require('jsOOP').Class;

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
		var p1vec = this.p1.position.items;
		var p2vec = this.p2.position.items;

		var dx = p1vec[0] - p2vec[0];
		var dy = p1vec[1] - p2vec[1];
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
		p1vec[0] += dx * scalarP1 * restingRatio;
		p1vec[1] += dy * scalarP1 * restingRatio;
		
		p2vec[0] -= dx * scalarP2 * restingRatio;
		p2vec[1] -= dy * scalarP2 * restingRatio;
	}

});

module.exports = Constraint;