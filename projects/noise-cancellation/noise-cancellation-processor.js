class NoiseCancellationProcessor extends AudioWorkletProcessor {

    static get parameterDescriptors () {
      return [{
        name: 'phase',
        defaultValue: 0,
        minValue: 0,
        maxValue: 180,
      },
      {
        name: 'amplitude',
        defaultValue: 100,
        minValue: 0,
        maxValue: 100,
      }]
    }

    process(inputs, outputs, parameters) {
      const input = inputs[0];
      const output = outputs[0];
      const amplitude = parameters['amplitude'][0];
      const phase = parameters['phase'][0];
      //console.log('phase in process', phase)
    
      for (let channel = 0; channel < output.length; ++channel) {
        //const map1 = input[channel].map(x => -1.0 * x);
        //output[channel].set(map1);
        // TODO: fit phase. 
        const _amplitude = amplitude / 100.0;
        const size = input[channel].length;
        for (let i = 0; i < size; ++i)
          output[channel][(i+phase) % size] = -1.0 * input[channel][i] * _amplitude;
      }
  
      return true;
    }
  }
  
  console.log('Registering processor');
  registerProcessor('noise-cancellation-processor', NoiseCancellationProcessor);