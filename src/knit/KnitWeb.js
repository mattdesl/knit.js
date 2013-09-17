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