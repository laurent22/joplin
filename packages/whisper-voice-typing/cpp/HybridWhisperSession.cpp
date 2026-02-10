#include "HybridWhisperSession.hpp"
#include "androidUtil.h"
#include <NitroModules/ArrayBuffer.hpp>

using namespace margelo::nitro::whispervoicetyping;

struct HybridWhisperSession::State_ {
    State_(const SessionOptions& options)
        : session_(options.modelPath, options.locale, options.prompt, options.shortAudioContext)
    {};

    void addAudio(ArrayBuffer& data);

    std::mutex mutex_;
    WhisperSession session_;
};

void HybridWhisperSession::State_::addAudio(ArrayBuffer& data) {
    float* dataFloat = reinterpret_cast<float*>(data.data());
    size_t sizeFloats = data.size() / sizeof(float);

    if (dataFloat == nullptr) {
        throw std::logic_error("Attempting to add audio from a source that has already been deleted.");
    }

    LOGD("Add audio (size %zu)", sizeFloats);
    session_.addAudio(dataFloat, sizeFloats);
}

HybridWhisperSession::HybridWhisperSession(
    const SessionOptions& options
)
    : HybridObject(TAG),
    state_(std::make_shared<HybridWhisperSession::State_>(options))
{ }

void HybridWhisperSession::pushAudio(const std::shared_ptr<ArrayBuffer>& audio) {
    std::lock_guard<std::mutex> lock { state_->mutex_ };

    state_->addAudio(*audio);
}

std::shared_ptr<Promise<std::string>> HybridWhisperSession::convertNext() {
    return Promise<std::string>::async([state = state_] () -> std::string {
        std::lock_guard<std::mutex> lock { state->mutex_ };
        return state->session_.transcribeNextChunk();
    });
}
