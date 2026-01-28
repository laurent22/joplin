#ifndef WHISPERVOICETYPING_EXAMPLE_AUDIORECORDERJNI_H
#define WHISPERVOICETYPING_EXAMPLE_AUDIORECORDERJNI_H

#include <vector>
#include <jni.h>
#include <IAudioRecorder.hpp>
#include "JniWrapper.h"

class AudioRecorderJni: public IAudioRecorder {
public:
    AudioRecorderJni();
    ~AudioRecorderJni();

    void start() override;
    void stop() override;
    // Waits until at least [bufferLengthSeconds] seconds of audio data are available
    void waitForData(double bufferLengthSeconds) override;
    // Pushes all available audio data to the given output vector
    void pullAvailable(std::vector<float>& out) override;

private:
    JniWrapper jni_;
    jobject ref_;
};


#endif //WHISPERVOICETYPING_EXAMPLE_AUDIORECORDERJNI_H
