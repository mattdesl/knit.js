var Knit = (function() {
    "use strict";
    
    var Knit = Knit || {};
    
    Knit.Vec2 = function (x, y) {
        this.x = x || 0;
        this.y = y || 0;
    };
    
    Knit.Vec2.prototype = {
        constructor: Knit.Vec2,
        
        distanceSq: function(vec) {
            var dx = vec.x - this.x;
            var dy = vec.y - this.y;
            return dx * dx + dy * dy;
        },
        
        distance: function(vec) {
            return Math.sqrt(this.distanceSq(vec));   
        }
    };
    
    Knit.Rect = function (x, y, width, height) {
        this.x = x || 0;
        this.y = y || 0;
        this.width = width || 0;
        this.height = height || 0;
    };
    
    Knit.Rect.prototype.constructor = Knit.Rect;
    
    Knit.Constraint = function (p1, p2, restingDistance, stiffness, tearDistance) {
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
    };
    
    Knit.Constraint.prototype = {
        constructor: Knit.Constraint,
         
        solve: function() {
            //distance formula
            var dx = this.p1.position.x - this.p2.position.x;
            var dy = this.p1.position.y - this.p2.position.y;
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
            this.p1.position.x += dx * scalarP1 * restingRatio;
            this.p1.position.y += dy * scalarP1 * restingRatio;
            
            this.p2.position.x -= dx * scalarP2 * restingRatio;
            this.p2.position.y -= dy * scalarP2 * restingRatio;
        }
    };
    
    Knit.PointMass = function (x, y, mass) {
        this.position = new Knit.Vec2(x, y);
        this.lastPosition = new Knit.Vec2(x, y);
        this.acceleration = new Knit.Vec2(0.0, 0.0);
        
        this.pinPosition = null;
        this.pinned = false;
        this.isWeakPin = false;
        this.mass = mass || 1.0;
        
        this.constraints = [];
    };
    
    Knit.PointMass.prototype = {
        constructor: Knit.PointMass,
        
        addForce: function(vec) {
            // acceleration = force / mass
            this.acceleration.x += vec.x / this.mass;
            this.acceleration.y += vec.y / this.mass;
        },
        
        attach: function(point, restingDistance, stiffness, tearDistance) {
            var c = new Knit.Constraint(this, point, restingDistance, stiffness, tearDistance);
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
                this.pinPosition = new Knit.Vec2();
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
    };
    
    //Influence, inherits from PointMass
    Knit.Influence = function(x, y, distance, scalar, maxDist) {
        this.position = new Knit.Vec2(x, y);
        this.lastPosition = new Knit.Vec2();
        this.distance = distance || 0;
        this.scalar = scalar || 1.0;
        this.maxDist = maxDist || 0;
        this.tears = false;
        this.moves = true;
    };
    
    Knit.Influence.prototype = new Knit.PointMass();
    
    //TearInfluence, inherits from PointMass
    Knit.TearInfluence = function(x, y, distance) {
        this.position = new Knit.Vec2(x, y);
        this.distance = distance;
        this.tears = true;
    };
    
    Knit.TearInfluence.prototype = new Knit.Influence();
    
    Knit.World = function(gravity) {
        this.gravity = gravity || new Knit.Vec2(0, 1200);
        this.friction = 0.99;
        this.bounds = null;
        this.accuracy = 2;
        this.points = [];
        
        this.move = new Knit.PointMass(0, 0);
        this.tear = new Knit.PointMass(0, 0);
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
    };
    
    Knit.World.prototype = {
        constructor: Knit.World,
        
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
                    this.points[j].solveConstraints(world);
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
                    var moveDistSq = this.move.position.distanceSq(p.position);
                    var tearDistSq = this.tear.position.distanceSq(p.position);
                    
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
                p.addForce(world.gravity);
                
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
        },
    };
    
    /** Utility function to return a random number between two values. */
    Knit.rnd = function(start, end) {
        return start + Math.random() * (end - start);   
    };
    
    /** Utility function for linear interpolation. */
    Knit.lerp = function(v0, v1, t) {
        return v0*(1-t)+v1*t;
    };
    
    /** Utility function for Hermite interpolation. */
    Knit.smoothstep = function(v0, v1, t) {
        // Scale, bias and saturate x to 0..1 range
        t = Math.max(0.0, Math.min(1.0, (t - v0)/(v1 - v0) ));
        // Evaluate polynomial
        return t*t*(3 - 2*t);
    };
    
    /** Utility function to shuffle an array (Fisher-Yates). */
    Knit.shuffle = function(array) {
        var counter = array.length, temp, index;
    
        // While there are elements in the array
        while (counter--) {
            // Pick a random index
            index = (Math.random() * counter) | 0;
    
            // And swap the last element with it
            temp = array[counter];
            array[counter] = array[index];
            array[index] = temp;
        }
    
        return array;
    };
    
    /** Utility method for a simple distance check. */
    Knit.distanceTo = function(x1, y1, x2, y2) {
        var dx = x2 - x1;
        var dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    };
    
    return Knit;
})();