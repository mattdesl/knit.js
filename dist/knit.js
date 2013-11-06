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

/** Extends Knit to add cloth and string fabrics. */
(function() {
    "use strict";
    
    Knit.Path = function(paramsDict) {
        
        this.mass = 0.0;
        this.stiffness = 1.0;
        this.points = [];
        this.tearDistance = 0;
        this.steps = 1;
        
        // If step is not provided to a XCurveTo function, 
        // then it will be approximated with a very simple distance check
        this.approximateCurves = true;
        this.approximationFactor = 0.05;
        
        this._move = new Knit.Vec2();
        this._start = new Knit.Vec2();
        this._newPath = true;
        this._toPin = false;
        this._toPinWeak = false;
        this._hasMoved = false;
        
        // allows user to specify particular params in constructor
        if (paramsDict && typeof paramsDict === "object") {
            for (var k in paramsDict) {
                if (k in this) {
                    this[k] = paramsDict[k];
                }
            }
        }
    };
    
    Knit.Path.prototype = {
        constructor: Knit.Path,
        
        reset: function() {
            this.points = [];
            this._newPath = true;
            this._hasMoved = false;
            this._move.x = this._move.y = 0;
            this._start.x = this._start.y = 0;
            this._toPin = false;
            this._toPinWeak = false;
        },
        
        /** Flags the next added point to be pinned. Returns this path for chaining. */
        pinNext: function(weak) {
            this._toPin = true;  
            this._toPinWeak = weak;
        },
        
        /** Pins the last added point. If no points exist, this function does nothing. Returns this path for chaining. */
        pinLast: function(weak) {
            if (this.points.length==0)
                return;
            var p = this.points[this.points.length-1];
            p.pin(p.position.x, p.position.y, weak);
        },
        
        moveTo: function(x, y) {
            this._newPath = true;
            this._move.x = x;
            this._move.y = y;
            this._start.x = x;
            this._start.y = y;
            this._hasMoved = true;
        },
        
        /** Returns the last point in this path, or null if the path is empty. */
        lastPoint: function() {
            return this.points.length!==0 ? this.points[this.points.length-1] : null;
        },
        
        /** Returns the first point in this path, or null if the path is empty. */
        firstPoint: function() {
            return this.points.length!==0 ? this.points[0] : null;
        },
        
        /** Closes the path by performing a lineTo with the first 'starting' point. 
            If the path is empty, this does nothing. */
        close: function(steps) {
            if (this.points.length===0)
                return;
            this.lineTo(this._start.x, this._start.y, steps);
        },
        
        __newPoint: function(nx, ny) {
            var p = new Knit.PointMass(nx, ny, this.mass);
            
            //attach to previous point if we are continuing a path
            if (!this._newPath && this.points.length > 0)
                p.attach(this.points[this.points.length - 1], null, this.stiffness, this.tearDistance);
            
            //if we need to pin...
            if (this._toPin) {
                p.pin(nx, ny, this._toPinWeak);
                this._toPin = false;
                this._toPinWeak = false;
            }
            
            this.points.push(p);
            this._newPath = false;
        },
        
        lineTo: function(x, y, steps) {
            //if we are calling lineTo before any moveTo.. make this the first point
            if (!this._hasMoved) {
                this.moveTo(x, y);
                return;
            }
            steps = Math.max(1, steps || this.steps);
            for (var i=0; i<=steps; i++) { 
                if (!this._newPath && i==0)
                    continue;
                
                var t = i/steps;   
                var nx = Knit.lerp(this._move.x, x, t);
                var ny = Knit.lerp(this._move.y, y, t);
                 
                this.__newPoint(nx, ny);
            }
            this._move.x = x;
            this._move.y = y; 
        },
        
        /** Creates a bezier (cubic) curve to the specified point, with the given control points.
        If steps is not specified or is a falsy value, this function will use the default value
        set for this Path object. It will be capped to a minimum of 3 steps. 
        */
        bezierCurveTo: function(x2, y2, x3, y3, x4, y4, steps) {
            //if we are calling lineTo before any moveTo.. make this the first point
            if (!this._hasMoved) {
                this.moveTo(x, y);
                return;
            }
            
            var x1 = this._move.x;
            var y1 = this._move.y;
            
            //try to approximate with a simple distance sum.
            //more accurate would be to use this:
            //http://antigrain.com/research/adaptive_bezier/
            if (!steps) {
                if (this.approximateCurves) {
                    var d1 = Knit.distanceTo(x1, y1, x2, y2);
                    var d2 = Knit.distanceTo(x2, y2, x3, y3);
                    var d3 = Knit.distanceTo(x3, y3, x4, y4);
                    steps = ~~((d1 + d2 + d3) * this.approximationFactor);
                } else {
                    steps = Math.max(1, this.steps);
                }
            } 
            
            for (var i=0; i<steps; i++) {
                var t = i / (steps-1);
                var dt = (1 - t);
                
                var dt2 = dt * dt;
                var dt3 = dt2 * dt;
                var t2 = t * t;
                var t3 = t2 * t;
                
                var x = dt3 * x1 + 3 * dt2 * t * x2 + 3 * dt * t2 * x3 + t3 * x4;
                var y = dt3 * y1 + 3 * dt2 * t * y2 + 3 * dt * t2 * y3 + t3 * y4;
                
                this.__newPoint(x, y);
            }
            
            this._move.x = x3;
            this._move.y = y3;
        },
        
        /** Creates a quadratic curve to the specified point, with the given control points.
        If steps is not specified or is a falsy value, this function will use the default value
        set for this Path object. It will be capped to a minimum of 3 steps. 
        */
        quadraticCurveTo: function(x2, y2, x3, y3, steps) {
            //if we are calling lineTo before any moveTo.. make this the first point
            if (!this._hasMoved) {
                this.moveTo(x, y);
                return;
            } 
            
            var x1 = this._move.x;
            var y1 = this._move.y;
            
            //try to approximate with a simple distance sum.
            //more accurate would be to use this:
            //http://antigrain.com/research/adaptive_bezier/
            if (!steps) {
                if (this.approximateCurves) {
                    var d1 = Knit.distanceTo(x1, y1, x2, y2);
                    var d2 = Knit.distanceTo(x2, y2, x3, y3);
                    steps = ~~((d1 + d2) * this.approximationFactor);
                } else {
                    steps = Math.max(1, this.steps);
                }
            } 
            
            for (var i=0; i<steps; i++) {
                var t = i / (steps-1);
                var dt = (1 - t);
                var dtSq = dt * dt;
                var tSq = t * t;
                
                var x = dtSq * x1 + 2 * dt * t * x2 + tSq * x3;
                var y = dtSq * y1 + 2 * dt * t * y2 + tSq * y3;
                
                this.__newPoint(x, y);
            }
            
            this._move.x = x3;
            this._move.y = y3;
        }
    };
    
    /** Twine is a simple string from one point to another, with a variable number of steps between. */
    Knit.Twine = function(paramsDict) {
        this.start = new Knit.Vec2();
        this.end = new Knit.Vec2();
        this.steps = 5;
        this.mass = 0.0;
        this.stiffness = 1.0;
        this.points = [];
        this.pinStart = true;
        this.pinEnd = false;
        this.weakPins = false;
        this.tearDistance = 0;
        
        // allows user to specify particular params in constructor
        if (paramsDict && typeof paramsDict === "object") {
            for (var k in paramsDict) {
                if (k in this) {
                    this[k] = paramsDict[k];
                }
            }
        }
        
        this.create();
    };
    
    Knit.Twine.prototype = {
        constructor: Knit.Twine,
        
        /** Constructs the fabric from the current parameters. */
        create: function() {
            this.points = [];
            
            var i=0;
            for (i=0; i<this.steps; i++) {
                var t = (i/this.steps);
                var nx = Knit.lerp(this.start.x, this.end.x, t);   
                var ny = Knit.lerp(this.start.y, this.end.y, t);
                
                var p = new Knit.PointMass(nx, ny, this.mass);
                
                if ((i===0 && this.pinStart) || (i===this.steps-1 && this.pinEnd)) {
                    p.pin(nx, ny, this.weakPins);
                }
                
                if (i!==0) {
                    p.attach(this.points[i-1], null, this.stiffness, this.tearDistance);
                }
                
                this.points.push(p);
            }
        }
    }; 
})(); 

