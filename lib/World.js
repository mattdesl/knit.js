var Class = require('jsOOP').Class;
var Vector2 = require('minivec').Vector2;

var Influence = require('./Influence');
var PointMass = require('./PointMass');
var TearInfluence = require('./TearInfluence');
var Constraint = require('./Constraint');

var distSq = require('minimath').distanceSq;

var World = new Class({

	initialize: function(gravity) {
		this.gravity = gravity || new Vector2(0, 1200);
		this.friction = 0.99;
		this.bounds = null;
		this.accuracy = 2;
		this.points = [];
		
		this.move = new PointMass(0, 0);
		this.tear = new PointMass(0, 0);
		this.tearInfluenceSq = 0;
		this.moveInfluenceSq = 0;
		
		this.influences = [];
		this._pinRemoveInfluenceSq = 0;
		this.moveScalar = 1.8; 
		this.maxMoveSq = 0.0;
		
		this.obstacles = [];
		
		this.groundFriction = 1.0;
		this.floor = null;
		this.bounds = null;
	},

	setPinRemoveInfluence: function(influence) {
		this._pinRemoveInfluenceSq = influence * influence;
	},
	
	addInfluence: function(influence) {
		this.influences.push(influence);
	},
	
	/** Adds a single point mass to the world. */
	addPoint: function(pointMass) {
		this.points.push(pointMass);
	},
	
	/** Adds an array of point masses. */
	addPoints: function(pointsArray) {
		for (var i=0; i<pointsArray.length; i++) {
			this.points.push(pointsArray[i]);
		}
	},
	
	applyMotion: function(x, y, influence, scalar, maxDist) {
		this.moveInfluenceSq = influence * influence;
		this.moveScalar = scalar || 1.8;
		this.move.position.x = x;
		this.move.position.y = y;
		
		if (maxDist === 0) {
			this.maxMoveSq = 0;
		} else {
			maxDist = +(maxDist || 100.0);
			this.maxMoveSq = maxDist * maxDist;
		}
	},
	
	applyTear: function(x, y, influence) {
		this.tearInfluenceSq = influence * influence;
		this.tear.position.x = x;
		this.tear.position.y = y;
	}, 

	step: function(delta) {
		var p;
		
		//given the degree of accuracy, we'll solve our constraints here...
		var i = this.accuracy;
		while (i--) {
			for (var j=0; j<this.points.length; j++) {
				this.points[j].solveConstraints(this);
			}
		}
		
//            var j;
//            for (i=0; i<this.influences.length; i++) {
//                var inf = this.influences[i];    
//                
//                if (inf.distance==0)
//                    continue;
//                
//                //apply interaction to all points
//                for (j=0; j<this.points.length; j++) {
//                    p = this.points[j];
//                    
//                    var distSq = inf.position.distanceSq(p.position);
//                    
//                    if (distSq < inf.distance) {
//                        //the influence is a tearing influence...
//                        if (inf.tears) {
//                            p.constraints = [];
//                        } 
//                        //the influence is a movement influence
//                        if (inf.moves) {
//                            var np = inf.position;
//                            var op = inf.lastPosition;
//                            
//                            var mAmtX = (np.x - op.x);
//                            var mAmtY = (np.y - op.y);
//                            
//                            
//                        }
//                    }
//                }
//            }
		
		//clear all influences
		this.influences.splice(0, this.influences.length);
		
		if (this.moveInfluenceSq!==0 || this.tearInfluenceSq!==0) {
			//interactions
			for (var i=0; i<this.points.length; i++) {
				p = this.points[i];
				var movePos = this.move.position;
				var tearPos = this.tear.position;
				var otherPos = p.position;

				var moveDistSq = distSq(movePos.x, movePos.y, otherPos.x, otherPos.y);
				var tearDistSq = distSq(tearPos.x, tearPos.y, otherPos.x, otherPos.y);
				
				if (this.moveInfluenceSq!==0 && moveDistSq < this.moveInfluenceSq) {
					//new and old positions
					var np = this.move.position;
					var op = this.move.lastPosition;
					
					var mAmtX = (np.x - op.x);
					var mAmtY = (np.y - op.y);
					
					var max = 0;
					var lenSq = mAmtX*mAmtX + mAmtY*mAmtY;
					
					if (this.maxMoveSq === 0 || lenSq < this.maxMoveSq) {
						mAmtX *= this.moveScalar;
						mAmtY *= this.moveScalar;
						
						p.lastPosition.x = p.position.x - mAmtX;
						p.lastPosition.y = p.position.y - mAmtY;
						
						if (p.isWeakPin) {
							p.unpin();
						}
					}
				} else if (this._pinRemoveInfluenceSq!==0 && moveDistSq < this._pinRemoveInfluenceSq) {
					if (p.isWeakPin)
						p.unpin();
				}
				if (this.tearInfluenceSq!==0 && tearDistSq < this.tearInfluenceSq) {
					p.constraints = [];
				}
			}
		}
		
		//now update with verlet integration
		for (var i=0; i<this.points.length; i++) {
			p = this.points[i];
			
			//add world gravity
			p.addForce(this.gravity);
			
			//difference in positions
			var vx = p.position.x - p.lastPosition.x;
			var vy = p.position.y - p.lastPosition.y;
			
			//dampen velocity
			vx *= this.friction;
			vy *= this.friction;
			
			//len2
			var len2 = vx * vx + vy * vy;
			
			if (this.floor!==null && p.position.y >= this.floor && len2 > 0.000001) {
				var m = Math.sqrt(len2);
				if (m!=0) {
					vx /= m;
					vy /= m;
				}
				vx *= m*this.groundFriction;
				vy *= m*this.groundFriction;
			}
			
			var tSqr = delta * delta;
			
			//verlet integration
			var nx = p.position.x + vx + 0.5 * p.acceleration.x * tSqr;
			var ny = p.position.y + vy + 0.5 * p.acceleration.y * tSqr;
			
			//set last position & new position
			p.lastPosition.x = p.position.x;
			p.lastPosition.y = p.position.y;
			p.position.x = nx;
			p.position.y = ny;
			
			//reset acceleration
			p.acceleration.x = 0;
			p.acceleration.y = 0;
		}
		
		for (var i=0; i<this.points.length; i++) {
			var p = this.points[i];
			if (p.pinned && p.pinPosition !== null) {
				p.position.x = p.pinPosition.x;
				p.position.y = p.pinPosition.y;
			}   
		}
		
		this.move.lastPosition.x = this.move.position.x;
		this.move.lastPosition.y = this.move.position.y;
		
		this.tear.lastPosition.x = this.tear.position.x;
		this.tear.lastPosition.y = this.tear.position.y;
		
		this.moveInfluenceSq = this.tearInfluenceSq = 0;
	}
});

module.exports = World;