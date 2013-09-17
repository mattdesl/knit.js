var Knit = (function() {
    "use strict";
    
    var Knit = Knit || {};
    
    Knit.Vec3 = function (x, y, z) {
        this.x = x || 0;
        this.y = y || 0;
        this.z = z || 0;
    };
    
    Knit.Vec3.prototype = {
        constructor: Knit.Vec3,
        
        distanceSq: function(vec) {
            var dx = vec.x - this.x;
            var dy = vec.y - this.y;
            var dz = vec.z - this.z;
            return dx * dx + dy * dy + dz * dz;
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
        this.restingDistance = restingDistance;
        this.stiffness = stiffness;
        this.tearDistance = tearDistance;
    };
    
    Knit.Constraint.prototype = {
        constructor: Knit.Constraint,
         
        solve: function() {
            //distance formula
            var dx = this.p1.position.x - this.p2.position.x;
            var dy = this.p1.position.y - this.p2.position.y;
            var dz = this.p1.position.z - this.p2.position.z;
            var d = Math.sqrt(dx * dx + dy * dy + dz * dz);
            
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
            this.p1.position.z += dz * scalarP1 * restingRatio;
            
            this.p2.position.x -= dx * scalarP2 * restingRatio;
            this.p2.position.y -= dy * scalarP2 * restingRatio;
            this.p2.position.z -= dz * scalarP2 * restingRatio;
        }
    };
    
    Knit.PointMass = function (x, y, z, mass) {
        this.position = new Knit.Vec3(x, y, z);
        this.lastPosition = new Knit.Vec3(x, y, z);
        this.acceleration = new Knit.Vec3(0.0, 0.0, 0.0);
        
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
            this.acceleration.z += vec.z / this.mass;
        },
        
        attach: function(point, restingDistance, stiffness, tearDistance) {
            var c = new Knit.Constraint(this, point, restingDistance, stiffness, tearDistance);
            this.addConstraint(c);
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
        
        pin: function(x, y, z, weak) {
            if (this.pinPosition === null)
                this.pinPosition = new Knit.Vec3();
            this.pinPosition.x = x;
            this.pinPosition.y = y;
            this.pinPosition.z = z;
            this.pinned = true;
            this.isWeakPin = !!weak;
        },
        
        unpin: function() {
            this.pinned = false;   
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
            if (this.pinned && this.pinPosition !== null) {
                this.position.x = this.pinPosition.x;
                this.position.y = this.pinPosition.y;
                this.position.z = this.pinPosition.z;
            }
        }
    };
    
    Knit.World = function(gravity) {
        this.gravity = gravity || new Knit.Vec3(0, 1200, 0);
        this.friction = 0.99;
        this.bounds = null;
        this.accuracy = 5;
        this.points = [];
        
        this.move = new Knit.PointMass(0, 0, 0);
        this.tear = new Knit.PointMass(0, 0, 0);
        this.tearInfluenceSq = 0;
        this.moveInfluenceSq = 0;
        
        this.influences = [];
        this._pinRemoveInfluenceSq = 0;
        this.moveScalar = 1.8;
        this.maxMoveSq = 0.0;
        
        this.groundFriction = 1.0;
        this.floor = null;
        this.bounds = null;
    };
    
    Knit.World.prototype = {
        constructor: Knit.World,
        
        setPinRemoveInfluence: function(influence) {
            this._pinRemoveInfluenceSq = influence * influence;
        },
        
        applyMotion: function(x, y, z, influence, scalar, maxDist) {
            this.moveInfluenceSq = influence * influence;
            this.moveScalar = scalar || 1.8;
            this.move.position.x = x;
            this.move.position.y = y;
            this.move.position.z = z;
            
            if (maxDist === 0) {
                this.maxMoveSq = 0;
            } else {
                maxDist = +(maxDist || 100.0);
                this.maxMoveSq = maxDist * maxDist;
            }
        },
        
        applyTear: function(x, y, z, influence) {
            this.tearInfluenceSq = influence * influence;
            this.tear.position.x = x;
            this.tear.position.y = y;
            this.tear.position.z = z;
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
                        var mAmtZ = (np.z - op.z);
                        
                        var max = 0;
                        var lenSq = mAmtX*mAmtX + mAmtY*mAmtY;
                        
                        if (this.maxMoveSq === 0 || lenSq < this.maxMoveSq) {
                            mAmtX *= this.moveScalar;
                            mAmtY *= this.moveScalar;
                            
                            p.lastPosition.x = p.position.x - mAmtX;
                            p.lastPosition.y = p.position.y - mAmtY;
                            p.lastPosition.z = p.position.z - mAmtZ;
                            
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
                var vz = p.position.z - p.lastPosition.z;
                
                //dampen velocity
                vx *= this.friction;
                vy *= this.friction;
                vz *= this.friction;
                
                //len2
                var len2 = vx * vx + vy * vy + vz * vz;
                
                if (this.floor!==null && p.position.y >= this.floor && len2 > 0.000001) {
                    var m = Math.sqrt(len2);
                    if (m!=0) {
                        vx /= m;
                        vy /= m;
                        vz /= m;
                    }
                    vx *= m*this.groundFriction;
                    vy *= m*this.groundFriction;
                    vz *= m*this.groundFriction;
                }
                
                var tSqr = delta * delta;
                
                //verlet integration
                var nx = p.position.x + vx + 0.5 * p.acceleration.x * tSqr;
                var ny = p.position.y + vy + 0.5 * p.acceleration.y * tSqr;
                var nz = p.position.z + vz + 0.5 * p.acceleration.z * tSqr;
                
                //set last position & new position
                p.lastPosition.x = p.position.x;
                p.lastPosition.y = p.position.y;
                p.lastPosition.z = p.position.z;
                p.position.x = nx;
                p.position.y = ny;
                p.position.z = nz;
                
                //reset acceleration
                p.acceleration.x = 0;
                p.acceleration.y = 0;
                p.acceleration.z = 0;
            }
            
            
            this.move.lastPosition.x = this.move.position.x;
            this.move.lastPosition.y = this.move.position.y;
            this.move.lastPosition.z = this.move.position.z;
            
            this.tear.lastPosition.x = this.tear.position.x;
            this.tear.lastPosition.y = this.tear.position.y;
            this.tear.lastPosition.z = this.tear.position.z;
            
            this.moveInfluenceSq = this.tearInfluenceSq = 0;
        },
    };
    return Knit;
})();