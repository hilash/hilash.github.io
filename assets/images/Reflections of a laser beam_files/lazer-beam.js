var drawLine = function(line, color) {
    ctx.beginPath();
    ctx.strokeStyle =  color;
    ctx.moveTo(line[0][0], line[0][1]);
    ctx.lineTo(line[1][0], line[1][1]);
    ctx.closePath();
    ctx.stroke();
}

var determinant = function(a, b, c, d) {
    return a*d - b*c;
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

var canvas = document.getElementById("lazerCanvas");
var ctx = canvas.getContext("2d");

var rect = {width:  canvas.width, height: canvas.height}
// Line representation is [[x1, y1], [x2, y2]];
var hole = [[rect.width/2.0 - 1, 0], [rect.width/2.0 + 1, 0]];
var beam = [hole[0], [rect.width/3.0, rect.height]];
const edge1 = [[0,0], [rect.width,0]];
const edge2 = [[rect.width,0], [rect.width,rect.height]];
const edge3 = [[rect.width,rect.height], [0,rect.height]];
const edge4 = [[0,rect.height], [0,0]];
edges = [edge1, edge2, edge3, edge4];

// draw rectangle
ctx.lineWidth = 2;
ctx.strokeRect(0, 0, rect.width, rect.height);
// draw hole
drawLine(hole, 'white');

edges.forEach(function(entry) {
    console.log(entry);
    drawLine(entry, 'pink');
    console.log("doLinesIntesect", doLinesIntesect(entry, beam));
});

drawLine(beam, 'red');
