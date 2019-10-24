---
layout: post
title:  "Reflections of a laser beam"
date:   2019-10-21
categories:
---

I must admit, I didn't take the optics course during my Bs.c. in Physics. Nevertheless, One can never forget how light simply works - it hits the surface, and then reflect.

[Project Euler problem 144](https://projecteuler.net/problem=144) discuss the following problem (in short):
>A lazer beam enters an ellipse ($$4x^2 + y^2 = 100$$) with small hole at it's top ($$−0.01\leq x\leq+0.01$$)
>How many times does the beam hit the internal surface of the ellipse before exiting?
>![Image](/assets/images/p144_2.gif)

For the specific details you can read the full problem.
Coming to solve this, vectors arithmatic comes in handy. I don't know why this problem difficulty is 50%, given that any high-school graduate suppose to have the tools for it.

I wrote my soultion in Python, and used matplotlib for the animation. 
I won't post it since it's againt ProjectEuler's wish - solving the problem by yourself makes all the fun. This is the ellipse after %d steps. You can see the blue beam being the last to leave.
>![Image](/assets/images/lazer-beam-reault.png)

I will however solve here a version of this problem, using a different shape. 

>**A lazer beam enters a rectangle with small hole at it's top (2px wide).
>How many times does the beam hit the internal surface of the ellipse before exiting?**

when approching this problem we need to answer few questions:
1. How to detect where the lazer beam hits?
2. How is the beam reflected after hitting the surface?
3. What about corners?
let's answer it, step by step.

# How to detect where the lazer beam hits?

We have a rectangle here, which has it's pros and cons: on one side, it's easier, since it's composed out of 4 line segments. On the other, unlike the ellipse, it doesn't have a single elegant equeation, which would come in handy if we would like to detect intersection between the beam and the shape.
So, we have 4 line segments (rectangle) + 1 line segment (beam).
*
Let's explore some *lines segments intersection detection* methods:
1. [Line–line intersection](https://en.wikipedia.org/wiki/Line%E2%80%93line_intersection)
2. [How do you detect where two line segments intersect?](https://stackoverflow.com/questions/563198/how-do-you-detect-where-two-line-segments-intersect/1201356#1201356)

We would implement the method explained on the first link: given two lines, where each line has it's start and finish points, calculate using a parameter when the two would intersect. 

```javascript
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

    // The intersection point falls within the first line segment
    // if 0.0 <= t <= 1.0
    const t = determinant(x1-x3, x3-x4, y1-y3, y3-y4) / denominator;
    if (t < 0 || 1 < t) {
        return [];
    }
    const px = x1 + t * (x2-x1);
    const py = y1 + t * (y2-y1);
    return [px, py];
}
```
A beam would have 2 interesecting edges: the edge it came from and the edge it hits. A simple condition will give us the correct edge the beam hits.

# How is the beam reflected after hitting the surface?
Given an edge and a hitting beam, we would like to calculate the reflected beam. 
Converting each line to vector and solve it using the [reflection formula](https://math.stackexchange.com/questions/13261/how-to-get-a-reflection-vector) is really simple and easy.

![Normal](/assets/images/normal.png)
Given $$\hat{n}$$, the normalized [normal](https://en.wikipedia.org/wiki/Normal_(geometry)) of the edge, pointed to the interior or the rectangle, and $$\overrightarrow{d}$$ the hitting beam vector, the reflected vector is described as:

$$\overrightarrow{r}=\overrightarrow{d}-2\overrightarrow{d}\cdot\hat{n}$$

That formula is really easy to grasp after painting the vectors.

```javascript
var getRefelctedVector = function(n, d) {
    // d is the hitting vector
    // n is the normalized normal
    // r = d - 2d*n, where * is dot product
    rx = d[0] - 2*(d[0]*n[0]+d[1]*n[1])*n[0]
    ry = d[1] - 2*(d[0]*n[0]+d[1]*n[1])*n[1]
    return [rx, ry]
}

var getNextBeam = function(ctx, beam, startingEdge, edges, normals, limit) {
    // calculate where the beam (vector d) hits the next edge. 
    var res =  getIntersection(startingEdge, beam, edges);    
    var n = normals[res.edgeIndex];
    var d = getVectorDirection(beam);
    var r = getRefelctedVector(n, d);
    
    var newBeam = getLine(res.intesection, r, limit);
    var normal = getLine(res.intesection, n, limit);

    return [newBeam, res.edgeIndex];
}
```
The function gets the beam and starting edge, then calculates the vectors n, d, and then using linear algebra to calculate the reflected vector r.
Notice that n, d, r are all direction vectors (meaning they don't reflect the real position on the grid.).
Inorder to get the segemnt line representation (point1->point2), we would combine the intersection point as the starting point, to the direction vector.
# What about corners?
Bla.
<br/>

<button type="button">Click Me!</button>


<br/>
<input id="beam" type="checkbox"  onclick="myFunction()"> Show beam
<input id="reflected-beam" type="checkbox"  onclick="myFunction()"> Show Reflected Beam
<input id="normal" type="checkbox"  onclick="myFunction()"> Show Normal
<hr>
<input id="done" type="checkbox"  onclick="myFunction()"> Stop after beam exites?
Slow or Fast <input id="slider1" type="range" min="100" max="500" step="10" />
Max Steps: <input type="number" name="quantity" min="0">


<canvas id="lazerCanvas" width="500px" height="300px" style="background: white">
Your browser does not support the HTML5 canvas tag.
</canvas>
<script src="{{ base.url | prepend: site.url }}/assets/js/lazer-beam.js"></script>