/////////////////// Math utils ///////////////////

var determinant = function(a, b, c, d) {
    return a*d - b*c;
}

var lineLength = function(line) {
    return Math.sqrt(Math.pow(line[1][0]-line[0][0], 2)
                   + Math.pow(line[1][1]-line[0][1], 2));
}

var doLinesIntesect = function(line1, line2) {
    // calculations from https://en.wikipedia.org/wiki/Line–line_intersection
    const x1 = line1[0][0];
    const y1 = line1[0][1];
    const x2 = line1[1][0];
    const y2 = line1[1][1];
    const x3 = line2[0][0];
    const y3 = line2[0][1];
    const x4 = line2[1][0];
    const y4 = line2[1][1];

    // When the two lines are parallel or coincident the denominator is zero:
    const denominator = determinant(x1-x2, x3-x4, y1-y2, y3-y4);
    if (denominator === 0) {
        return [];
    }

    // The intersection point falls within the first line segment if 0.0 <= t <= 1.0
    const t = determinant(x1-x3, x3-x4, y1-y3, y3-y4) / denominator;
    if (t < 0 || 1 < t) {
        return [];
    }
    const px = x1 + t * (x2-x1);
    const py = y1 + t * (y2-y1);
    return [px, py];
}

var getLine = function(point, vector, limit) {
    // Create Line the start at point and in the vector direction.
    var line = [point, [point[0] + vector[0], point[1] + vector[1]]];
    // Make sure the line length is exceeds the rectangle area.
    while (lineLength(line) < limit) {
        line = [line[0], [line[1][0] + vector[0], line[1][1] + vector[1]]];
    }
    return line;
}

var getRefelctedVector = function(n, d) {
    // d is the hitting vector
    // n is the normalized normal
    // r = d - 2d*n, where * is dot product
    rx = d[0] - 2*(d[0]*n[0]+d[1]*n[1])*n[0]
    ry = d[1] - 2*(d[0]*n[0]+d[1]*n[1])*n[1]
    return [rx, ry]
}

var getVectorDirection = function(s) {
    // get only the directon vector of a line (segment)
    return [s[1][0]-s[0][0], s[1][1]-s[0][1]];
}

/////////////////// Draw utils ///////////////////

var drawLine = function(ctx, line, color) {
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.strokeStyle =  color;
    ctx.moveTo(line[0][0], line[0][1]);
    ctx.lineTo(line[1][0], line[1][1]);
    ctx.closePath();
    ctx.stroke();
}

var drawRect = function(ctx, rect, hole) {
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, rect.width, rect.height);
    drawLine(ctx, hole, 'white');
}

/////////////////// RectangleWhiteCell - UI and Logic ///////////////////

class RectWhiteCell {
    constructor(canvas) {
        // init UI
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");

        // init Logic
        var rect = this.rect = {width:  canvas.width, height: canvas.height};
        // Line representation is [[x1, y1], [x2, y2]];
        var hole = this.hole = [[rect.width/2.0 - 1, 0], [rect.width/2.0 + 1, 0]];
        this.beam = [hole[0], [rect.width/4.0, rect.height+100]];
        const edge1 = [[0,0], [rect.width,0]];
        const edge2 = [[rect.width,0], [rect.width,rect.height]];
        const edge3 = [[rect.width,rect.height], [0,rect.height]];
        const edge4 = [[0,rect.height], [0,0]];
        this.edges = [edge1, edge2, edge3, edge4];
        this.normals = [[0,1.0], [-1.0, 0], [0,-1.0], [1.0,0]];
        this.limit = Math.sqrt(Math.pow(rect.width,2) + Math.pow(rect.height,2));

        drawRect(this.ctx, this.rect, this.hole);
    }
  
    getIntersection(startingEdge, line) {
        // return the intersection point and edge of the line starting from
        // startingEdge of the rectangle.
        // params: startingEdge - the index of the edge the line starts from
        //         line - the hitting beam
        // return: intersection point, intersection edge..
        var index, len;
        for (index = 0, len = this.edges.length; index < len; ++index) {
            if (index===startingEdge) {
                continue;
            }
            var intesection = doLinesIntesect(this.edges[index], line);
            if (Array.isArray(intesection) && intesection.length) {
                return {intesection: intesection, edgeIndex: index};
            }
        }
        return {};
    }
    
    getRefelctedBeam(beam, startingEdge) {
        // calculate where the beam (vector d) hits the next edge
        // returns: [reflected beam as a line segment,
        //          reflected beam's hitting edge index]
        if (drawOptions.drawBeam) {drawLine(this.ctx, beam, drawOptions.colorBeam);}
        var res =  this.getIntersection(startingEdge, beam, this.edges);    
        var n = this.normals[res.edgeIndex];
        var d = getVectorDirection(beam);
        var r = getRefelctedVector(n, d);
        
        var reflectedBeam = getLine(res.intesection, r, this.limit);
        if (drawOptions.drawReflectedBeam) {
            drawLine(this.ctx, reflectedBeam, drawOptions.colorReflectedBeam);
        }
        if (drawOptions.drawNormal) {
            const normal = getLine(res.intesection, n, this.limit);
            drawLine(this.ctx, normal, drawOptions.colorNormal);
        }
        return [reflectedBeam, res.edgeIndex];
    }

    run() {
        var edge = 0;
        var beam = this.beam;
        var index;
        
        for (index = 0 ; index < 40; ++index) {
            var [beam, edge] = this.getRefelctedBeam(beam, edge);
        }
    }
  }
  
const drawOptions = {
    drawBeam: true,
    drawNormal: true,
    drawReflectedBeam: true,
    colorBeam: 'red',
    colorNormal: 'orange',
    colorReflectedBeam: 'yellow',
}


var canvas = document.getElementById("lazerCanvas");
let reflectedRect = new RectWhiteCell(canvas, drawOptions);
reflectedRect.run()