var World = require('knit').World;
var Constraint = require('knit').Constraint;
var PointMass = require('knit').PointMass;
var Vector2 = require('minivec').Vector2;
var Rectangle = require('minimath').Rectangle;

$(function() {
	var width = window.innerWidth;
	var height = 700;
	var canvas = $("<canvas/>").css({
	    position: "absolute",
	    top: 0,
	    left: 0,
	    background: 'gray'
	}).appendTo($("body"));

	canvas[0].width = width;
	canvas[0].height = height;

	var context = canvas[0].getContext("2d");



    var clothWidth = 50;
    var clothHeight = 55;
    var start_x = 50;
    var start_y = 100;
    var spacing = 5;
    var stiff = 0.02;
    var tear = 30; //at what distance does a constraint "tear" ? 
    
    var mouseInfluence = 5;
    var mouseScale = 0.5;
    var mouseMaxDist = 15;
    var steps = 6;
    
    var mouseTearInfluence = 4;
    var gravity = 0;
    var mass = 0.1;
    var useFloor = true;
    
    var fontSize = 250; 

    var usePins = false; //we need to pin the cloth up if we have gravity enabled

    var world = new World(new Vector2(0, gravity));
    world.removablePins = true;
    world.setPinRemoveInfluence(15);
    
    if (useFloor) {
        world.bounds = new Rectangle(0, 0, width, height);
        world.floor = height-5;
    }
    
    
    $(document).keypress(function(e) {
        world.points = [];
        if (e.which==32)
        	createCloth();
        
    }); 
    $(function() {
        createCloth();
    });
    
    var mouseDown = false;
    canvas.mousedown(function(ev) {
        if (ev.which == 1)
            mouseDown = true;
    });
    canvas.mouseup(function(ev) {
        if (ev.which == 1)
            mouseDown = false;
    });
     
    
    canvas.mousemove(function(ev) {
        if (mouseDown) {
            world.applyTear(ev.clientX, ev.clientY, mouseTearInfluence);
            world.applyMotion(ev.clientX, ev.clientY, mouseInfluence, mouseScale, mouseMaxDist);
        } else
            world.applyMotion(ev.clientX, ev.clientY, mouseInfluence, mouseScale, mouseMaxDist);
    });
    
    function createCloth() {
        for (var y=0; y<=clothHeight; y++) {
            for (var x=0; x<=clothWidth; x++) {
                var p = new PointMass(start_x + x * spacing, start_y + y * spacing, 2);
                
                (x!==0) && p.attach( world.points[world.points.length-1], spacing, stiff, tear );  
                if (usePins)
                    (y===0) && p.pin( p.position.x, p.position.y );
                (y!==0) && p.attach( world.points[ x + (y - 1) * (clothWidth + 1)], spacing, stiff, tear );            
                
                world.points.push(p);
            }
        }
    }
    
    
    var stepper = 100;
    requestAnimationFrame(update);

    function update() { 
    	requestAnimationFrame(update);
        context.clearRect(0, 0, width, height);
        
        world.step(.016);
        
        // context.fillStyle = "black";
        // stepper++;
        // if (stepper>1000)
        //     stepper = 100;
        // var windX = width/4 + Math.sin(stepper*0.0035 * Math.cos(stepper*0.01)) * width/4;
        // var windY = height/2 + Math.sin(stepper*0.05) * height/2;
        // context.fillRect(windX, windY, 10, 10);
        // world.applyTear(windX, windY, mouseInfluence);
        // world.applyMotion(windX, windY, mouseInfluence, mouseScale, mouseMaxDist);
        
        context.fillStyle = "blue";
        context.strokeStyle= "red";
      
        var i = world.points.length;
        // context.beginPath(); //for line rendering
        while (i-- > 1) {
            var p = world.points[i];    
            context.fillStyle = "rgba(0,0,0,0.5)";
            context.strokeStyle = "rgba(25,25,25,0.95)";
            context.lineWidth = 0.5;
            
            // for (var j=0; j<p.constraints.length; j++) {
            //     var c = p.constraints[j];
            //     //Render as lines (like a cloth)
            //     context.moveTo(c.p1.position.x, c.p1.position.y);
            //     context.lineTo(c.p2.position.x, c.p2.position.y);                
            // }
            // 
            if (i%8===0)
                continue;
            
            if (p.constraints.length > 0) {
                var c = p.constraints[0];
                context.fillRect(c.p1.position.x, c.p1.position.y, 2.5, 2.5);
            }
        }
        //for line rendering
        // context.closePath();
        // context.stroke();
        
    }
})