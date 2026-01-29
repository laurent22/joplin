#pragma once

#include <vector>
#include <jni.h>
#include <IAudioRecorder.hpp>
#include "JniWrapper.hpp"

// Wraps AudioRecorder.kt
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

    // Must be called with a global reference to AudioRecorderBuilder
    static void setRecorderBuilderClass(jclass globalClassReference);
    // Must be called with a global reference to AudioRecorder
    static void setRecorderClass(jclass globalClassReference);
    static void setRecorderBuilderStaticConstructor(jmethodID constructorMethodId);

private:
    JniWrapper jni_;
    jobject ref_;
};


