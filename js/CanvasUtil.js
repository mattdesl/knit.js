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