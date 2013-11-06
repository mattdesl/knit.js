var Class = require('jsOOP').Class;
var Vector2 = require('minivec').Vector2;
var lerp = require('minimath').lerp;

var PointMass = require('../PointMass');

var Twine = new Class({

    /** Twine is a simple string from one point to another, with a variable number of steps between. */
    initialize: function(paramsDict) {
        this.start = new Vector2();
        this.end = new Vector2();
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
    },
    
    /** Constructs the fabric from the current parameters. */
    create: function() {
        this.points = [];
        
        var i=0;
        for (i=0; i<this.steps; i++) {
            var t = (i/this.steps);
            var nx = lerp(this.start.x, this.end.x, t);   
            var ny = lerp(this.start.y, this.end.y, t);
            
            var p = new PointMass(nx, ny, this.mass);
            
            if ((i===0 && this.pinStart) || (i===this.steps-1 && this.pinEnd)) {
                p.pin(nx, ny, this.weakPins);
            }
            
            if (i!==0) {
                p.attach(this.points[i-1], null, this.stiffness, this.tearDistance);
            }
            
            this.points.push(p);
        }
    }
});

module.exports = Twine;