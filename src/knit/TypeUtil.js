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