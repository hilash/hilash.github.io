function init() {
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
      var getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;

      // Some browsers just don't implement it - return a rejected promise with an error
      // to keep a consistent interface
      if (!getUserMedia) {
        return Promise.reject(new Error('getUserMedia is not implemented in this browser'));
      }

      // Otherwise, wrap the call to the old navigator.getUserMedia with a Promise
      return new Promise(function(resolve, reject) {
        getUserMedia.call(navigator, constraints, resolve, reject);
      });
    }
  }

  // set up forked web audio context, for multiple browsers
  // window. is needed otherwise Safari explodes
  var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  var source;
  var stream;

  //set up the different audio nodes we will use for the app
  var analyser = audioCtx.createAnalyser();
  analyser.minDecibels = -90;
  analyser.maxDecibels = -10;
  analyser.smoothingTimeConstant = 0.85;

  var distortion = audioCtx.createWaveShaper();

  // distortion curve for the waveshaper, thanks to Kevin Ennis
  // http://stackoverflow.com/questions/22312841/waveshaper-node-in-webaudio-how-to-emulate-distortion
  function makeDistortionCurve(amount) {
    var k = typeof amount === 'number' ? amount : 50,
      n_samples = 44100,
      curve = new Float32Array(n_samples),
      deg = Math.PI / 180,
      i = 0,
      x;
    for ( ; i < n_samples; ++i ) {
      x = i * 2 / n_samples - 1;
      curve[i] = ( 3 + k ) * x * 20 * deg / ( Math.PI + k * Math.abs(x) );
    }
    return curve;
  };


  // set up canvas context for visualizer
  var timeCanvas = document.querySelector('.visualizer');
  var frequencyCanvas = document.querySelector('.frequency-domain');
  
  var drawVisual;

  //main block for doing the audio recording
  if (navigator.mediaDevices.getUserMedia) {
     console.log('getUserMedia supported.');
     var constraints = {audio: true}
     navigator.mediaDevices.getUserMedia (constraints)
        .then(
          function(stream) {
             source = audioCtx.createMediaStreamSource(stream);
             //source.connect(distortion);
             //distortion.connect(analyser);
            source.connect(analyser);
             analyser.connect(audioCtx.destination);

          	 visualize();
             //voiceChange();
        })
        .catch( function(err) { console.log('The following gUM error occured: ' + err);})
  } else {
     console.log('getUserMedia not supported on your browser!');
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
        drawGraph(frequencyCanvas, frequencyCanvasCtx, frequencyBufferLength, frequencyArray);
    };
    draw();
  }

  var drawGraph = function(canvas, canvasCtx, bufferLength, dataArray) {
    canvasCtx.fillStyle = 'rgb(200, 200, 200)';
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

    canvasCtx.lineWidth = 2;
    canvasCtx.strokeStyle = 'rgb(0, 0, 0)';

    canvasCtx.beginPath();

    var sliceWidth = canvas.width * 1.0 / bufferLength;
    var x = 0;

    for(var i = 0; i < bufferLength; i++) {

        var v = dataArray[i] / 128.0;
        var y = v * canvas.height/2;

        if(i === 0) {
        canvasCtx.moveTo(x, y);
        } else {
        canvasCtx.lineTo(x, y);
        }

        x += sliceWidth;
    }

    canvasCtx.lineTo(canvas.width, canvas.height/2);
    canvasCtx.stroke();
  };

  function voiceChange() {
    distortion.oversample = '4x';
    distortion.curve = makeDistortionCurve(400);
  }
}


// The AudioContext must be resumed (or created) after a user gesture on the page. 
// https://goo.gl/7K7WLu
document.body.onclick = init;
//init();