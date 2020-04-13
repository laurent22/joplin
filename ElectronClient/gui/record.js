const Recorder = ('recorder-js');

class record {
    constructor() {
        const audioContext =  new (window.AudioContext || window.webkitAudioContext)();
        
        const recorder = new Recorder(audioContext, {
            // An array of 255 Numbers
            // You can use this to visualize the audio stream
            // If you use react, check out react-wave-stream
            onAnalysed: data => console.log(data),
        });
        
        const isRecording = false;
        const blob = null;
        
        navigator.mediaDevices.getUserMedia({audio: true})
            .then(stream => recorder.init(stream))
            .catch(err => console.log('Uh oh... unable to get stream...', err));
    }
    
    startRecording() {
        recorder.start()
            .then(() => isRecording = true);
    }
    
    stopRecording() {
        recorder.stop()
            .then(({blob, buffer}) => {
            blob = blob;
    
            // buffer is an AudioBuffer
        });
    }
    
    download() {
        Recorder.download(blob, 'my-audio-file'); // downloads a .wav file
    }
}

module.exports = record;