//var strFabric = new Knit.Twine();
//console.log(strFabric);

var TypeUtil = (function() {
    
    var TypeUtil = TypeUtil || {};
    
    var moveX=0, moveY=0;
    var style = {
            fontSize: 12,
            fontStretchPercent: 1.0,
            letterSpacing: 0
        };
    
    function moveTo(x, y, points, scl, off) {
        moveX = x;
        moveY = y;
        if (points)
            points.push(new Knit.Vec2(x * scl.x + off.x, y * scl.y + off.y));
    }
    
    function lineTo(x2, y2, steps, points, scl, off) {
        var x1 = moveX;
        var y1 = moveY;
        for (var i=0; i<steps; i++) {
            var t = i / (steps-1);
            
            var x = Knit.lerp(x1, x2, t);
            var y = Knit.lerp(y1, y2, t);
            
//            context.fillRect(x-pointSize/2, y-pointSize/2, pointSize, pointSize);
            points.push(new Knit.Vec2(x * scl.x + off.x, y * scl.y + off.y));
        }
        moveX = x2;
        moveY = y2;
    }
    
    function cubicCurve(x2, y2, x3, y3, x4, y4, steps, points, scl, off) {
        var x1 = moveX;
        var y1 = moveY;
         
        for (var i=0; i<steps; i++) {
            var t = i / (steps-1);
            var dt = (1 - t);
            
            var dt2 = dt * dt;
            var dt3 = dt2 * dt;
            var t2 = t * t;
            var t3 = t2 * t;
            
            var x = dt3 * x1 + 3 * dt2 * t * x2 + 3 * dt * t2 * x3 + t3 * x4;
            var y = dt3 * y1 + 3 * dt2 * t * y2 + 3 * dt * t2 * y3 + t3 * y4;
            
//            console.log(x+" "+y);
//            context.fillRect(x-pointSize/2, y-pointSize/2, pointSize, pointSize);
            points.push(new Knit.Vec2(x * scl.x + off.x, y * scl.y + off.y));
        }
        moveX = x3;
        moveY = y3;
    }
    
    //cp1x, cp1y, cp2x, cp2y, x, y
    function quadCurve(x2, y2, x3, y3, steps, points, scl, off) {
        var x1 = moveX;
        var y1 = moveY;
         
        for (var i=0; i<steps; i++) {
            var t = i / (steps-1);
            var dt = (1 - t);
            var dtSq = dt * dt;
            var tSq = t * t;
            
            var x = dtSq * x1 + 2 * dt * t * x2 + tSq * x3;
            var y = dtSq * y1 + 2 * dt * t * y2 + tSq * y3;
            
            //p0 - moveX, moveY
            //p1 - px, py
            //p2 - x, y
            
//            context.fillRect(x-pointSize/2, y-pointSize/2, pointSize, pointSize);
            points.push(new Knit.Vec2(x * scl.x + off.x, y * scl.y + off.y));
        }
        moveX = x3;
        moveY = y3;
    }
    
    
    TypeUtil.getFaces = function() {
        return _typeface_js.faces;  
    };
    
    TypeUtil.getFace = function(family, weight, style) {
        weight = weight || "normal";
        style = style || "normal";
        family = family.toLowerCase();
        
        var face = null;
        if (_typeface_js && _typeface_js.faces) {
            if (!(family in _typeface_js.faces)) {
                console.log("No font with the name "+family);
                return;
            }
            
            var fonts = _typeface_js.faces[family];
            
            if (!(weight in fonts)) {
                console.log("No weight with the value "+weight);
                return;
            }
                
            var weightDict = fonts[weight];
            
            if (!(style in weightDict)) {
                console.log("No style with the type "+style);
                return;
            }
            
            face = weightDict[style];
        }
        return face;  
    };
    
    TypeUtil.getFaceHeight = function(face, size) {
        style.fontSize = size; 
        return Math.round(_typeface_js.pixelsFromPoints(face, style, face.lineHeight));
    }
    
    TypeUtil.getPointScale = function(face, size) {
        style.fontSize = size; 
        return _typeface_js.pixelsFromPoints(face, style, 1);
    };
    
    TypeUtil.getPointLists = function(face, size, char, steps) {
        steps = steps || 10;
        style.fontSize = size;
        
        var glyph = face.glyphs[char];
        if (!glyph || !glyph.o)
            return null;
        
        moveTo(0, 0);
        var shapes = [];
        var points = [];
        
        var pointScale = _typeface_js.pixelsFromPoints(face, style, 1);
        var scl = new Knit.Vec2(pointScale * style.fontStretchPercent, -pointScale);
        var off = new Knit.Vec2(0, face.ascender*pointScale);
        
        var outline = glyph.o.split(' ');
        var outlineLength = outline.length;
        for (var i = 0; i < outlineLength; ) {
            var action = outline[i++];

            switch(action) {
                case 'm':
                    if (i!==1) {
                        shapes.push(points);
                        points = [];
                    }
                    moveTo(outline[i++], outline[i++], points, scl, off);
                    break;
                case 'l':
                    lineTo(outline[i++], outline[i++], steps, points, scl, off);
                    break;
                case 'q':
                    var cpx = outline[i++];
                    var cpy = outline[i++];
                    quadCurve(outline[i++], outline[i++], cpx, cpy, steps, points, scl, off);
                    break;
                case 'b':
                    var x = outline[i++];
                    var y = outline[i++];
                    cubicCurve(outline[i++], outline[i++], outline[i++], outline[i++], x, y, steps, points, scl, off);
                    break;
            } 
        }
        shapes.push(points);
        return shapes;
    }
    
    return TypeUtil;
})();

