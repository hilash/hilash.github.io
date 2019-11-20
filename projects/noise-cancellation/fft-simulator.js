var { clearBackground, drawLine, drawGraph } = import("./graph.js");
var initUserMediaFromBrowser = import("./audio-utils.js");

audioCtx = new (window.AudioContext || window.webkitAudioContext)();

class FFTSimulator {
  constructor() {
    this.canvasTime = document.querySelector(".time-domain");
    this.canvasFrequency = document.querySelector(".frequency-domain");
    this._source = "oscillator";
    this.isPlaying = false;

    this._oscillatorType = "sine";
    this._oscillatorFrequency = 364;
    this._oscillatorDetune = 0;

    this._microphoneStream = null;
    this._microphone = null;
  }

  async play() {
    this.analyser = audioCtx.createAnalyser();

    switch (this._source) {
      case "oscillator":
        // create oscillator (produces waveforms)
        this.oscillator = audioCtx.createOscillator();
        this.oscillator.type = this._oscillatorType;
        this.oscillator.frequency.value = this._oscillatorFrequency;
        this.oscillator.detune.value = this._oscillatorDetune;

        // connect audio nodes and start
        this.oscillator.connect(this.analyser);
        this.oscillator.start(0);
        break;

      case "microphone":
        initUserMediaFromBrowser();
        if (!navigator.mediaDevices.getUserMedia) {
          console.log("getUserMedia not supported on your browser!");
          break;
        }
        let constraints = { audio: true };
        this._microphoneStream = await navigator.mediaDevices.getUserMedia(
          constraints
        );
        this._microphone = audioCtx.createMediaStreamSource(
          this._microphoneStream
        );
        this._microphone.connect(this.analyser);
        break;
    }

    // connect the analazer, for FFT graphs visualizations
    this.analyser.connect(audioCtx.destination);
    this.visualize();
  }

  stop() {
    switch (this._source) {
      case "oscillator":
        this.oscillator.stop();
        break;
      case "microphone":
        this._microphoneStream.getTracks().forEach(function(track) {
          track.stop();
        });
        this._microphone.disconnect();
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
    } else {
      this._source = value;
    }
  }

  set frequency(value) {
    this._oscillatorFrequency = value;
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

    clearBackground(this.canvasTime);
    clearBackground(this.canvasFrequency);

    this.draw = function() {
      this.drawHandler = requestAnimationFrame(this.draw);
      this.analyser.getByteTimeDomainData(timeBuffer);
      this.analyser.getByteFrequencyData(frequencyBuffer);
      drawGraph(this.canvasTime, timeBufferLength, timeBuffer);
      drawGraph(
        this.canvasFrequency,
        frequencyBufferLength,
        frequencyBuffer,
        true
      );
    }.bind(this); // nice solution for requestAnimationFrame + this:  https://stackoverflow.com/a/32834390
    this.draw();
  }
}
