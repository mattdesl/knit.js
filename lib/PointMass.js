var Class = require('jsOOP').Class;
var Vector2 = require('minivec').Vector2;
var Constraint = require('./Constraint');

var PointMass = new Class({
	initialize: function (x, y, mass) {
		this.position = new Vector2(x, y);
		this.lastPosition = new Vector2(x, y);
		this.acceleration = new Vector2(0.0, 0.0);
		
		/** Changing this doesn't do anything. 
		This is only included so you can do something with the velocity. */
		this.velocity = new Vector2(0, 0);

		this.pinPosition = null;
		this.pinned = false;
		this.isWeakPin = false;
		this.mass = mass || 1.0;
		
		this.constraints = [];
	},
	
	addForce: function(vec) {
		// acceleration = force / mass
		this.acceleration.x += vec.x / this.mass;
		this.acceleration.y += vec.y / this.mass;
	},
	
	attach: function(point, restingDistance, stiffness, tearDistance) {
		var c = new Constraint(this, point, restingDistance, stiffness, tearDistance);
		this.addConstraint(c);
		return c;
	},
	
	addConstraint: function(constraint) {
		this.constraints.push(constraint);  
	},
	
	removeConstraint: function(constraint) {
		var i = this.constraints.length;
		while (i--) {
			if (this.constraints[i] === constraint)
				this.constraints.splice(i, 1);
		}
	},
	
	pin: function(x, y, weak) {
		if (this.pinPosition === null)
			this.pinPosition = new Vector2();
		this.pinPosition.x = x;
		this.pinPosition.y = y;
		this.pinned = true;
		this.isWeakPin = !!weak;
	},
	
	unpin: function() {
		this.pinned = false;   
		this.isWeakPin = false;
	},
	
	solveConstraints: function(world) {
		//solve each constraint
		for (var i=0; i<this.constraints.length; i++) 
			this.constraints[i].solve();
		
		//force the constraint within the bounds of our window
		if (world.bounds !== null) {
			var bx = world.bounds.x + 1;
			var by = world.bounds.y + 1;
			var bw = world.bounds.width - 1;
			var bh = world.bounds.height - 1;
			
			if (this.position.y < by)
				this.position.y = 2 * by - this.position.y;
			if (this.position.y > bh)
				this.position.y = 2 * bh - this.position.y;
			if (this.position.x < bx)
				this.position.x = 2 * bx - this.position.x;
			if (this.position.x > bw)
				this.position.x = 2 * bw - this.position.x;
		}
		
		//TODO: solve before pinning?
//            if (this.pinned && this.pinPosition !== null) {
//                this.position.x = this.pinPosition.x;
//                this.position.y = this.pinPosition.y;
//            }
	}
});

module.exports = PointMass;