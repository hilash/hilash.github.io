var drawGraph = import("./graph.js");
var initUserMediaFromBrowser = import("./audio-utils.js");

audioCtx = new (window.AudioContext || window.webkitAudioContext)();

class OscillatorFFT {
  constructor() {
    this.canvasTime = document.querySelector(".time-domain");
    this.canvasFrequency = document.querySelector(".frequency-domain");
    this._source = 'oscillator';
    this.isPlaying = false;

    this._oscillatorType = "sine";
    this._oscillatorFrequency = 440;
    this._oscillatorDetune = 0;

    this.microphoneStream = null;
    this.microphone = null;
  }

  async play() {
    this.analyser = audioCtx.createAnalyser();

    switch (this._source) {
      case 'oscillator':
        // create oscillator (produces soundwave)
        this.oscillator = audioCtx.createOscillator();
        this.oscillator.type = this._oscillatorType;
        this.oscillator.frequency.value = this._oscillatorFrequency
        this.oscillator.detune.value = this._oscillatorDetune;
      
        // connect audio nodes and start
        this.oscillator.connect(this.analyser);
        this.oscillator.start(0);
        break;

      case 'microphone': 
        initUserMediaFromBrowser();
        if (!navigator.mediaDevices.getUserMedia){
          console.log('getUserMedia not supported on your browser!');
          break;
        }
        let constraints = { audio: true };
        this.microphoneStream = await navigator.mediaDevices.getUserMedia(constraints);
        this.microphone = audioCtx.createMediaStreamSource(this.microphoneStream);
        this.microphone.connect(this.analyser);
        break;
    }

    // connect the analazer, for FFT display
    this.analyser.connect(audioCtx.destination);
    this.visualize();
  }

  stop() {
    switch (this._source) {
      case 'oscillator':
        this.oscillator.stop();
        break;
      case 'microphone':
        this.microphoneStream.getTracks().forEach(function(track) {
          track.stop();
        });
        this.microphone.disconnect();
        break;
    }
    window.cancelAnimationFrame(this.drawHandler);
  }

  toggle() {
    if (this.isPlaying) {
      this.stop();
    } else {
      this.play();
    }
    this.isPlaying = !this.isPlaying;
  }

  set source(value) {
    if (this.isPlaying) {
      this.stop();
      this._source = value;
      this.play();
    }
    else {
      this._source = value;
    }
  }

  set frequency(value) {
    this._oscillatorFrequency = value; // can have a "update oscillator" func.
    this.oscillator.frequency.value = value;
  }

  set detune(value) {
    this._oscillatorDetune = value;
    this.oscillator.detune.value = value;
  }

  set wavetype(value) {
    this._oscillatorType = value;
    this.oscillator.type = value;
  }

  visualize() {
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
      this.drawHandler = requestAnimationFrame(this.draw);
      this.analyser.getByteTimeDomainData(timeBuffer);
      this.analyser.getByteFrequencyData(frequencyBuffer);
      drawGraph(this.canvasTime, canvasCtxTime, timeBufferLength, timeBuffer);
      drawGraph(this.canvasFrequency, canvasCtxFrequency, frequencyBufferLength, frequencyBuffer, true);
    }.bind(this); // nice solution for requestAnimationFrame + this:  https://stackoverflow.com/a/32834390
    this.draw();
  }
}

/*
# sample rate:  fs
fs = 44100
BL = 2048
fn = fn /2 = 44100 / 2 # max frequency
Measurement duration D. The measurement duration is given by the sampling rate fs and the blocklength BL.
D = BL / fs = 2048 / 44100 ~  21.33 ms
Frequency resolution df. The frequency resolution indicates the frequency spacing between two measurement results.

df = fs / BL = 44100 / 2048 =  21.533203125
*/

