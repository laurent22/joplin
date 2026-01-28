#pragma once

#include <vector>
#include <jni.h>
#include "JniWrapper.h"

class IAudioRecorder {
public:
    IAudioRecorder() = default;
    virtual ~IAudioRecorder() = default;

    virtual void start() = 0;
    virtual void stop() = 0;
    virtual void waitForData(double seconds) = 0;
    virtual void pullAvailable(std::vector<float>& out) = 0;
};
