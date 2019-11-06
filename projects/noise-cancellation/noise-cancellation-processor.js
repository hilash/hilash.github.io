class NoiseCancellationProcessor extends AudioWorkletProcessor {

    process(inputs, outputs, parameters) {
      const input = inputs[0];
      const output = outputs[0];
    
      for (let channel = 0; channel < output.length; ++channel) {
        const map1 = input[channel].map(x => 3.0 * x);
        output[channel].set(map1);

        //for (let i = 0; i < input[channel].length; ++i)
        //  outputChannel[i] = -1.0 * input[channel][i];
      }
  
      return true;
    }
  }
  
  console.log('Registering processor');
  registerProcessor('noise-cancellation-processor', NoiseCancellationProcessor);