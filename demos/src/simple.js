var Vector2 = require('vecmath').Vector2;
var World = require('knit').World;


var Constraint = require('knit').Constraint;
var PointMass = require('knit').PointMass;

$(function() {
        var width = 500;
        var height = 300;
        var canvas = $("<canvas/>").css({
            position: "absolute",
            top: 0,
            left: 0,
            background: 'white',
            cursor: 'default',
        }).appendTo($("body"));

        canvas[0].width = window.innerWidth;
        canvas[0].height = window.innerHeight;

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

        var cloth = false;

        var usePins = false; //we need to pin the cloth up if we have gravity enabled

        var world = new World(new Vector2(0, gravity));
        world.removablePins = true;
        world.setPinRemoveInfluence(15);

        // if (useFloor) {
        //     world.bounds = new Rectangle(0, 0, width, height);
        //     world.floor = height - 5;
        // }

        $(document).keypress(function(e) {
            
            if (e.which == 32)
                createCloth();
            else if (e.which == 67 || e.which == 99) {
                var enableGravity = world.gravity.y===0;

                world.gravity.y = enableGravity ? 200 : 0;
                // stiff = enableGravity ? 0.9 : 0.1;
                tear = enableGravity ? 30 : 110;
                cloth = enableGravity;
                usePins = !enableGravity;
                clothWidth = enableGravity ? 200 : width;
                clothHeight = enableGravity ? 200 : height;
                spacing = 8;
                mass = 2;
                createCloth();
            }
        });

        createCloth();
        var css = {
            fontFamily: 'sans-serif',
            fontSize: '15px',
            color: 'black',
            fontVariant: 'small-caps',
            display: 'block',
            lineHeight: '20px'

        };
        var container = $("<div>").css({
            position: "absolute",
            top: height + 40,
            left: 10,
        }).appendTo($("body"));

        var labels = [
            "<span>MOUSE moves points</span>",
            "<span>CLICK + DRAG to tear</span>",
            "<span>SPACE to reset</span>",
            "<span>C to toggle cloth</span>"
        ];
        for (var i=0; i<labels.length; i++) {
            $(labels[i])
                .css(css)
                .appendTo(container);
        }
        

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
            world.points = [];
            var rows = Math.floor( clothHeight/spacing );
            var cols = Math.floor( clothWidth/spacing );
                
            for (var y = 0; y <= rows; y++) {
                for (var x = 0; x <= cols; x++) {
                    var p = new PointMass(start_x + x * spacing, start_y + y * spacing, mass);

                    var edge = !usePins 
                            ? (y === 0)
                            : (y === 0 || x === 0 || y === rows || x === cols);

                    if (x!==0)
                        p.attach(world.points[world.points.length - 1], spacing, stiff, tear);
                    if (edge)
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
            context.clearRect(0, 0, canvas[0].width, canvas[0].height);

            world.step(0.016);

            context.fillStyle = "black";
            context.strokeStyle = 'rgba(0,0,0,0.5)';
            // context.globalCompositeOperation = 'source-over';
            //context.shadowColor = 'rgba(255,255,200, 0.7)';

            context.globalAlpha = 0.8;

            //context.beginPath(); //for line rendering
            var i = world.points.length;
            if (cloth) {
                context.beginPath();
            }
            while (i-- > 1) {
                var p = world.points[i];

                if (cloth) {
                    for (var j=0; j<p.constraints.length; j++) {
                        var c = p.constraints[j];
                        context.moveTo(c.p1.position.x, c.p1.position.y);
                        context.lineTo(c.p2.position.x, c.p2.position.y);
                    }
                } else {
                    //This is the point rendering (more like fluid)
                    if (p.constraints.length > 0) {
                        var c = p.constraints[0];
                        context.fillRect(c.p1.position.x, c.p1.position.y, 1.5, 1.5);
                    }
                }
            }
            if (cloth) {
                context.closePath();
                context.stroke();
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