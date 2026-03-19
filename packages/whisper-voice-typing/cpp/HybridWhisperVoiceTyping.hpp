#pragma once
#include "HybridWhisperVoiceTypingSpec.hpp"

namespace margelo::nitro::whispervoicetyping {
    using SessionPointer = std::shared_ptr<HybridWhisperSessionSpec>;

    class HybridWhisperVoiceTyping : public HybridWhisperVoiceTypingSpec {
    public:
        HybridWhisperVoiceTyping(): HybridObject(TAG) {};

        SessionPointer openSession(const SessionOptions& options) override;

        // Runs tests
        std::shared_ptr<Promise<void>> test() override;
    };
}
