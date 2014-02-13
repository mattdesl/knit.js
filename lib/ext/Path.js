var Class = require('klasse');
var Vector2 = require('vecmath').Vector2;
var lerp = require('minimath').lerp;

var PointMass = require('../PointMass');

var Path = new Class({

    initialize: function(paramsDict) {
        
        this.mass = 0.0;
        this.stiffness = 1.0;
        this.points = [];
        this.tearDistance = 0;
        this.steps = 1;
        
        // If step is not provided to a XCurveTo function, 
        // then it will be approximated with a very simple distance check
        this.approximateCurves = true;
        this.approximationFactor = 0.05;
        
        this._move = new Vector2();
        this._start = new Vector2();
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
    },
    
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
        var p = new PointMass(nx, ny, this.mass);
        
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
            var nx = lerp(this._move.x, x, t);
            var ny = lerp(this._move.y, y, t);
             
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
});

module.exports = Path;