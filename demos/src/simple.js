var Vector2 = require('minivec').Vector2;
var Rectangle = require('minimath').Rectangle;
var World = require('knit').World;


var Constraint = require('knit').Constraint;
var PointMass = require('knit').PointMass;

var rand = require('minimath').random;
var dist = require('minimath').distance;
var lerp = require('minimath').lerp;
var smoothstep = require('minimath').smoothstep;

$(function() {
        var width = 500;
        var height = 300;
        var canvas = $("<canvas/>").css({
            position: "absolute",
            top: 0,
            left: 0,
            background: 'white',
            cursor: 'default'
        }).appendTo($("body"));

        canvas[0].width = width;
        canvas[0].height = height;

        var context = canvas[0].getContext("2d");

        var clothWidth = width;
        var clothHeight = height;
        var start_x = 0;
        var start_y = 0;
        var spacing = 9;
        var stiff = 0.1;
        var tear = 110; //at what distance does a constraint "tear" ?

        var mouseInfluence = 15;
        var mouseScale = 0.5;
        var mouseMaxDist = 20;
        var steps = 60;

        var mouseTearInfluence = 10;
        var gravity = 0;
        var mass = 1;
        var useFloor = false;

        var usePins = true; //we need to pin the cloth up if we have gravity enabled

        var world = new World(new Vector2(0, gravity));
        world.removablePins = true;
        world.setPinRemoveInfluence(15);

        if (useFloor) {
            world.bounds = new Rectangle(0, 0, width, height);
            world.floor = height - 5;
        }

        $(document).keypress(function(e) {
            world.points = [];
            if (e.which == 32)
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


        function createCloth() {
            var rows = Math.floor( clothHeight/spacing );
            var cols = Math.floor( clothWidth/spacing );
                
            for (var y = 0; y <= rows; y++) {
                for (var x = 0; x <= cols; x++) {
                    var p = new PointMass(start_x + x * spacing, start_y + y * spacing, 1);

                    var edge = (y === 0 || x === 0 || y === rows || x === cols);

                    if (x!==0)
                        p.attach(world.points[world.points.length - 1], spacing, stiff, tear);
                    if (usePins && edge)
                        p.pin(p.position.x, p.position.y);
                    if (y !== 0)
                        p.attach(world.points[ x + (y - 1) * (cols + 1)], spacing, stiff, tear);

                    world.points.push(p);
                }
            }
        }
            
        requestAnimationFrame(update);    
        
        function update() {
            requestAnimationFrame(update);
            context.clearRect(0, 0, width, height);

            world.step(0.016);

            context.fillStyle = "black";
            
            // context.globalCompositeOperation = 'source-over';
            //context.shadowColor = 'rgba(255,255,200, 0.7)';

            context.globalAlpha = 0.9;

            //context.beginPath(); //for line rendering
            var i = world.points.length;
            while (i-- > 1) {
                var p = world.points[i];

                //This is the point rendering (more like fluid)
                if (p.constraints.length > 0) {
                    var c = p.constraints[0];

                    context.fillRect(c.p1.position.x, c.p1.position.y, 1.5, 1.5);
                }
            }
        };

        canvas.mousemove(function(ev) {
            if (mouseDown) {
                world.applyTear(ev.clientX, ev.clientY, mouseTearInfluence);
                world.applyMotion(ev.clientX, ev.clientY, mouseInfluence, mouseScale, mouseMaxDist);
            } else
                world.applyMotion(ev.clientX, ev.clientY, mouseInfluence, mouseScale, mouseMaxDist);
        });

    }

);