var CanvasUtil = (function($) {
    
    var CanvasUtil = CanvasUtil || {};
    
    var mousePin = null;
    var mousePinDrag = false;
    
    CanvasUtil.pinDragEnabled = true;
    CanvasUtil.pinRadius = 10;
    
//    var randColors = [];
//    for (var i=0; i<100; i++) {
//        randColors.push( "rgba("+ ~~(Math.random()*255) +", " + ~~(Math.random()*255) +", "+ ~~(Math.random()*255) +", 1.0)" );
//    }
    
    var circle = function(context, x, y, radius) {
        context.beginPath();
        context.arc(x, y, radius, 0, 2 * Math.PI, false);
        context.stroke();
    };
    
    CanvasUtil.nearestPin = function(world, testx, testy) {
        var radius = CanvasUtil.pinRadius;
        var maxRadiusSq = radius*radius;
        var points = world.points;
        var i = points.length;
        
        var nearestDistSq = Number.MAX_VALUE;
        var nearestPoint = null;
        while (i--) {
            if (points[i].pinned && points[i].pinPosition) {
                var dx = testx - points[i].pinPosition.x;
                var dy = testy - points[i].pinPosition.y;
                var len2 = (dx * dx + dy * dy);
                
                if (len2 < maxRadiusSq && len2 < nearestDistSq) {
                    nearestPoint = points[i];
                    nearestDistSq = len2;
                }
            }
        }
        return nearestPoint;
    };
    
    //requires pin drag to be enabled
    CanvasUtil.isMouseOverPin = function() {
        return mousePin !== null;
    };
    
    CanvasUtil.addPinInteraction = function(canvas, world) {
        var radius = CanvasUtil.pinRadius;
        
        canvas.mousemove(function(ev) {
            var x = ev.pageX;
            var y = ev.pageY;
            
            if (!mousePin && mousePinDrag)
                mousePinDrag = false;
            
            if (mousePin && mousePinDrag && CanvasUtil.pinDragEnabled) {
                mousePin.pinPosition.x = x;
                mousePin.pinPosition.y = y;
            } else {
                mousePin = CanvasUtil.nearestPin(world, x, y, radius);
            }
        });
        canvas.mousedown(function(ev) {
            mousePinDrag = true; 
        });
        canvas.mouseup(function(ev) {
            mousePinDrag = false; 
        });
    };
    
    CanvasUtil.drawPins = function(world, context, radius, strokeStyle, mouseStrokeStyle) {
        var points = world.points;
        var i = points.length;
        if (i==0)
            return;
        var radius = CanvasUtil.pinRadius;
        if (!strokeStyle) {
            strokeStyle = context.strokeStyle;
            mouseStrokeStyle = "green";
        }
            
            
        while (i-- > 0) {
            var p = points[i];    
            if (p.pinned && p.pinPosition) {
                var x = p.pinPosition.x;
                var y = p.pinPosition.y;
                
                context.strokeStyle = p===mousePin ? mouseStrokeStyle : strokeStyle;
                circle(context, x, y, radius);
            }
        }
    };
    
    CanvasUtil.drawPoints = function(world, context) {
        var points = world.points;
        var i = points.length;
        if (i==0)
            return;
        context.beginPath();
        while (i-- > 0) {
            var p = points[i];    
             
            for (var j=0; j<p.constraints.length; j++) {
                var c = p.constraints[j];
                if (!c.p1 || !c.p2)
                    continue;
                 
                context.moveTo(c.p1.position.x, c.p1.position.y);
                context.lineTo(c.p2.position.x, c.p2.position.y);
            } 
        }
//        context.closePath();
        context.stroke();
    };
    
    /** Creates a 2D canvas and returns the jQuery object. */
    CanvasUtil.createCanvas = function(width, height, id) {
        id = id || "canvas";
        var canvas = $("<canvas/>", {
            id: id,
        });
        canvas[0].width = width;
        canvas[0].height = height;
        
        return canvas;
    } 
     
    return CanvasUtil;
})(jQuery);

