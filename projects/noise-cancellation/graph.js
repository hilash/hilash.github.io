drawGraph = (canvas, canvasCtx, bufferLength, dataArray, flip=false) => {
    canvasCtx.fillStyle = "WhiteSmoke";
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
  
    canvasCtx.lineWidth = 2;
    canvasCtx.strokeStyle = "black";
    canvasCtx.beginPath();
  
    var sliceWidth = (canvas.width * 1.0) / bufferLength;
    var x = 0;
    for (var i = 0; i < bufferLength; i++) {
      var v = dataArray[i] / 128.0;
      var y = (v * canvas.height) / 2.0;
      if (flip) {
        y = canvas.height - y;
      }
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

export default drawGraph;