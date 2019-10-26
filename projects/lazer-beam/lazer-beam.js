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
    //  The intersection point falls within the second line segment if 0.0 <= u <= 1.0
    const t = determinant(x1-x3, x3-x4, y1-y3, y3-y4) / denominator;
    const u = -determinant(x1-x2, x1-x3, y1-y2, y1-y3) / denominator;

    if ((t < 0 || 1 < t) || (u < 0 || 1 < u)) {
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

var calculateVectorByAngle = function(angle) {
    angle = angle * (Math.PI/180.0);
    return [Math.cos(angle), Math.sin(angle)];
}
/////////////////// Draw utils ///////////////////

var drawLine = function(ctx, line, color) {
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.strokeStyle =  color;
    ctx.moveTo(line[0][0], line[0][1]);
    ctx.lineTo(line[1][0], line[1][1]);
    ctx.closePath();
    ctx.stroke();
}

var drawRect = function(ctx, canvas, rect, hole) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "black";
    ctx.strokeRect(0, 0, rect.width, rect.height);
    drawLine(ctx, hole, 'white');
}

/////////////////// RectangleWhiteCell - UI and Logic ///////////////////

class RectWhiteCell {
    constructor(canvas, uiOptions) {
        // init UI
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.uiOptions = uiOptions;

        // init Logic
        var rect = this.rect = {width:  canvas.width, height: canvas.height};
        // Line representation is [[x1, y1], [x2, y2]];
        const hole = this.hole = [[rect.width/2.0 - 1, 0], [rect.width/2.0 + 1, 0]];
        const edge1 = [[0,0], [rect.width,0]];
        const edge2 = [[rect.width,0], [rect.width,rect.height]];
        const edge3 = [[rect.width,rect.height], [0,rect.height]];
        const edge4 = [[0,rect.height], [0,0]];
        this.edges = [edge1, edge2, edge3, edge4];
        this.normals = [[0,1.0], [-1.0, 0], [0,-1.0], [1.0,0]];
        this.limit = Math.sqrt(Math.pow(rect.width,2) + Math.pow(rect.height,2));
        this.allow_to_run = true;
    }

    setUiOptions(uiOptions) {
        this.uiOptions = uiOptions;
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
        if (this.uiOptions.drawBeam) {
            drawLine(this.ctx, beam, this.uiOptions.colorBeam);
        }

        const res =  this.getIntersection(startingEdge, beam, this.edges);    
        const n = this.normals[res.edgeIndex];
        const d = getVectorDirection(beam);
        const r = getRefelctedVector(n, d);

        const reflectedBeam = getLine(res.intesection, r, this.limit);
        const normal = getLine(res.intesection, n, this.limit);

        
        if (this.uiOptions.drawReflectedBeam) {
            drawLine(this.ctx, reflectedBeam, this.uiOptions.colorReflectedBeam);
        }
        if (this.uiOptions.drawNormal) {
            drawLine(this.ctx, normal, this.uiOptions.colorNormal);
        }
        return [reflectedBeam, res.edgeIndex];
    }

    hasBeamExited(beam) {
        // given a beam, declare if it leaves the rectangle through the hole
        const intesection = doLinesIntesect(beam, this.hole);
        return Array.isArray(intesection) && intesection.length;
    }

    run() {
        while (!this.allow_to_run) {
            console.log("waiting to stop running. bad programming and there are some races here,\
                         but this is tiny JS simulation");
        }
        drawRect(this.ctx, this.canvas, this.rect, this.hole);

        this.startingAngle=this.uiOptions.startingAngle;
        this.startingBeam = getLine(this.hole[0], calculateVectorByAngle(this.startingAngle), this.limit);
        this.startingEdge = 0;

        this.edge = this.startingEdge;
        this.beam = this.startingBeam;
        this.index = 0;
        var id = setInterval(frame, 1000.0/this.uiOptions.fps, this);
        function frame(_this) {
            if (!_this.allow_to_run || 
                (0 == _this.uiOptions.maxSteps && _this.index == 10000 )||
                (0 < _this.uiOptions.maxSteps) && _this.uiOptions.maxSteps == _this.index+1 ) {
                clearInterval(id);
                _this.allow_to_run = true;
            } else {
                _this.index++; 
                document.getElementById("num-steps").textContent=_this.index+1;
                [_this.beam, _this.edge] = _this.getRefelctedBeam(_this.beam, _this.edge);
                if (!_this.uiOptions.ignoreHole && _this.hasBeamExited(_this.beam)){
                    clearInterval(id);
                    _this.allow_to_run = true;
                }
            }
        }
    }
  }

/////////////////// UI control ///////////////////

function getRectUiOptions() {
    // Get the checkbox
    const showBeam = document.getElementById("show-beam").checked;
    const showReflectedBeam = document.getElementById("show-reflected-beam").checked;
    const showNormal = document.getElementById("show-normal").checked;
    const ignoreHole = document.getElementById("ignore-hole").checked;
    const startingAngle = document.getElementById("starting-angle").value;
    const fps = document.getElementById("simulation-fps").value;
    const simulationMaxSteps = document.getElementById("simulation-max-steps").value;
    document.getElementById("angle-text").textContent = startingAngle +"\xB0";

    const uiOptions = {
        drawBeam: showBeam,
        drawNormal: showNormal,
        drawReflectedBeam: showReflectedBeam,
        colorBeam: 'red',
        colorNormal: 'orange',
        colorReflectedBeam: 'yellow',
        startingAngle: startingAngle,
        ignoreHole: ignoreHole,
        fps: fps,
        maxSteps: simulationMaxSteps,
    }
    return uiOptions;
  }

 function updateRectStateAndRun() {
    reflectedRect.setUiOptions(getRectUiOptions());
    this.allow_to_run = false;
    reflectedRect.run()
 }

var canvas = document.getElementById("lazerCanvas");
let reflectedRect = new RectWhiteCell(canvas, getRectUiOptions());
reflectedRect.run();