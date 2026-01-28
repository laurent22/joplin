#include "HybridWhisperSession.hpp"
#ifndef __APPLE__
#include "AudioRecorderJni.h"
#endif

using namespace margelo::nitro::whispervoicetyping;

struct HybridWhisperSession::State_ {
    State_(const SessionOptions& options)
        :
#ifndef __APPLE__
          recorder_(std::make_unique<AudioRecorderJni> ()),
#endif // ifdef __APPLE__
          session_(options.modelPath, options.locale, options.prompt, options.shortAudioContext)
    {};

    std::mutex mutex_;
    std::unique_ptr<IAudioRecorder> recorder_;
    WhisperSession session_;
};

HybridWhisperSession::HybridWhisperSession(
    const SessionOptions& options
)
    : HybridObject(TAG),
    state_(std::make_shared<HybridWhisperSession::State_>(options))
{ }

std::shared_ptr<Promise<void>> HybridWhisperSession::startRecording() {
    auto state = state_;
    return Promise<void>::async([state] () -> void {
        // Promise::async can run on a separate thread. Only allow one action to run at a time
        std::lock_guard<std::mutex> lock { state->mutex_ };

        state->recorder_->start();
    });
}

std::shared_ptr<Promise<std::string>> HybridWhisperSession::convertNext(double seconds) {
    auto state = state_;
    return Promise<std::string>::async([state, seconds] () -> std::string {
        std::lock_guard<std::mutex> lock { state->mutex_ };

        // Wait until at least 2s of data are available:
        state->recorder_->waitForData(seconds);
        // Convert the data:
        state->session_.addAudioFromRecorder(*state->recorder_);
        return state->session_.transcribeNextChunk();
    });
}

std::shared_ptr<Promise<std::string>> HybridWhisperSession::convertAvailable() {
    auto state = state_;
    return Promise<std::string>::async([state] () -> std::string {
        std::lock_guard<std::mutex> lock { state->mutex_ };

        // Convert the data:
        state->session_.addAudioFromRecorder(*state->recorder_);
        return state->session_.transcribeNextChunk();
    });
}

std::shared_ptr<Promise<void>> HybridWhisperSession::closeSession() {
    auto state = state_;
    return Promise<void>::async([state] {
        std::lock_guard<std::mutex> lock { state->mutex_ };

        state->recorder_->stop();
    });
}
