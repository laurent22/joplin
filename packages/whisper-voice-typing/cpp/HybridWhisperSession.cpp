#include "HybridWhisperSession.hpp"
#include "androidUtil.h"
#include <NitroModules/ArrayBuffer.hpp>

using namespace margelo::nitro::whispervoicetyping;

struct HybridWhisperSession::State_ {
    State_(const std::shared_ptr<HybridAudioRecorderSpec>& recorder, const SessionOptions& options)
        : recorder_(recorder),
          session_(options.modelPath, options.locale, options.prompt, options.shortAudioContext)
    {};

    void addAudio(ArrayBuffer& data);

    std::mutex mutex_;
    std::shared_ptr<HybridAudioRecorderSpec> recorder_;
    WhisperSession session_;
};

void HybridWhisperSession::State_::addAudio(ArrayBuffer& data) {
    float* dataFloat = reinterpret_cast<float*>(data.data());
    size_t sizeFloats = data.size() / sizeof(float);

    session_.addAudio(dataFloat, sizeFloats);
}

HybridWhisperSession::HybridWhisperSession(
    const std::shared_ptr<HybridAudioRecorderSpec>& recorder,
    const SessionOptions& options
)
    : HybridObject(TAG),
    state_(std::make_shared<HybridWhisperSession::State_>(recorder, options))
{ }

std::shared_ptr<Promise<void>> HybridWhisperSession::startRecording() {
    auto state = state_;
    return Promise<void>::async([state] () -> void {
        // Promise::async can run on a separate thread. Only allow one action to run at a time
        std::lock_guard<std::mutex> lock { state->mutex_ };

        LOGD("Start recorder...");
        state->recorder_->start();
    });
}

std::shared_ptr<Promise<std::string>> HybridWhisperSession::convertNext(double seconds) {
    return Promise<std::string>::async([state = state_, seconds = seconds] () -> std::string {
        LOGD("Open session...");

        // Wait for the data to become available...
        auto dataFuture = state->recorder_->waitForData(seconds)->await();
        LOGD("Waiting for data...");
        dataFuture.get();
        LOGD("Got data.");

        // ...then lock the session and pull it!
        std::lock_guard<std::mutex> lock { state->mutex_ };
        LOGD("Pulling data...");
        auto data = state->recorder_->pullAvailable();
        LOGD("Pulled data...");
        state->addAudio(*data);

        // Convert the data:
        return state->session_.transcribeNextChunk();
    });
}

std::shared_ptr<Promise<std::string>> HybridWhisperSession::convertAvailable() {
    auto state = state_;
    return Promise<std::string>::async([state] () -> std::string {
        std::lock_guard<std::mutex> lock { state->mutex_ };

        auto data = state->recorder_->pullAvailable();
        state->addAudio(*data);

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
