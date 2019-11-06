audioCtx = new (window.AudioContext || window.webkitAudioContext)();


// shim layer with setTimeout fallback
window.requestAnimFrame = (function(){
return  window.requestAnimationFrame       || 
  window.webkitRequestAnimationFrame || 
  window.mozRequestAnimationFrame    || 
  window.oRequestAnimationFrame      || 
  window.msRequestAnimationFrame     || 
  function( callback ){
  window.setTimeout(callback, 1000 / 60);
};
})();

drawGraph = (canvas, canvasCtx, bufferLength, dataArray) => {
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
  
class OscillatorFFT {
  constructor() {
    this.canvasTime = document.querySelector(".time-domain");
    this.canvasFrequency = document.querySelector(".frequency-domain");
    this.isPlaying = false;
  }

  play = () => {
    this.oscillator = audioCtx.createOscillator();
    this.oscillator.type = 'sine'
    this.oscillator.frequency.value = 400;
    this.analyser = audioCtx.createAnalyser();
    this.oscillator.connect(this.analyser);
    this.analyser.connect(audioCtx.destination);
    this.oscillator[this.oscillator.start ? "start" : "noteOn"](0);
    this.visualize()
  };

  stop = () => {
    this.oscillator.stop(0);
  };
  
  toggle = () => {
    (this.isPlaying ? this.stop() : this.play());
    this.isPlaying = !this.isPlaying;
  };

  visualize = () => {
    this.analyser.fftSize = 2048;
    var timeBufferLength = this.analyser.fftSize;
    var frequencyBufferLength = this.analyser.frequencyBinCount;
    var timeBuffer = new Uint8Array(timeBufferLength);
    var frequencyBuffer = new Uint8Array(frequencyBufferLength);
  
    var canvasCtxTime = this.canvasTime.getContext("2d");
    var canvasCtxFrequency = this.canvasFrequency.getContext("2d");
  
    canvasCtxTime.clearRect(0, 0, this.canvasTime.width, this.canvasTime.height);
    canvasCtxFrequency.clearRect(0, 0, this.canvasFrequency.width, this.canvasFrequency.height);
  
    this.draw = function() {
      requestAnimationFrame(this.draw);
      this.analyser.getByteTimeDomainData(timeBuffer);
      this.analyser.getByteFrequencyData(frequencyBuffer);
      drawGraph(this.canvasTime, canvasCtxTime, timeBufferLength, timeBuffer);
      drawGraph(this.canvasFrequency, canvasCtxFrequency, frequencyBufferLength, frequencyBuffer);
    }.bind(this);;
    this.draw();
  }
}