/** Extends Knit to add a spider web fabric. */
(function() {
    "use strict";
    
    /** 
      Takes an array length and offset index, and returns N non-repeating
      indices between those values, shuffled. N is a random value between
      Math.floor(arrayLen * percentLow) and Math.floor(arrayLen * percentHigh).
    */
    function randomIndices(arrayLen, off, percentLow, percentHigh) {
        var num = ~~(arrayLen * Knit.rnd(percentLow, percentHigh));
        var idx = [];
        for (var i=off; i<arrayLen; i++) {
            idx.push(i);
        }
        idx = Knit.shuffle(idx);
        return idx.splice(0, num);
    }
    
    Knit.Web = function(paramsDict) {
        this.spirals = 10;
        this.spokes = 10;
        this.radius = 100;
        this.hubRadius = 20;
        this.cx = 0;
        this.cy = 0;
        this.centerMass = 1;
        this.webMass = 10;
        
        this.tensor = 0.5;
        this.stiffness = 0.15;
        this.tearDistance = 100;
        
        this.missChanceLow = 0.20;
        this.missChanceHigh = 0.25;
        
        this.cutChanceLow = 0.01;
        this.cutChanceHigh = 0.2;
        this.cutTensor = 0.75;
        
        // a list of point masses for this fabric
        this.points = [];
         
        // allows user to specify particular params in constructor
        if (paramsDict && typeof paramsDict === "object") {
            for (var k in paramsDict) {
                if (k in this) {
                    this[k] = paramsDict[k];
                }
            }
        }
        
        this.create();
    };
    
    Knit.Web.prototype = {
        consructor: Knit.Web,
        
        create: function() {
            this.points = [];
            
            var step = 360 / this.spokes;
            var rawPoints = [];
            
            var i = 0;
            
            // push center point
            rawPoints.push( new Knit.Vec2(this.cx, this.cy) );
            
            // create spiral pattern
            for (i=0; i<360 * this.spirals + step; i+=step) {
                var jitterAngle = 0;
                var angle = i + jitterAngle;
                
                var dx = Math.cos(angle * (Math.PI / 180));
                var dy = Math.sin(angle * (Math.PI / 180));
                
                var hubX = dx * this.hubRadius + this.cx;
                var hubY = dy * this.hubRadius + this.cy;
                
                var jitterRadius = this.radius;
                
                var spiralRadius = (i/360) * (this.radius-this.hubRadius) / this.spirals;
                spiralRadius *= (i / (360 * this.spirals + step));
                
                var spiralX = dx * (spiralRadius) + hubX;
                var spiralY = dy * (spiralRadius) + hubY;
                
                rawPoints.push( new Knit.Vec2(spiralX, spiralY) );
            }
           
            var pointMassLen = 0;
            var pointLen = rawPoints.length; //number of total spiral points
            var p = null;
            for (i=0; i<pointLen; i++) {
                pointMassLen = this.points.length; //number of current point masses
                var curr = rawPoints[i];
                var mass = i==0 ? this.centerMass : this.webMass;
                p = new Knit.PointMass(curr.x, curr.y, mass);
                 
                //before point
                //skip first since it will be the center
                if (i>1 && i<pointLen-1 - this.spokes) {
                    var other = this.points[i-1];
                    p.attach( other, null, this.stiffness, this.tearDistance );   
                }
                
                if (i < this.spokes && i>0 && (i%2==0 || Math.random() < 0.5)) { 
                    p.attach( this.points[0], null, this.stiffness, this.tearDistance);
                }
                
                var before = (pointMassLen-1 - this.spokes+1);
                if (before > 0 && before < pointMassLen-1) {

                    var cnstr = p.attach( this.points[before], null, this.stiffness, this.tearDistance );
                    cnstr.restingDistance *= this.tensor; 
                }
                this.points.push(p);
            }
            
            //update with new point mass length
            pointMassLen = this.points.length;
            
            for (i=0; i<this.points.length; i++) {
                p = this.points[i];
                
                if ((i > pointMassLen - 1 - this.spokes))
                    p.pin(p.position.x, p.position.y, false);
                
                if (i==1) {
                    p.attach(this.points[i+this.spokes - 1], null, this.stiffness, this.tearDistance);   
                }
//                var after = (i + this.spokes);
//                if (after < this.points.length-1) {
//    //                p.attach( world.points[after], spacing, stiff, tear );
//                }
            }
            
            //make some irregularities for N% of the web
            //but don't affect first or last spiral
            var j;
            var randStickies = randomIndices(pointMassLen-1-this.spokes, 
                                             this.spokes, this.missChanceLow, 
                                             this.missChanceHigh);
            for (i=0; i<randStickies.length; i++) {
                j = randStickies[i];
                
                if (j%2!==0)
                    continue;
                
                var offRnd = Math.random() ? -1 : 1;
                var spanRnd = Math.random() > 0.5 ? 1 : -1;
                var otherIdx = j + (spanRnd * this.spokes) + offRnd;
                if (otherIdx >= 0 && otherIdx < this.points.length-1)
                    this.points[j].attach( this.points[otherIdx], null, this.stiffness, this.tearDistance );
            } 
            
            var randCuts = randomIndices(pointMassLen-1-this.spokes, 
                                         this.spokes, 
                                         this.cutChanceLow, this.cutChanceHigh); 
            
            for (i=0; i<randCuts.length; i++) {
                j = randCuts[i];
                p = this.points[j];
                p.constraints.splice(0, 1);
                for (var k=0; k<p.constraints.length; k++) {
                    p.constraints[k].restingDistance *= this.cutTensor;   
                }
            }
            
            //randomize edges
            for (i=this.spokes; i<this.points.length; i++) {
                //tear some randomly?
    //             if (i < world.points.length-1-this.spokes && Math.random() < 0.05)
    //                world.points[i].constraints = [];
                
                if (i == this.points.length- ~~(this.spokes/2) || i == this.points.length-1) {
    //                world.points[i].unpin();
                } 
            }
        }
    };
})();