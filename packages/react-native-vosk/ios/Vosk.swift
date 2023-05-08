import Foundation
import AVFoundation

// The representation of the JSON object returned by Vosk
struct VoskResult: Codable {
    // Partial result
    var partial: String?
    // Complete result
    var text: String?
}

@objc(Vosk)
class Vosk: RCTEventEmitter {
    // Class properties
    /// The current vosk model loaded
    var currentModel: VoskModel?
    /// The vosk recognizer
    var recognizer : OpaquePointer?
    /// The audioEngine used to pipe microphone to recognizer
    let audioEngine = AVAudioEngine()
    /// The audioEngine input
    var inputNode: AVAudioInputNode!
    /// The microphone input format
    var formatInput: AVAudioFormat!
    /// A queue to process datas
    var processingQueue: DispatchQueue!
    /// Keep the last processed result here
    var lastRecognizedResult: VoskResult?
    /// The timeout timer ref
    var timeoutTimer: Timer?
    
    /// React member: has any JS event listener
    var hasListener: Bool = false
    
    // Class methods
    override init() {
        super.init()
        // Init the processing queue
        processingQueue = DispatchQueue(label: "recognizerQueue")
        // Create a new audio engine.
        inputNode = audioEngine.inputNode
        // Get the microphone default input format
        formatInput = inputNode.inputFormat(forBus: 0)
    }
    
    deinit {
        // free the recognizer
        vosk_recognizer_free(recognizer);
    }

    /// Called when React adds an event observer
    override func startObserving() {
        hasListener = true
    }

    /// Called when no more event observers are running
    override func stopObserving() {
        hasListener = false
    }
    
    /// React method to define allowed events
    @objc override func supportedEvents() -> [String]! {
        return ["onError","onResult","onFinalResult","onPartialResult","onTimeout"];
    }

    /// Load a Vosk model
    @objc(loadModel:withResolver:withRejecter:)
    func loadModel(name: String, resolve:RCTPromiseResolveBlock,reject:RCTPromiseRejectBlock) -> Void {
        if (currentModel != nil) {
            currentModel = nil; // deinit model
        }
        currentModel = VoskModel(name: name)
        resolve(name)
    }
    
    /// Start speech recognition
    @objc(start:)
    func start(grammar: [String]?) -> Void {
        let audioSession = AVAudioSession.sharedInstance()
        
        do {
            // Ask the user for permission to use the mic if required then start the engine.
            try audioSession.setCategory(.record)
            
            if (grammar != nil && grammar!.isEmpty == false) {
                let jsonGrammar = try! JSONEncoder().encode(grammar)
                recognizer = vosk_recognizer_new_grm(currentModel!.model, Float(formatInput.sampleRate), String(data: jsonGrammar, encoding: .utf8))
            } else {
                recognizer = vosk_recognizer_new_spk(currentModel!.model, Float(formatInput.sampleRate), currentModel!.spkModel)
            }
            
            let formatPcm = AVAudioFormat.init(commonFormat: AVAudioCommonFormat.pcmFormatInt16, sampleRate: formatInput.sampleRate, channels: 1, interleaved: true)
            
            inputNode.installTap(onBus: 0,
                                 bufferSize: UInt32(formatInput.sampleRate / 10),
                                 format: formatPcm) { buffer, time in
                    self.processingQueue.async {
                        let res = self.recognizeData(buffer: buffer)
                        DispatchQueue.main.async {
                            let parsedResult = try! JSONDecoder().decode(VoskResult.self, from: res.result!.data(using: .utf8)!)
                            self.lastRecognizedResult = parsedResult
                            if (res.completed && self.hasListener && res.result != nil) {
                                self.sendEvent(withName: "onResult", body: ["data": parsedResult.text!])
                                self.stopInternal(withoutEvents: true);
                            } else if (!res.completed && self.hasListener && res.result != nil) {
                                self.sendEvent(withName: "onPartialResult", body: ["data": parsedResult.partial!])
                            }
                        }
                    }
            }
            
            // Start the stream of audio data.
            audioEngine.prepare()
            
            audioSession.requestRecordPermission { [weak self] success in
                guard success, let self = self else { return }
                try? self.audioEngine.start()
            }
            
            // and manage timeout
            timeoutTimer = Timer.scheduledTimer(withTimeInterval: 10, repeats: false) {_ in
                self.sendEvent(withName: "onTimeout", body: ["data": ""])
                self.stopInternal(withoutEvents: true)
            }
        } catch {
            if (hasListener) {
                sendEvent(withName: "onError", body: ["data": "Unable to start AVAudioEngine " + error.localizedDescription])
            } else {
                debugPrint("Unable to start AVAudioEngine " + error.localizedDescription)
            }
            vosk_recognizer_free(recognizer);
        }
    }
    
    /// Unload speech recognition and model
    @objc(unload) func unload() -> Void {
        stopInternal(withoutEvents: false)
        if (currentModel != nil) {
            currentModel = nil; // deinit model
        }
    }
    
    /// Stop speech recognition if started
    @objc(stop) func stop() -> Void {
        // stop engines and send onFinalResult event
        stopInternal(withoutEvents: false)
    }
    
    /// Do internal cleanup on stop recognition
    func stopInternal(withoutEvents: Bool) {
        inputNode.removeTap(onBus: 0)
        if (audioEngine.isRunning) {
            audioEngine.stop()
            if (hasListener && !withoutEvents) {
                sendEvent(withName: "onFinalResult", body: ["data": lastRecognizedResult!.partial])
            }
            lastRecognizedResult = nil
        }
        if (recognizer != nil) {
            vosk_recognizer_free(recognizer);
            recognizer = nil
        }
        if (timeoutTimer != nil) {
            timeoutTimer?.invalidate()
            timeoutTimer = nil
        }
    }
    
    /// Process the audio buffer and do recognition with Vosk
    func recognizeData(buffer : AVAudioPCMBuffer) -> (result: String?, completed: Bool) {
            let dataLen = Int(buffer.frameLength * 2)
            let channels = UnsafeBufferPointer(start: buffer.int16ChannelData, count: 1)
            let endOfSpeech = channels[0].withMemoryRebound(to: Int8.self, capacity: dataLen) {
                vosk_recognizer_accept_waveform(recognizer, $0, Int32(dataLen))
            }
            let res = endOfSpeech == 1 ? vosk_recognizer_result(recognizer) : vosk_recognizer_partial_result(recognizer)
            return (String(validatingUTF8: res!), endOfSpeech == 1);
    }
}
