(function () {
  'use strict';

  // ASCII chars from dark to light (space = brightest)
  var CHARS = '@%#*+=-:. ';
  var CHAR_COUNT = CHARS.length;
  var FONT_SIZE = 10;
  var LINE_HEIGHT = 1.15;
  var DAMPING = 0.96;
  var MOUSE_RADIUS = 3;
  var MOUSE_STRENGTH = 80;
  var BG_OPACITY = 0.15;
  var IMG_FRACTION = 0.55; // right portion that shows the actual image
  var FADE_BRIGHTNESS = 0.95; // brightness to fade toward on the far left
  var CELL_W = FONT_SIZE * 0.6; // monospace char width approx
  var CELL_H = FONT_SIZE * LINE_HEIGHT;

  var container = document.getElementById('ascii-bg-container');
  if (!container) return;

  // Inject styles
  var style = document.createElement('style');
  style.textContent =
    '#ascii-bg-container{position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:0;pointer-events:none;overflow:hidden;}' +
    '#ascii-bg-pre{margin:0;padding:0;font-family:monospace;font-size:' + FONT_SIZE + 'px;line-height:' + LINE_HEIGHT + ';opacity:' + BG_OPACITY + ';color:#000;white-space:pre;user-select:none;}' +
    '#home-content{position:relative;z-index:1;}';
  document.head.appendChild(style);

  var pre = document.createElement('pre');
  pre.id = 'ascii-bg-pre';
  container.appendChild(pre);

  // State
  var cols = 0, rows = 0;
  var brightness = null; // Float32Array of base brightness per cell
  var rippleCur = null;  // Float32Array current ripple state
  var ripplePrev = null; // Float32Array previous ripple state
  var imgData = null;    // ImageData from loaded image
  var imgW = 0, imgH = 0;
  var animId = null;
  var mouseX = -1, mouseY = -1;
  var isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isMobile = window.innerWidth < 768;

  // Load image
  var img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = function () {
    var canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    imgW = canvas.width;
    imgH = canvas.height;
    rebuild();
    if (!isReduced && !isMobile) {
      startLoop();
    }
  };
  img.src = '/assets/images/hila.png';

  function rebuild() {
    if (!imgData) return;

    cols = Math.floor(window.innerWidth / CELL_W);
    rows = Math.floor(window.innerHeight / CELL_H);
    if (cols < 1 || rows < 1) return;

    var totalCells = cols * rows;
    brightness = new Float32Array(totalCells);
    rippleCur = new Float32Array(totalCells);
    ripplePrev = new Float32Array(totalCells);

    // Downsample image into right portion, extend left edge naturally
    var pixels = imgData.data;
    var imgStartCol = Math.floor(cols * (1 - IMG_FRACTION));
    var imgCols = cols - imgStartCol;

    // Aspect-fit scaling for the image region
    var imgAspect = imgW / imgH;
    var gridAspect = (imgCols * CELL_W) / (rows * CELL_H);

    var srcX0, srcY0, srcW, srcH;
    if (imgAspect > gridAspect) {
      srcH = imgH;
      srcW = imgH * gridAspect;
      srcX0 = (imgW - srcW) / 2;
      srcY0 = 0;
    } else {
      srcW = imgW;
      srcH = imgW / gridAspect;
      srcX0 = 0;
      srcY0 = (imgH - srcH) / 2;
    }

    // First pass: fill the image region (right side)
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < imgCols; c++) {
        var px = Math.floor(srcX0 + (c / imgCols) * srcW);
        var py = Math.floor(srcY0 + (r / rows) * srcH);
        px = Math.min(Math.max(px, 0), imgW - 1);
        py = Math.min(Math.max(py, 0), imgH - 1);
        var idx = (py * imgW + px) * 4;
        var lum = (0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2]) / 255;
        brightness[r * cols + (imgStartCol + c)] = lum;
      }
    }

    // Second pass: extend the left edge outward with a fade
    for (var r = 0; r < rows; r++) {
      var edgeBrightness = brightness[r * cols + imgStartCol];
      for (var c = 0; c < imgStartCol; c++) {
        // t=0 at far left, t=1 at the image edge
        var t = c / imgStartCol;
        // Smooth ease-in so it blends gently
        t = t * t;
        brightness[r * cols + c] = FADE_BRIGHTNESS * (1 - t) + edgeBrightness * t;
      }
    }

    renderStatic();
  }

  function renderStatic() {
    if (!brightness) return;
    var lines = [];
    for (var r = 0; r < rows; r++) {
      var line = '';
      for (var c = 0; c < cols; c++) {
        var b = brightness[r * cols + c];
        var ci = Math.floor(b * (CHAR_COUNT - 1));
        ci = Math.min(Math.max(ci, 0), CHAR_COUNT - 1);
        line += CHARS[ci];
      }
      lines.push(line);
    }
    pre.textContent = lines.join('\n');
  }

  function renderFrame() {
    if (!brightness || !rippleCur) return;

    // Build output using array for speed
    var buf = new Uint8Array(cols * rows + rows); // chars + newlines
    var pos = 0;
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var idx = r * cols + c;
        var b = brightness[idx] + rippleCur[idx] * 0.01;
        var ci = Math.floor(b * (CHAR_COUNT - 1));
        if (ci < 0) ci = 0;
        if (ci >= CHAR_COUNT) ci = CHAR_COUNT - 1;
        buf[pos++] = CHARS.charCodeAt(ci);
      }
      if (r < rows - 1) {
        buf[pos++] = 10; // newline
      }
    }

    pre.textContent = new TextDecoder().decode(buf.subarray(0, pos));
  }

  function stepRipple() {
    if (!rippleCur || !ripplePrev) return;

    var next = ripplePrev; // reuse old prev buffer as next
    for (var r = 1; r < rows - 1; r++) {
      for (var c = 1; c < cols - 1; c++) {
        var idx = r * cols + c;
        var avg =
          rippleCur[idx - 1] +
          rippleCur[idx + 1] +
          rippleCur[idx - cols] +
          rippleCur[idx + cols];
        next[idx] = (avg / 2 - ripplePrev[idx]) * DAMPING;
      }
    }

    ripplePrev = rippleCur;
    rippleCur = next;
  }

  function injectMouse() {
    if (mouseX < 0 || mouseY < 0) return;
    var gc = Math.floor(mouseX / CELL_W);
    var gr = Math.floor(mouseY / CELL_H);
    for (var dr = -MOUSE_RADIUS; dr <= MOUSE_RADIUS; dr++) {
      for (var dc = -MOUSE_RADIUS; dc <= MOUSE_RADIUS; dc++) {
        var rr = gr + dr;
        var cc = gc + dc;
        if (rr >= 0 && rr < rows && cc >= 0 && cc < cols) {
          var dist = Math.sqrt(dr * dr + dc * dc);
          if (dist <= MOUSE_RADIUS) {
            rippleCur[rr * cols + cc] += MOUSE_STRENGTH * (1 - dist / MOUSE_RADIUS);
          }
        }
      }
    }
  }

  function tick() {
    injectMouse();
    stepRipple();
    renderFrame();
    animId = requestAnimationFrame(tick);
  }

  function startLoop() {
    if (animId) return;
    animId = requestAnimationFrame(tick);
  }

  function stopLoop() {
    if (animId) {
      cancelAnimationFrame(animId);
      animId = null;
    }
  }

  // Mouse tracking (on document so pointer-events:none on container is fine)
  document.addEventListener('mousemove', function (e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  document.addEventListener('mouseleave', function () {
    mouseX = -1;
    mouseY = -1;
  });

  // Visibility
  document.addEventListener('visibilitychange', function () {
    if (isReduced || isMobile) return;
    if (document.hidden) {
      stopLoop();
    } else {
      startLoop();
    }
  });

  // Resize (debounced)
  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      isMobile = window.innerWidth < 768;
      rebuild();
      if (isReduced || isMobile) {
        stopLoop();
      } else {
        startLoop();
      }
    }, 200);
  });

  // Reduced motion
  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', function (e) {
    isReduced = e.matches;
    if (isReduced) {
      stopLoop();
      renderStatic();
    } else if (!isMobile) {
      startLoop();
    }
  });
})();
