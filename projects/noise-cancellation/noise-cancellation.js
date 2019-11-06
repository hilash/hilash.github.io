var isPlaying = false;
var useNoiseReducer = false;

var audioCtx;
var source;
var stream;
var analyser;

// set up canvas context for visualizer
var drawVisual;
var timeCanvas = document.querySelector(".visualizer");
var frequencyCanvas = document.querySelector(".frequency-domain");

function getUserMediaFromBrowser() {
  // init navigator.mediaDevices.getUserMedia if supported.

  // Older browsers might not implement mediaDevices at all, so we set an empty object first
  if (navigator.mediaDevices === undefined) {
    navigator.mediaDevices = {};
  }
  // Some browsers partially implement mediaDevices. We can't just assign an object
  // with getUserMedia as it would overwrite existing properties.
  // Here, we will just add the getUserMedia property if it's missing.
  if (navigator.mediaDevices.getUserMedia === undefined) {
    navigator.mediaDevices.getUserMedia = function(constraints) {
      // First get ahold of the legacy getUserMedia, if present
      var getUserMedia =
        navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia ||
        navigator.msGetUserMedia;

      // Some browsers just don't implement it - return a rejected promise with an error
      // to keep a consistent interface
      if (!getUserMedia) {
        return Promise.reject(
          new Error("getUserMedia is not implemented in this browser")
        );
      }

      // Otherwise, wrap the call to the old navigator.getUserMedia with a Promise
      return new Promise(function(resolve, reject) {
        getUserMedia.call(navigator, constraints, resolve, reject);
      });
    };
  }
}

async function init() {
  // set up forked web audio context, for multiple browsers
  // window. is needed otherwise Safari explodes
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  //set up the different audio nodes we will use for the app
  analyser = audioCtx.createAnalyser();
  analyser.minDecibels = -90;
  analyser.maxDecibels = -10;
  analyser.smoothingTimeConstant = 0.85;

  getUserMediaFromBrowser();

  //
  //main block for doing the audio recording
  if (navigator.mediaDevices.getUserMedia) {
    try {
      console.log("getUserMedia supported.");
      var constraints = { audio: true };
      let stream = await navigator.mediaDevices.getUserMedia(constraints);
      source = audioCtx.createMediaStreamSource(stream);
       if (useNoiseReducer) {
            await audioCtx.audioWorklet.addModule('noise-cancellation-processor.js')
            const noisereducer = new AudioWorkletNode(audioCtx, 'noise-cancellation-processor');
            source.connect(noisereducer);
            noisereducer.connect(analyser);
            analyser.connect(audioCtx.destination); // if i want to play this sound
       }
       else {
           source.connect(analyser);
           analyser.connect(audioCtx.destination); // if i want to play this sound
       }
      visualize();
    } catch (err) {
      console.log("The following gUM error occured: " + err);
    }
  } else {
    console.log("getUserMedia not supported on your browser!");
  }
}

function visualize() {
  analyser.fftSize = 2048;
  var timeBufferLength = analyser.fftSize;
  var frequencyBufferLength = analyser.frequencyBinCount;
  var timeArray = new Uint8Array(timeBufferLength);
  var frequencyArray = new Uint8Array(frequencyBufferLength);

  var timeCanvasCtx = timeCanvas.getContext("2d");
  var frequencyCanvasCtx = frequencyCanvas.getContext("2d");

  timeCanvasCtx.clearRect(0, 0, timeCanvas.width, timeCanvas.height);
  frequencyCanvasCtx.clearRect(0, 0, frequencyCanvasCtx.width, frequencyCanvasCtx.height);

  var draw = function() {
    drawVisual = requestAnimationFrame(draw);
    analyser.getByteTimeDomainData(timeArray);
    analyser.getByteFrequencyData(frequencyArray);
    drawGraph(timeCanvas, timeCanvasCtx, timeBufferLength, timeArray);
    drawBinsGraph(
      frequencyCanvas,
      frequencyCanvasCtx,
      frequencyBufferLength,
      frequencyArray
    );
  };
  draw();
}

var drawGraph = function(canvas, canvasCtx, bufferLength, dataArray) {
  canvasCtx.fillStyle = "WhiteSmoke";
  canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

  canvasCtx.lineWidth = 1.5;
  canvasCtx.strokeStyle = "purple";
  canvasCtx.beginPath();

  var sliceWidth = (canvas.width * 1.0) / bufferLength;
  var x = 0;
  for (var i = 0; i < bufferLength; i++) {
    var v = dataArray[i] / 128.0;
    var y = (v * canvas.height) / 2.0;
    if (i === 0) {
      canvasCtx.moveTo(x, y);
    } else {
      canvasCtx.lineTo(x, y);
    }
    x += sliceWidth;
  }

  canvasCtx.lineTo(canvas.width, canvas.height / 2);
  canvasCtx.stroke();
};

var drawBinsGraph = function(canvas, canvasCtx, bufferLength, dataArray) {
  canvasCtx.fillStyle = "WhiteSmoke";
  canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

  var grd = canvasCtx.createLinearGradient(0, 0, 0, canvas.height);
  grd.addColorStop(0, "pink");
  grd.addColorStop(1, "purple");

  var sliceWidth = (canvas.width * 1.0) / bufferLength;
  var x = 0;
  for (var i = 0; i < bufferLength; i++) {
    var v = dataArray[i] / 128.0;
    var y2 = (v * canvas.height) / 1.0;
    var y = canvas.height - y2;

    canvasCtx.fillStyle = grd;
    canvasCtx.fillRect(x, y, sliceWidth, y2);
    x += sliceWidth;
  }
};

async function toggleSound() {
  if (isPlaying) {
    isPlaying = false;
    audioCtx.close();
    window.cancelAnimationFrame(drawVisual);
  } else {
    isPlaying = true;
    await init();
  }
}