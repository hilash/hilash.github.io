var { clearBackground, drawLine, drawGraph } = import("./graph.js");

audioCtx = new (window.AudioContext || window.webkitAudioContext)();

class WavesInterferenceSimulator {
  constructor() {
    this._canvas = document.getElementById("waves-canvas");
    this._source = "oscillator";
    this.isPlaying = false;
    this._outputWave = true;
    this._outputAntiWave = true;
    this._antiWavePhase = 0;

    this._oscillatorType = "sine";
    this._oscillatorFrequency = 364;
    this._oscillatorDetune = -100;
  }

  async play() {
    this.analyser1 = audioCtx.createAnalyser();
    this.analyser2 = audioCtx.createAnalyser();

    this.oscillator = audioCtx.createOscillator();
    this.oscillator.type = this._oscillatorType;
    this.oscillator.frequency.value = this._oscillatorFrequency;
    this.oscillator.detune.value = this._oscillatorDetune;

    await audioCtx.audioWorklet.addModule("/projects/noise-cancellation/noise-cancellation-processor.js");
    this.noiseReducer = new AudioWorkletNode(
      audioCtx,
      "noise-cancellation-processor"
    );
    const phaseParam = this.noiseReducer.parameters.get("phase");
    phaseParam.setValueAtTime(this._antiWavePhase, audioCtx.currentTime);

    if (this._outputWave) {
      this.oscillator.connect(this.analyser1);
      this.analyser1.connect(audioCtx.destination);
    }

    if (this._outputAntiWave) {
      this.oscillator.connect(this.noiseReducer);
      this.noiseReducer.connect(this.analyser2);
      this.analyser2.connect(audioCtx.destination);
    }

    this.oscillator.start(0);
    this.visualize();
  }

  stop() {
    this.oscillator.stop(0);
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

  set outputWave(value) {
    this._outputWave = value;
    if (this.isPlaying) {
      this.stop();
      this.play();
    }
  }

  set outputAntiWave(value) {
    this._outputAntiWave = value;
    if (this.isPlaying) {
      this.stop();
      this.play();
    }
  }

  set antiWavePhase(value) {
    //console.log("this._antiWavePhase", value);
    this._antiWavePhase = value;
    const phaseParam = this.noiseReducer.parameters.get("phase");
    phaseParam.setValueAtTime(this._antiWavePhase, audioCtx.currentTime);
  }

  visualize() {
    this.analyser1.fftSize = 2048;
    this.analyser2.fftSize = 2048;
    var bufferLength = this.analyser1.fftSize;
    var buffer1 = new Uint8Array(bufferLength);
    var buffer2 = new Uint8Array(bufferLength);

    clearBackground(this._canvas);

    this.draw = function() {
      this.drawHandler = requestAnimationFrame(this.draw);
      clearBackground(this._canvas);
      if (this._outputWave) {
        this.analyser1.getByteTimeDomainData(buffer1);
        drawLine(this._canvas, bufferLength, buffer1, false, "blue");
      }
      if (this._outputAntiWave) {
        this.analyser2.getByteTimeDomainData(buffer2);
        drawLine(this._canvas, bufferLength, buffer2, false, "red");
      }
    }.bind(this); // nice solution for requestAnimationFrame + this:  https://stackoverflow.com/a/32834390
    this.draw();
  }
}
